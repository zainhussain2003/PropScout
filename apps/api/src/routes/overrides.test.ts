/**
 * Functionality tests for /analysis/:token/overrides routes.
 *
 * Covers GET/POST/DELETE — supabaseService is mocked so no DB calls.
 *
 * The authorization cases are the point of this file. Writes used to need only
 * the share token, so anyone the owner sent a link to could dismiss or restore
 * risk flags on that analysis and move its stored deal score on the next
 * re-run. Every success case below now carries an owner session, and the
 * refusals are asserted with the service call NOT made — a 403 that still
 * wrote would be the same bug with a better status code.
 */

import Fastify, { type FastifyInstance, type InjectOptions } from 'fastify'
import overridesRoutes from './overrides'

jest.mock('../services/supabaseService')

import {
  getFlagOverrides,
  addFlagOverride,
  deleteFlagOverride,
  getAnalysisOwnerByToken,
  getSupabase,
} from '../services/supabaseService'

const mockGetFlagOverrides = jest.mocked(getFlagOverrides)
const mockAddFlagOverride = jest.mocked(addFlagOverride)
const mockDeleteFlagOverride = jest.mocked(deleteFlagOverride)
const mockGetOwner = jest.mocked(getAnalysisOwnerByToken)
const mockGetSupabase = jest.mocked(getSupabase)

const OWNER_ID = 'user-owner'
const OWNER_AUTH = { authorization: 'Bearer owner-jwt' }

/** Make auth.getUser resolve to `userId`, or reject the token when null. */
function signedInAs(userId: string | null): void {
  mockGetSupabase.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: userId == null ? null : { id: userId, email: 'u@example.com' } },
        error: userId == null ? { message: 'Invalid JWT' } : null,
      }),
    },
  } as unknown as ReturnType<typeof getSupabase>)
}

/** The analysis is owned by `userId` (null = created without a session). */
function ownedBy(userId: string | null): void {
  mockGetOwner.mockResolvedValue({ analysisId: 'analysis-1', userId })
}

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
    it('adds an override and returns ok for the owner', async () => {
      signedInAs(OWNER_ID)
      ownedBy(OWNER_ID)
      mockAddFlagOverride.mockResolvedValue(true)

      const res = await app.inject({
        method: 'POST',
        url: '/analysis/abc123/overrides',
        headers: OWNER_AUTH,
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
      signedInAs(OWNER_ID)
      mockGetOwner.mockResolvedValue(null)
      mockAddFlagOverride.mockResolvedValue(false)

      const res = await app.inject({
        method: 'POST',
        url: '/analysis/missing/overrides',
        headers: OWNER_AUTH,
        payload: { flagId: 'basement_suite' },
      })

      expect(res.statusCode).toBe(404)
      expect((res.json() as { code: string }).code).toBe('NOT_FOUND')
    })
  })

  // ── DELETE ───────────────────────────────────────────────────────────────────
  describe('DELETE /analysis/:token/overrides/:flagId', () => {
    it('deletes an override and returns ok for the owner', async () => {
      signedInAs(OWNER_ID)
      ownedBy(OWNER_ID)
      mockDeleteFlagOverride.mockResolvedValue(true)

      const res = await app.inject({
        method: 'DELETE',
        url: '/analysis/abc123/overrides/basement_suite',
        headers: OWNER_AUTH,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ ok: true })
      expect(mockDeleteFlagOverride).toHaveBeenCalledWith('abc123', 'basement_suite')
    })

    it('404 when analysis token does not exist', async () => {
      signedInAs(OWNER_ID)
      mockGetOwner.mockResolvedValue(null)
      mockDeleteFlagOverride.mockResolvedValue(false)

      const res = await app.inject({
        method: 'DELETE',
        url: '/analysis/missing/overrides/basement_suite',
        headers: OWNER_AUTH,
      })

      expect(res.statusCode).toBe(404)
    })
  })

  // ── Authorization ────────────────────────────────────────────────────────────
  //
  // These are the cases the route existed without. Each asserts the refusal
  // AND that no write happened: a 403 that still mutated would be the original
  // defect wearing a different status code.
  describe('write authorization', () => {
    const writes = [
      {
        name: 'POST',
        inject: (headers: Record<string, string>): InjectOptions => ({
          method: 'POST',
          url: '/analysis/abc123/overrides',
          headers,
          payload: { flagId: 'basement_suite' },
        }),
        mock: mockAddFlagOverride,
      },
      {
        name: 'DELETE',
        inject: (headers: Record<string, string>): InjectOptions => ({
          method: 'DELETE',
          url: '/analysis/abc123/overrides/basement_suite',
          headers,
        }),
        mock: mockDeleteFlagOverride,
      },
    ]

    for (const { name, inject, mock } of writes) {
      it(`${name} 401s with no session — a share token alone is not authorization`, async () => {
        ownedBy(OWNER_ID)
        const res = await app.inject(inject({}))

        expect(res.statusCode).toBe(401)
        expect((res.json() as { code: string }).code).toBe('UNAUTHORIZED')
        expect(mock).not.toHaveBeenCalled()
      })

      it(`${name} 401s with an invalid or expired session`, async () => {
        signedInAs(null)
        ownedBy(OWNER_ID)
        const res = await app.inject(inject({ authorization: 'Bearer stale-jwt' }))

        expect(res.statusCode).toBe(401)
        expect(mock).not.toHaveBeenCalled()
      })

      it(`${name} 403s for a signed-in NON-owner — the share-link recipient case`, async () => {
        // The vulnerability: someone the owner sent the link to, with their own
        // valid account, changing risk flags on the owner's analysis.
        signedInAs('user-recipient')
        ownedBy(OWNER_ID)
        const res = await app.inject(inject({ authorization: 'Bearer recipient-jwt' }))

        expect(res.statusCode).toBe(403)
        expect((res.json() as { code: string }).code).toBe('NOT_OWNER')
        expect(mock).not.toHaveBeenCalled()
      })

      it(`${name} 403s on an analysis with no owner`, async () => {
        // An analysis created without a session has no owner, so nobody can
        // prove they made it — the only credential is the token every viewer
        // holds. Refused rather than treated as unowned-and-writable.
        signedInAs('user-anyone')
        ownedBy(null)
        const res = await app.inject(inject({ authorization: 'Bearer anyone-jwt' }))

        expect(res.statusCode).toBe(403)
        expect(mock).not.toHaveBeenCalled()
      })

      it(`${name} does not reveal whether an unknown token exists`, async () => {
        // Authentication is checked before the lookup, so an unauthenticated
        // prober gets 401 for real and fake tokens alike.
        mockGetOwner.mockResolvedValue(null)
        const res = await app.inject(inject({}))

        expect(res.statusCode).toBe(401)
        expect(mockGetOwner).not.toHaveBeenCalled()
      })
    }
  })

  // ── Reads stay open ──────────────────────────────────────────────────────────
  it('GET needs no session — which flags were dismissed is part of the report', async () => {
    mockGetFlagOverrides.mockResolvedValue(['basement_suite'])

    const res = await app.inject({
      method: 'GET',
      url: '/analysis/abc123/overrides',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ overrides: ['basement_suite'] })
  })
})
