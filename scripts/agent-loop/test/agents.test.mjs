import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { extractClaudeStructuredOutput, schemaForClaude } from '../lib/agents.mjs'
import { validateAgainstSchema } from '../lib/schema.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const reviewSchemaFile = path.join(
  here,
  '..',
  '..',
  '..',
  'docs',
  'agent-loop',
  'schemas',
  'review.schema.json'
)

test('the schema handed to claude --json-schema carries no $schema declaration', () => {
  // The first real reviewer turn failed before the model ran: claude's
  // validator rejects the 2020-12 URI the file declares.
  const schema = JSON.parse(schemaForClaude(reviewSchemaFile))
  assert.equal(schema.$schema, undefined)
  assert.deepEqual(schema.required, ['verdict', 'summary', 'next_instruction', 'findings'])
  // Still validates a review the same way the coordinator does.
  const review = { verdict: 'accepted', summary: 'ok', next_instruction: '', findings: [] }
  assert.deepEqual(validateAgainstSchema(review, schema), [])
})

test('claude structured output is read from the json envelope', () => {
  const review = { verdict: 'accepted', summary: 'ok', next_instruction: '', findings: [] }
  assert.deepEqual(
    extractClaudeStructuredOutput(JSON.stringify({ type: 'result', structured_output: review })),
    review
  )
  assert.deepEqual(
    extractClaudeStructuredOutput(
      JSON.stringify({ type: 'result', result: JSON.stringify(review) })
    ),
    review
  )
})

test('an is_error envelope fails with the CLI message, not a JSON parse error', () => {
  const envelope = JSON.stringify({
    type: 'result',
    is_error: true,
    result: 'Not logged in · Please run /login',
  })
  assert.throws(
    () => extractClaudeStructuredOutput(envelope),
    /claude reviewer failed: Not logged in/
  )
})
