jest.mock('../services/supabaseService')
import { getSupabase, getAnalysisOwnerByToken } from '../services/supabaseService'
import { denyUnlessReportOwner } from './reportOwner'
import type { FastifyRequest } from 'fastify'

const request = (authorization?: string): FastifyRequest =>
  ({ headers: { authorization } }) as FastifyRequest
beforeEach(() => jest.resetAllMocks())

it('rejects anonymous writes without looking up the report', async () => {
  expect(await denyUnlessReportOwner(request(), 'shared-token')).toMatchObject({ status: 401 })
  expect(getAnalysisOwnerByToken).not.toHaveBeenCalled()
})

it.each([null, 'another-user'])('rejects a report owned by %s', async (userId) => {
  jest.mocked(getSupabase).mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }),
    },
  } as unknown as ReturnType<typeof getSupabase>)
  jest
    .mocked(getAnalysisOwnerByToken)
    .mockResolvedValue({ userId } as Awaited<ReturnType<typeof getAnalysisOwnerByToken>>)
  expect(await denyUnlessReportOwner(request('Bearer valid'), 'shared-token')).toMatchObject({
    status: 403,
  })
})

it('permits the verified owner', async () => {
  jest.mocked(getSupabase).mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }),
    },
  } as unknown as ReturnType<typeof getSupabase>)
  jest
    .mocked(getAnalysisOwnerByToken)
    .mockResolvedValue({ userId: 'owner' } as Awaited<ReturnType<typeof getAnalysisOwnerByToken>>)
  expect(await denyUnlessReportOwner(request('Bearer valid'), 'shared-token')).toBeNull()
})
