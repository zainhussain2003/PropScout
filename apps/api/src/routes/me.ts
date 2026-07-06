/**
 * User profile route — GET /me
 *
 * Requires: Authorization: Bearer <supabase_jwt>
 * Returns: { id, email, tier, stripe_customer_id }
 *
 * Creates the user row on first call (upserts) so auth.users and public.users
 * stay in sync without a database trigger.
 */

import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import { makeError } from '../types/api'
import { getUserById, upsertUser } from '../services/supabaseService'
import { getSupabase } from '../services/supabaseService'

interface MeReply {
  id: string
  email: string
  tier: 'free' | 'pro' | 'professional' | 'team'
  stripeCustomerId: string | null
}

async function meRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send(makeError('UNAUTHORIZED', 'Authentication required'))
    }
    const token = authHeader.slice(7)

    const { data: authData, error: authError } = await getSupabase().auth.getUser(token)
    if (authError || !authData.user) {
      return reply.status(401).send(makeError('UNAUTHORIZED', 'Invalid or expired session'))
    }

    const { id, email } = authData.user
    await upsertUser(id, email ?? '')

    const user = await getUserById(id)
    if (!user) {
      return reply.status(500).send(makeError('USER_NOT_FOUND', 'Could not load user profile'))
    }

    const result: MeReply = {
      id: user.id,
      email: user.email,
      tier: user.tier,
      stripeCustomerId: user.stripe_customer_id,
    }
    return reply.send(result)
  })
}

export default meRoutes
