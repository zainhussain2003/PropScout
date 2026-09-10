import fs from 'node:fs'
import path from 'node:path'
import { run } from './process.mjs'

export function runGates(worktree, gates, logDirectory) {
  fs.mkdirSync(logDirectory, { recursive: true })
  const results = []

  for (const gate of gates) {
    const startedAt = new Date().toISOString()
    const safeName = gate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    try {
      const result = run(gate.command, gate.args, {
        cwd: path.join(worktree, gate.cwd ?? '.'),
        echo: false,
        timeout: gate.timeoutMs ?? 30 * 60 * 1000,
      })
      const log = `${result.stdout}${result.stderr}`
      fs.writeFileSync(path.join(logDirectory, `${safeName}.log`), log)
      results.push({ name: gate.name, status: 'passed', startedAt })
    } catch (error) {
      fs.writeFileSync(path.join(logDirectory, `${safeName}.log`), `${error.stack ?? error}\n`)
      results.push({ name: gate.name, status: 'failed', startedAt, error: error.message })
      return { passed: false, results }
    }
  }

  return { passed: true, results }
}
