/**
 * Functionality tests for /analysis/:token/overrides routes.
 *
 * Covers GET/POST/DELETE — supabaseService is mocked so no DB calls.
 */

import Fastify, { type FastifyInstance } from 'fastify'
import overridesRoutes from './overrides'

jest.mock('../services/supabaseService')

import { getFlagOverrides, addFlagOverride, deleteFlagOverride } from '../services/supabaseService'

const mockGetFlagOverrides = jest.mocked(getFlagOverrides)
const mockAddFlagOverride = jest.mocked(addFlagOverride)
const mockDeleteFlagOverride = jest.mocked(deleteFlagOverride)

async function buildApp(): Promise<FastifyInstance> {
  const f = Fastify({ logger: false })
  await f.register(overridesRoutes, { prefix: '/analysis' })
  return f
}

describe('overrides routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── GET ──────────────────────────────────────────────────────────────────────
  describe('GET /analysis/:token/overrides', () => {
    it('returns the list of overrides', async () => {
      mockGetFlagOverrides.mockResolvedValue(['basement_suite', 'shared_laundry'])

      const res = await app.inject({ method: 'GET', url: '/analysis/abc123/overrides' })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ overrides: ['basement_suite', 'shared_laundry'] })
      expect(mockGetFlagOverrides).toHaveBeenCalledWith('abc123')
    })

    it('returns empty array when no overrides', async () => {
      mockGetFlagOverrides.mockResolvedValue([])

      const res = await app.inject({ method: 'GET', url: '/analysis/abc123/overrides' })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ overrides: [] })
    })
  })

  // ── POST ─────────────────────────────────────────────────────────────────────
  describe('POST /analysis/:token/overrides', () => {
    it('adds an override and returns ok', async () => {
      mockAddFlagOverride.mockResolvedValue(true)

      const res = await app.inject({
        method: 'POST',
        url: '/analysis/abc123/overrides',
        payload: { flagId: 'basement_suite' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ ok: true })
      expect(mockAddFlagOverride).toHaveBeenCalledWith('abc123', 'basement_suite')
    })

    it('400 when flagId is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/analysis/abc123/overrides',
        payload: {},
      })

      expect(res.statusCode).toBe(400)
      expect((res.json() as { code: string }).code).toBe('MISSING_FLAG_ID')
      expect(mockAddFlagOverride).not.toHaveBeenCalled()
    })

    it('404 when analysis token does not exist', async () => {
      mockAddFlagOverride.mockResolvedValue(false)

      const res = await app.inject({
        method: 'POST',
        url: '/analysis/missing/overrides',
        payload: { flagId: 'basement_suite' },
      })

      expect(res.statusCode).toBe(404)
      expect((res.json() as { code: string }).code).toBe('NOT_FOUND')
    })
  })

  // ── DELETE ───────────────────────────────────────────────────────────────────
  describe('DELETE /analysis/:token/overrides/:flagId', () => {
    it('deletes an override and returns ok', async () => {
      mockDeleteFlagOverride.mockResolvedValue(true)

      const res = await app.inject({
        method: 'DELETE',
        url: '/analysis/abc123/overrides/basement_suite',
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ ok: true })
      expect(mockDeleteFlagOverride).toHaveBeenCalledWith('abc123', 'basement_suite')
    })

    it('404 when analysis token does not exist', async () => {
      mockDeleteFlagOverride.mockResolvedValue(false)

      const res = await app.inject({
        method: 'DELETE',
        url: '/analysis/missing/overrides/basement_suite',
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
