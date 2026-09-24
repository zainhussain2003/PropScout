import type { FastifyRequest } from 'fastify'
import type { Analysis } from '../types/analysis'
import { resolveUser } from './requireUser'
import { getUserById } from '../services/supabaseService'

/** Remove paid prose at the API boundary, not with a CSS blur. */
export async function reportForViewer(req: FastifyRequest, analysis: Analysis): Promise<Analysis> {
  const auth = await resolveUser(req)
  const user = auth.ok ? await getUserById(auth.userId) : null
  if (user && ['pro', 'professional', 'team'].includes(user.tier)) return analysis
  const summary = analysis.narrative?.trim().split(/(?<=[.!?])\s+/)[0] ?? null
  return { ...analysis, narrative: summary }
}
