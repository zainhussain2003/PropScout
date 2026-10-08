export interface HpiChoice {
  market: string
  housing_type: string
  month: string
}
export interface HpiBenchmark extends HpiChoice {
  benchmark_price: number | null
  hpi_index: number | null
  change_1m: number | null
  change_6m: number | null
  change_1y: number | null
  change_3y: number | null
  change_5y: number | null
  imported_at: string
  synthetic: number
  change_basis?: string
  series_adjustment?: string
}
export interface HpiResponse {
  choices: HpiChoice[]
  benchmark: HpiBenchmark | null
  source_url: string
}

export function hpiOptions(
  choices: HpiChoice[],
  market: string,
  housingType: string
): {
  markets: string[]
  housingTypes: string[]
  months: string[]
} {
  return {
    markets: [...new Set(choices.map((choice) => choice.market))].sort(),
    housingTypes: [
      ...new Set(
        choices.filter((choice) => choice.market === market).map((choice) => choice.housing_type)
      ),
    ].sort(),
    months: [
      ...new Set(
        choices
          .filter((choice) => choice.market === market && choice.housing_type === housingType)
          .map((choice) => choice.month)
      ),
    ]
      .sort()
      .reverse(),
  }
}

export function devHpiEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_HPI_BENCHMARKS === 'true'
}

export async function readDevHpi(choice?: HpiChoice, signal?: AbortSignal): Promise<HpiResponse> {
  if (!devHpiEnabled()) throw new Error('Local benchmark feature is disabled')
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'
  const url = new URL('/dev/hpi/benchmarks', base)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Local benchmarks require a localhost API')
  }
  if (choice) {
    url.search = new URLSearchParams({
      market: choice.market,
      housingType: choice.housing_type,
      month: choice.month,
    }).toString()
  }
  const response = await fetch(url, { signal, cache: 'no-store' })
  if (!response.ok)
    throw new Error('Local benchmark database unavailable. Check the import and API flags.')
  return response.json() as Promise<HpiResponse>
}
