jest.mock('../services/supabaseService')
jest.mock('./requireUser')
import { getUserById } from '../services/supabaseService'
import { resolveUser } from './requireUser'
import { reportForViewer } from './reportAccess'
import type { FastifyRequest } from 'fastify'
import type { Analysis } from '../types/analysis'

const report = {
  narrative: 'First sentence. Paid explanation.\n\nMore paid prose.',
  riskFlags: [],
} as unknown as Analysis
const req = {} as FastifyRequest
beforeEach(() => jest.resetAllMocks())
it('never sends paid paragraphs to an anonymous viewer', async () => {
  jest.mocked(resolveUser).mockResolvedValue({ ok: false, reason: 'missing' })
  expect((await reportForViewer(req, report)).narrative).toBe('First sentence.')
  expect(report.narrative).toContain('Paid explanation')
})
it.each(['free', 'pro'])('uses the server tier for %s', async (tier) => {
  jest.mocked(resolveUser).mockResolvedValue({ ok: true, userId: 'u', email: '' })
  jest.mocked(getUserById).mockResolvedValue({ tier } as Awaited<ReturnType<typeof getUserById>>)
  expect((await reportForViewer(req, report)).narrative).toBe(
    tier === 'free' ? 'First sentence.' : report.narrative
  )
})
