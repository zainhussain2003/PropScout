import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const TREE_RUNNER = path.join(here, 'tree-runner.mjs')
// Mirrored in tree-runner.mjs.
const TIMEOUT_EXIT_CODE = 124
const TIMEOUT_MARKER = '[agent-loop] process tree timed out'
// Headroom for the wrapper itself to start and to finish killing the tree.
const TREE_RUNNER_GRACE_MS = 15_000

/**
 * Environment variables a candidate's code may see while gates or bootstrap
 * run. Everything else in the coordinator's environment — API keys loaded
 * into the shell, `GH_TOKEN`, `GIT_*` credentials helpers, `NODE_OPTIONS` —
 * is withheld. Candidate-authored tests execute *outside* the builder's
 * sandbox, in the coordinator's own process tree; an allowlist is the least
 * the coordinator can do to keep its secrets out of that tree. It is not a
 * sandbox: the process still has the network and the filesystem.
 */
const ISOLATED_ENV_ALLOWLIST = [
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'SYSTEMDRIVE',
  'WINDIR',
  'COMSPEC',
  'TEMP',
  'TMP',
  'TMPDIR',
  'HOME',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'COMMONPROGRAMFILES',
  'USERNAME',
  'USER',
  'LOGNAME',
  'SHELL',
  'LANG',
  'LC_ALL',
  'TZ',
  'OS',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'PYTHONIOENCODING',
  'PYTHONUTF8',
]

export function isolatedEnvironment(source = process.env) {
  const wanted = new Set(ISOLATED_ENV_ALLOWLIST)
  const env = {}
  for (const [key, value] of Object.entries(source)) {
    if (wanted.has(key.toUpperCase())) env[key] = value
  }
  // Non-interactive: test runners must not watch, prompt or write snapshots.
  env.CI = '1'
  return env
}

/**
 * Resolve an npm-installed command on Windows to `node <script>` without a
 * shell.
 *
 * `spawnSync(..., { shell: false })` cannot execute the `.cmd` shims npm
 * writes for global installs (`codex.cmd`, `claude.cmd`), so on Windows the
 * coordinator would report every npm-installed CLI as missing. Rather than
 * fall back to `shell: true` — which reintroduces argument interpolation —
 * read the shim, find the `.js` entry it wraps, and run that with the current
 * Node binary.
 *
 * The shim is data from a PATH directory, so its contents are constrained
 * rather than trusted: the target must be the exact cmd-shim template, must
 * live under the shim directory's own `node_modules`, and its real path must
 * still be inside that directory after resolving `..` and links. Anyone who
 * can plant a `.cmd` ahead of npm's on PATH could replace the real shim
 * anyway; this stops the parser from being a *cheaper* path than that.
 *
 * Returns `{ executable, args }` or `null` when no shim is found. `searchPath`
 * defaults to `PATH`; tests pass an explicit directory.
 */
export function resolveShim(command, searchPath = (process.env.PATH ?? '').split(path.delimiter)) {
  if (path.extname(command) || command.includes('/') || command.includes('\\')) return null
  for (const directory of searchPath) {
    if (!directory) continue
    const shim = path.join(directory, `${command}.cmd`)
    if (!fs.existsSync(shim)) continue
    const text = fs.readFileSync(shim, 'utf8')
    // cmd-shim's final line: "%_prog%"  "%dp0%\node_modules\<pkg>\bin\<entry>.js" %*
    const match = text.match(
      /^[^\r\n]*"%_prog%"\s+"%dp0%\\(node_modules\\[^"]+\.[cm]?js)"\s+%\*\s*$/m
    )
    if (!match) return null
    const relative = match[1]
    if (relative.split(/[\\/]/).some((segment) => segment === '..' || segment === '')) return null
    const script = path.join(directory, relative)
    let real
    try {
      real = fs.realpathSync(script)
    } catch {
      return null
    }
    const root = fs.realpathSync(path.join(directory, 'node_modules'))
    if (!real.startsWith(root + path.sep)) return null
    return { executable: process.execPath, args: [real] }
  }
  return null
}

/**
 * Run a command as an argument array — never through a shell.
 *
 * On failure the thrown error carries `stdout`, `stderr`, `status` and
 * `timedOut`, so a caller writing a log has the command's own output rather
 * than only the exit code. Gate failures were previously logged without the
 * test runner's stdout, which is where vitest and pytest print the failure.
 *
 * Options:
 * - `timeout`: when set, the command runs under `tree-runner.mjs`, which kills
 *   the whole process tree on expiry, not only the direct child.
 * - `isolateEnv`: replace the inherited environment with the allowlist above.
 *   `env` entries are still applied on top.
 * - `searchPath`: PATH directories for `.cmd` shim resolution (tests).
 */
export function run(command, args, options = {}) {
  let executable = command
  let executableArgs = args
  if (process.platform === 'win32' && command === 'npm') {
    const npmCli = path.join(
      path.dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      'npm-cli.js'
    )
    if (!fs.existsSync(npmCli)) throw new Error(`npm CLI not found beside Node: ${npmCli}`)
    executable = process.execPath
    executableArgs = [npmCli, ...args]
  } else if (process.platform === 'win32' || options.searchPath) {
    const shim = resolveShim(command, options.searchPath)
    if (shim) {
      executable = shim.executable
      executableArgs = [...shim.args, ...args]
    }
  }

  let spawnExecutable = executable
  let spawnArgs = executableArgs
  let spawnTimeout = options.timeout
  const treeKill = options.timeout !== undefined && options.killTree !== false
  if (treeKill) {
    spawnExecutable = process.execPath
    spawnArgs = [TREE_RUNNER, String(options.timeout), executable, ...executableArgs]
    spawnTimeout = options.timeout + TREE_RUNNER_GRACE_MS
  }

  const base = options.isolateEnv ? isolatedEnvironment() : process.env
  const result = spawnSync(spawnExecutable, spawnArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: { ...base, ...options.env },
    input: options.input,
    timeout: spawnTimeout,
    shell: false,
    windowsHide: true,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
  })

  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  if (options.echo !== false) {
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
  }

  const timedOut =
    result.error?.code === 'ETIMEDOUT' ||
    result.signal === 'SIGTERM' ||
    (treeKill && result.status === TIMEOUT_EXIT_CODE && stderr.includes(TIMEOUT_MARKER))
  if (result.error || result.status !== 0) {
    // Always name the exit code; append stderr when there is any. A log
    // reader needs both — "exit 1" alone says nothing, and stderr alone hides
    // whether the process was killed.
    const detail = timedOut
      ? `timed out after ${options.timeout}ms`
      : result.error
        ? result.error.message
        : `exit ${result.status}${stderr.trim() ? `: ${stderr.trim()}` : ''}`
    const error = new Error(`${executable} ${executableArgs.join(' ')} failed: ${detail}`)
    error.stdout = stdout
    error.stderr = stderr
    error.status = result.status
    error.timedOut = timedOut
    throw error
  }

  return { stdout, stderr, status: result.status }
}

export function commandExists(command, versionArgs = ['--version']) {
  try {
    run(command, versionArgs, { echo: false, timeout: 15_000 })
    return true
  } catch {
    return false
  }
}
