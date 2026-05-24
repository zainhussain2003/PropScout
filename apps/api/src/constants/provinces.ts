// Ontario FSA prefixes — used for province detection from postal code
// MVP: Ontario only. K, L, M, N, P = Ontario.
export const ONTARIO_FSA_PREFIXES = ['K', 'L', 'M', 'N', 'P'] as const

export function isOntarioPostalCode(postalCode: string): boolean {
  const fsa = postalCode.trim().toUpperCase().charAt(0)
  return (ONTARIO_FSA_PREFIXES as readonly string[]).includes(fsa)
}

// Ontario Land Transfer Tax brackets
// Source: ontario.ca — updated May 2026
export const ONTARIO_LTT_BRACKETS = [
  { upTo: 55_000,    rate: 0.005 },
  { upTo: 250_000,   rate: 0.010 },
  { upTo: 400_000,   rate: 0.015 },
  { upTo: 2_000_000, rate: 0.020 },
  { upTo: Infinity,  rate: 0.025 },  // 2.5% on amounts above $2M
] as const

// Toronto Municipal Land Transfer Tax brackets (applies on top of provincial)
export const TORONTO_MLTT_BRACKETS = [
  { upTo: 55_000,    rate: 0.005 },
  { upTo: 400_000,   rate: 0.010 },
  { upTo: 2_000_000, rate: 0.020 },
  { upTo: Infinity,  rate: 0.025 },
] as const
