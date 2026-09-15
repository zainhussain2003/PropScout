/**
 * Request shape validation for the public routes (audit API-04).
 *
 * Fastify validates `params`/`body` against these JSON schemas before a
 * handler runs. The division of labour is deliberate:
 *
 *   schema  — shape and size: is it a string, how long, what pattern, is the
 *             number finite and in range, are there fields we never asked for
 *   handler — meaning: is the token known, is the mode one we serve, is the
 *             flag on this report
 *
 * So handlers keep their specific error codes (`INVALID_MODE`, `NOT_FOUND`,
 * `UNKNOWN_FLAG`), and the schemas stop the things a handler would otherwise
 * have to defend against one by one: a 2 MB "token", a URL that is an object,
 * a bearing of `NaN`, an unexpected property carried through to a service.
 *
 * Validation failures are turned into the API's one error shape (§8 of
 * CLAUDE.md) by `applyValidationErrorHandler`, so a client sees
 * `{ error, code: 'INVALID_REQUEST', message }` rather than Fastify's default.
 */

import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { makeError } from '../types/api'

// ── Fragments ─────────────────────────────────────────────────────────────────

/** Share tokens are UUIDs; the analyzing page also uses the literal "demo". */
export const SHARE_TOKEN = {
  type: 'string',
  minLength: 1,
  maxLength: 64,
  pattern: '^[A-Za-z0-9-]+$',
} as const

/** Flag IDs are snake_case identifiers from the engine's registry. */
export const FLAG_ID = {
  type: 'string',
  minLength: 1,
  maxLength: 64,
  pattern: '^[a-z0-9_]+$',
} as const

const SHORT_STRING = { type: 'string', maxLength: 64 } as const
const ADDRESS_STRING = { type: 'string', maxLength: 300 } as const
const URL_STRING = { type: 'string', maxLength: 2048 } as const
const MONEY = { type: ['number', 'null'], minimum: 0, maximum: 1_000_000_000 } as const
const SMALL_COUNT = { type: ['number', 'null'], minimum: 0, maximum: 1_000 } as const

// ── Per-route schemas ─────────────────────────────────────────────────────────

export const tokenParams = {
  type: 'object',
  properties: { token: SHARE_TOKEN },
  required: ['token'],
} as const

export const tokenFlagParams = {
  type: 'object',
  properties: { token: SHARE_TOKEN, flagId: FLAG_ID },
  required: ['token', 'flagId'],
} as const

export const analysisTriggerBody = {
  type: 'object',
  properties: { token: SHARE_TOKEN, mode: SHORT_STRING },
  additionalProperties: false,
} as const

export const scrapeBody = {
  type: 'object',
  properties: { url: URL_STRING },
  required: ['url'],
  additionalProperties: false,
} as const

export const addressLookupBody = {
  type: 'object',
  properties: { address: ADDRESS_STRING },
  additionalProperties: false,
} as const

export const addressStartBody = {
  type: 'object',
  properties: {
    address: ADDRESS_STRING,
    postalCode: { type: 'string', maxLength: 10 },
    city: { type: 'string', maxLength: 100 },
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lng: { type: 'number', minimum: -180, maximum: 180 },
    listingType: { type: 'string', enum: ['for-sale', 'for-rent'] },
    price: MONEY,
    rentMonthly: MONEY,
    beds: SMALL_COUNT,
    baths: SMALL_COUNT,
    sqft: { type: ['number', 'null'], minimum: 0, maximum: 1_000_000 },
    propertyType: {
      type: ['string', 'null'],
      enum: ['condo', 'townhouse', 'semi-detached', 'detached', 'multiplex', 'commercial', null],
    },
    condoFeeMonthly: MONEY,
    annualTaxes: MONEY,
  },
  additionalProperties: false,
} as const

export const overridePostBody = {
  type: 'object',
  properties: { flagId: FLAG_ID },
  additionalProperties: false,
} as const

export const sunscoutBody = {
  type: 'object',
  properties: { facadeBearing: { type: 'number', minimum: 0, maximum: 360 } },
  additionalProperties: false,
} as const

/** POST /analysis/:token/value — a landlord's own value (D-107); bounds in OWNER_VALUE. */
export const ownerValueBody = {
  type: 'object',
  properties: { value: { type: 'number' } },
  required: ['value'],
  additionalProperties: false,
} as const

export const waitlistBody = {
  type: 'object',
  properties: {
    email: { type: 'string', maxLength: 254 },
    province: { type: 'string', maxLength: 32 },
  },
  additionalProperties: false,
} as const

export const billingCheckoutBody = {
  type: 'object',
  properties: { tier: SHORT_STRING },
  additionalProperties: false,
} as const

// ── Error shape ───────────────────────────────────────────────────────────────

/**
 * Turn a schema failure into the API's error envelope. Registered inside each
 * route plugin (Fastify scopes error handlers per plugin), so the route tests
 * exercise the same shape production returns.
 */
export function applyValidationErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(
    (err: FastifyError, _req: FastifyRequest, reply: FastifyReply): FastifyReply => {
      if (err.validation != null) {
        const detail = err.validation
          .map((v) => `${v.instancePath.replace(/^\//, '') || 'body'} ${v.message ?? 'is invalid'}`)
          .join('; ')
        return reply.code(400).send(makeError('INVALID_REQUEST', `Invalid request: ${detail}.`))
      }
      if (err.statusCode === 413) {
        return reply
          .code(413)
          .send(makeError('REQUEST_TOO_LARGE', 'That request is larger than this API accepts.'))
      }
      fastify.log.error({ err }, 'Unhandled route error')
      return reply
        .code(err.statusCode ?? 500)
        .send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
    }
  )
}
