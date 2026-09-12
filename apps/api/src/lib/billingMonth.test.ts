import { startOfCurrentMonth, startOfNextMonth } from './billingMonth'

describe('billingMonth', () => {
  it('starts the window at the first of the month, UTC', () => {
    expect(startOfCurrentMonth(new Date('2026-09-12T15:04:05Z')).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z'
    )
  })

  it('resets at the first of the next month', () => {
    expect(startOfNextMonth(new Date('2026-09-12T15:04:05Z')).toISOString()).toBe(
      '2026-10-01T00:00:00.000Z'
    )
  })

  it('rolls the year over in December', () => {
    expect(startOfNextMonth(new Date('2026-12-31T23:59:59Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z'
    )
  })

  it('does not slip into the previous month near midnight UTC', () => {
    // 2026-09-01T00:30Z is Aug 31 in Toronto. The window is UTC, so it is
    // September's — the same answer the count query gives.
    expect(startOfCurrentMonth(new Date('2026-09-01T00:30:00Z')).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z'
    )
  })
})
