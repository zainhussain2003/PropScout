import assert from 'node:assert/strict'
import test from 'node:test'
import { assertSafeBuilderPaths, classifyPaths, isInside } from '../lib/policy.mjs'

const config = {
  protectedPaths: ['scripts/agent-loop/', 'AGENTS.md'],
  humanGatePaths: ['supabase/migrations/', '.env', '.env.'],
  forbiddenPathFragments: ['node_modules/'],
}

test('classifies protected and human-gated paths', () => {
  const result = classifyPaths(
    ['apps/web/src/App.tsx', 'scripts/agent-loop/cli.mjs', 'supabase/migrations/next.sql'],
    config,
  )
  assert.deepEqual(result.protectedPaths, ['scripts/agent-loop/cli.mjs'])
  assert.deepEqual(result.humanGatePaths, ['supabase/migrations/next.sql'])
})

test('rejects protected builder edits', () => {
  assert.throws(() => assertSafeBuilderPaths(['AGENTS.md'], config), /protected paths/)
})

test('validates worktree containment', () => {
  assert.equal(isInside('C:/dev/.propscout-agent-worktrees', 'C:/dev/.propscout-agent-worktrees/a/claude'), true)
  assert.equal(isInside('C:/dev/.propscout-agent-worktrees', 'C:/dev/PropScout'), false)
})

test('does not treat the safe env example as a real environment file', () => {
  const result = classifyPaths(['.env.example', '.env.local'], config)
  assert.deepEqual(result.humanGatePaths, ['.env.local'])
})
