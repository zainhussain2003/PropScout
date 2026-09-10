import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export function run(command, args, options = {}) {
  let executable = command
  let executableArgs = args
  if (process.platform === 'win32' && command === 'npm') {
    const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    if (!fs.existsSync(npmCli)) throw new Error(`npm CLI not found beside Node: ${npmCli}`)
    executable = process.execPath
    executableArgs = [npmCli, ...args]
  }
  const result = spawnSync(executable, executableArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    input: options.input,
    timeout: options.timeout,
    shell: false,
    windowsHide: true,
  })

  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  if (options.echo !== false) {
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
  }

  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? stderr.trim() ?? `exit ${result.status}`
    throw new Error(`${executable} ${executableArgs.join(' ')} failed: ${detail}`)
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
