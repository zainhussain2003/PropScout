/**
 * Waitlist route — POST /waitlist
 *
 * Saves an email address + province to the `waitlist` table.
 * Called from the ProvinceGate screen when a user wants to be
 * notified when PropScout launches in their province.
 *
 * Uses upsert (email + province unique index) so double-submits are silent.
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import { addToWaitlist } from '../services/supabaseService'

interface WaitlistBody {
  email: string
  province: string
}

function isWaitlistBody(body: unknown): body is WaitlistBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return typeof b.email === 'string' && typeof b.province === 'string'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function waitlistRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', async (req, reply) => {
    if (!isWaitlistBody(req.body)) {
      return reply
        .code(400)
        .send(makeError('INVALID_REQUEST', '"email" and "province" are required.'))
    }

    const { email, province } = req.body

    if (!EMAIL_RE.test(email)) {
      return reply.code(400).send(makeError('INVALID_EMAIL', 'Please enter a valid email address.'))
    }

    if (province.trim().length === 0) {
      return reply.code(400).send(makeError('INVALID_PROVINCE', 'Province is required.'))
    }

    try {
      await addToWaitlist(email.trim().toLowerCase(), province.trim().toUpperCase())
    } catch (err) {
      fastify.log.error({ err }, 'addToWaitlist failed — swallowing to return 200')
    }

    return reply.code(200).send({ success: true })
  })
}

export default waitlistRoutes
