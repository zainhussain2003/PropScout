/**
 * Functionality tests for GET /analysis/:token/pdf — Pro-gated PDF export.
 *
 * Puppeteer + Supabase are mocked: these tests assert the gate, the error
 * states, and the response shape — not Chrome's rendering.
 */

jest.mock('../services/supabaseService', () => ({
  getSupabase: jest.fn(),
  getUserById: jest.fn(),
  upsertUser: jest.fn().mockResolvedValue(undefined),
  getAnalysisByToken: jest.fn(),
}))

jest.mock('../services/pdfService', () => ({
  generateReportPdf: jest.fn(),
}))

import Fastify, { type FastifyInstance } from 'fastify'
import pdfRoutes from './pdf'
import { getSupabase, getUserById, getAnalysisByToken } from '../services/supabaseService'
import { generateReportPdf } from '../services/pdfService'
import type { ApiError } from '../types/api'

const mockGetSupabase = getSupabase as jest.Mock
const mockGetUserById = getUserById as jest.Mock
const mockGetAnalysisByToken = getAnalysisByToken as jest.Mock
const mockGeneratePdf = generateReportPdf as jest.Mock

function makeAuthMock(valid: boolean, userId = 'user-abc'): object {
  const user = valid ? { id: userId, email: 'test@example.com' } : null
  const error = valid ? null : { message: 'Invalid JWT' }
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error }),
    },
  }
}

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  mockGetAnalysisByToken.mockResolvedValue({ analysis: { token: 't-1' }, listing: {} })
  mockGeneratePdf.mockResolvedValue(Buffer.from('%PDF-1.7 fake'))
  app = Fastify({ logger: false })
  await app.register(pdfRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

describe('GET /:token/pdf', () => {
  it('401s without an Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/t-1/pdf' })
    expect(res.statusCode).toBe(401)
  })

  it('403s UPGRADE_REQUIRED for free-tier users (PDF is Investor Pro+)', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({ id: 'user-abc', email: 'x@y.z', tier: 'free' })

    const res = await app.inject({
      method: 'GET',
      url: '/t-1/pdf',
      headers: { authorization: 'Bearer good-jwt' },
    })

    expect(res.statusCode).toBe(403)
    expect((res.json() as ApiError).code).toBe('UPGRADE_REQUIRED')
    expect(mockGeneratePdf).not.toHaveBeenCalled()
  })

  it('returns the PDF for a pro user with the right headers', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({ id: 'user-abc', email: 'x@y.z', tier: 'pro' })

    const res = await app.inject({
      method: 'GET',
      url: '/t-1/pdf',
      headers: { authorization: 'Bearer good-jwt' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(String(res.headers['content-disposition'])).toContain('propscout-report-t-1.pdf')
    expect(res.rawPayload.subarray(0, 4).toString()).toBe('%PDF')
    expect(mockGeneratePdf).toHaveBeenCalledWith('t-1')
  })

  it('404s for an unknown analysis token before rendering anything', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({ id: 'user-abc', email: 'x@y.z', tier: 'professional' })
    mockGetAnalysisByToken.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/nope/pdf',
      headers: { authorization: 'Bearer good-jwt' },
    })

    expect(res.statusCode).toBe(404)
    expect(mockGeneratePdf).not.toHaveBeenCalled()
  })

  it('502s PDF_FAILED when rendering fails — never a hung request', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({ id: 'user-abc', email: 'x@y.z', tier: 'pro' })
    mockGeneratePdf.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/t-1/pdf',
      headers: { authorization: 'Bearer good-jwt' },
    })

    expect(res.statusCode).toBe(502)
    expect((res.json() as ApiError).code).toBe('PDF_FAILED')
  })
})
