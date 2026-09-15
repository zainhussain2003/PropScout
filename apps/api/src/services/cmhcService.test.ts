import { getVacancyRateByCity, hasVacancyRateForCity, getVacancySurvey } from './cmhcService'
import { CMHC_VACANCY_RATES_BY_CITY, DEFAULT_VACANCY_RATE } from '../constants/cmhcVacancy'

describe('cmhcService (October 2025 survey, D-106)', () => {
  it('returns the published CMA total for a matched municipality, case-insensitively', () => {
    expect(getVacancyRateByCity('Toronto')).toBe(0.03)
    expect(getVacancyRateByCity('  hamilton ')).toBe(0.036)
    expect(getVacancyRateByCity('LONDON')).toBe(0.04)
    expect(hasVacancyRateForCity('Kitchener')).toBe(true)
  })

  it('maps a GTA municipality to the Toronto CMA figure', () => {
    for (const city of ['Vaughan', 'Mississauga', 'Brampton', 'Markham', 'Richmond Hill', 'Ajax']) {
      expect(getVacancyRateByCity(city)).toBe(0.03)
    }
    expect(getVacancyRateByCity('Burlington')).toBe(0.036) // Hamilton CMA zone 8
    expect(getVacancyRateByCity('Whitby')).toBe(0.037) // Oshawa CMA
  })

  it('strips a scraped neighbourhood suffix before looking up', () => {
    expect(getVacancyRateByCity('Toronto (Yonge-Eglinton)')).toBe(0.03)
    expect(hasVacancyRateForCity('Toronto (Yonge-Eglinton)')).toBe(true)
  })

  it('falls back to the published Ontario aggregate for an unknown or missing city', () => {
    expect(getVacancyRateByCity('Atlantis')).toBe(DEFAULT_VACANCY_RATE)
    expect(getVacancyRateByCity(null)).toBe(DEFAULT_VACANCY_RATE)
    expect(getVacancyRateByCity('')).toBe(DEFAULT_VACANCY_RATE)
    expect(hasVacancyRateForCity('Atlantis')).toBe(false)
    expect(DEFAULT_VACANCY_RATE).toBe(0.032)
  })

  it('every table figure is a plausible published vacancy rate', () => {
    for (const [city, rate] of Object.entries(CMHC_VACANCY_RATES_BY_CITY)) {
      expect(rate).toBeGreaterThan(0)
      expect(rate).toBeLessThan(0.15)
      expect(city).toBe(city.toLowerCase().trim())
    }
  })

  it('names the survey the figures come from', () => {
    expect(getVacancySurvey()).toEqual({
      survey: 'October 2025',
      published: '2025-12-11',
      table: 'Rental Market Report data tables, Ontario, Table 1.1.1',
    })
  })
})
