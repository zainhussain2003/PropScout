import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

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
    // cmd-shim template: "%_prog%"  "%dp0%\node_modules\<pkg>\bin\<entry>.js" %*
    const match = text.match(/"%dp0%\\([^"]+\.[cm]?js)"\s+%\*/)
    if (!match) return null
    const script = path.join(directory, match[1])
    if (!fs.existsSync(script)) return null
    return { executable: process.execPath, args: [script] }
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
  const result = spawnSync(executable, executableArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    input: options.input,
    timeout: options.timeout,
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

  const timedOut = result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM'
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
