import { execFile } from 'child_process'
import { resolve } from 'path'
import { promisify } from 'util'

const execute = promisify(execFile)

export function devHpiEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_HPI_BENCHMARKS === 'true'
}

export async function readDevHpi(filters: {
  market?: string
  housingType?: string
  month?: string
}): Promise<unknown> {
  if (!devHpiEnabled() || !process.env.DEV_HPI_DATABASE || !process.env.DEV_HPI_PYTHON) {
    throw new Error('Local HPI is not configured')
  }
  const args = [
    resolve(__dirname, '../../../../scripts/dev-hpi/hpi_store.py'),
    'query',
    '--database',
    process.env.DEV_HPI_DATABASE,
  ]
  if (filters.market) args.push('--market', filters.market)
  if (filters.housingType) args.push('--housing-type', filters.housingType)
  if (filters.month) args.push('--month', filters.month)
  const { stdout } = await execute(process.env.DEV_HPI_PYTHON, args, {
    timeout: 10_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  })
  return JSON.parse(stdout) as unknown
}
