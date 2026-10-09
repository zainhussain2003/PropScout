# One-release owner exception — October 8, 2026

The owner was asked to authorize an exception to the latest AGENTS.md for
committing, pushing, deploying and applying the two existing database migrations
for the free beta, with Claude review deferred and no spending. The owner replied:
**"yes for this case only"**.

This exception applies only to this free beta release. It does not alter the
repository's standing instructions or protected paths. No independent reviewer
acceptance is implied. The ordinary collaboration contract resumes after this
release.

Scope: publish the locally verified corrections and free deployment profile on
`codex/beta-public-ready`; build and verify one Render Free service without a
payment method; apply existing analyses status/guest migrations with preservation
checks; switch the frontend after hosted verification. Existing authorization
covers transferring only the Supabase service key and ScraperAPI key to Render.
Real CREA HPI values and files stay private and disabled for public deployment.

The baseline is `8c195d7b441a5e054e70f07af9f4261632a87ac5`. Local verification
recorded 2,576 passing tests and two skips, all four report pipelines and PDF
exports. Hosted build, memory, cold start and deployed behavior remain separate
release gates. Do not report public readiness until they pass.
