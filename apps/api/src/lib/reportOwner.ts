import type { FastifyRequest } from 'fastify'
import { resolveUser } from './requireUser'
import { getAnalysisOwnerByToken } from '../services/supabaseService'

/** A shared viewing token never authorizes mutations (D-065). */
export async function denyUnlessReportOwner(
  req: FastifyRequest,
  token: string
): Promise<{
  status: number
  code: string
  message: string
} | null> {
  const auth = await resolveUser(req)
  if (!auth.ok) {
    return { status: 401, code: 'UNAUTHORIZED', message: 'Sign in to edit your report.' }
  }
  const owner = await getAnalysisOwnerByToken(token)
  if (!owner) return { status: 404, code: 'NOT_FOUND', message: 'Report not found.' }
  if (!owner.userId || owner.userId !== auth.userId) {
    return { status: 403, code: 'NOT_OWNER', message: 'Only the report owner can edit it.' }
  }
  return null
}
