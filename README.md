# PropScout

Canadian real estate analysis platform. Paste a Realtor.ca URL and receive a full investment, personal buyer, tenant, or landlord report in under 30 seconds — deal score, rental comps, cash flow projections, and AI narrative included.

---

## Docs

| File                                                                 | Purpose                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`docs/propscout_platform_spec.md`](docs/propscout_platform_spec.md) | Single source of truth — architecture, features, formulas, AI prompts |
| [`CLAUDE.md`](CLAUDE.md)                                             | Coding standards, project structure, session rules for Claude Code    |
| [`docs/MVP_TODO.md`](docs/MVP_TODO.md)                               | MVP scope and progress — tick off as tasks complete                   |
| [`docs/TESTING.md`](docs/TESTING.md)                                 | Manual and automated test guide — update when features are added      |
| [`docs/SETUP.md`](docs/SETUP.md)                                     | Pre-development checklist — accounts, tooling, CI/CD, legal           |

---

## Architecture

```
propscout.ca  (Vercel — React + TypeScript)
    → propscoutapi-production.up.railway.app  (Fastify — Node.js)
        → propscout-production-e94c.up.railway.app  (FastAPI — Python)
        → Supabase  (Postgres + Auth + Storage)
```

| Layer         | Technology                                 | Hosting                  |
| ------------- | ------------------------------------------ | ------------------------ |
| Frontend      | React + TypeScript (Vite)                  | Vercel                   |
| Backend API   | Fastify (Node.js)                          | Railway                  |
| Calc engine   | Python FastAPI                             | Railway                  |
| Database      | Supabase (Postgres + Auth)                 | Supabase                 |
| Scraping      | Playwright                                 | Railway (scheduled jobs) |
| AI extraction | Claude Haiku (`claude-haiku-4-5-20251001`) | Anthropic                |
| AI narrative  | Claude Sonnet (`claude-sonnet-4-6`)        | Anthropic                |
| Maps          | Mapbox GL JS                               | Mapbox                   |
| Sun path      | pvlib (local — no API call)                | —                        |
| Payments      | Stripe                                     | Stripe                   |
| PDF export    | Puppeteer                                  | Railway                  |

---

## Project structure

```
propscout/
├── apps/
│   ├── web/               React + TypeScript frontend (Vercel)
│   └── api/               Fastify backend API (Railway)
├── services/
│   ├── calc-engine/       Python FastAPI calc engine (Railway)
│   └── scrapers/          Playwright scraping workers (Railway)
├── supabase/
│   └── migrations/        All schema changes as SQL — never edit DB directly
└── docs/
    ├── propscout_platform_spec.md    single source of truth
    ├── CLAUDE.md                     coding standards and session rules
    ├── MVP_TODO.md                   MVP build checklist
    ├── TESTING.md                    test plan for every feature
    ├── DESIGN_README.md              design system — tokens, typography, interactions
    ├── COMPONENT_MANIFEST.md         every design surface → React component + build order
    └── design_handoff_propscout_mvp/ pixel-final HTML prototypes + JSX source
```

---

## Prerequisites

- Node.js 20+
- Python 3.11
- A Supabase project (URL + anon key + service role key)
- API keys listed in `.env.example`

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/zainhussain2003/PropScout.git
cd PropScout

# 2. Root environment variables (backend + build tools)
cp .env.example .env
# Fill in all values — see docs/SETUP.md for account setup guide

# 3. Install all Node dependencies (monorepo — installs web + api together)
npm install

# 4. Install Python dependencies
cd services/calc-engine
pip install -r requirements.txt
cd ../..
```

### Frontend environment (local dev only)

Create `apps/web/.env.local` — gitignored, never committed:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_API_URL=http://localhost:3001
```

---

## Running locally

Open three terminals:

```bash
# Terminal 1 — React frontend (http://localhost:5173)
npm run dev:web

# Terminal 2 — Fastify API (http://localhost:3001)
npm run dev:api

# Terminal 3 — Python calc engine (http://localhost:8000)
cd services/calc-engine
uvicorn main:app --reload --port 8000
```

Health checks once running:

- Frontend: http://localhost:5173
- API: http://localhost:3001/health → `{"status":"ok"}`
- Calc engine: http://localhost:8000/health → `{"status":"ok"}`

### View the designs

```bash
npx serve docs/design_handoff_propscout_mvp/designs/
# Open http://localhost:3000
# Start with Investor Report.html and Tenant Report.html
```

---

## Running tests

```bash
# Type checks
npm run typecheck --workspace=apps/web
npm run typecheck --workspace=apps/api

# Frontend unit tests (Vitest)
npm test --workspace=apps/web

# API unit tests (Jest)
npm test --workspace=apps/api

# Python unit tests — all calculation and extraction tests
cd services/calc-engine
pytest . -v --ignore=tests/

# Calculation regression suite — must pass 100% before merging to master
pytest tests/test_regression.py -v

# Golden dataset extraction accuracy — must pass 95%+ before merging to master
pytest tests/golden_dataset/test_extraction.py -v
```

CI runs all of these automatically on every pull request. Nothing merges to `master` until every check passes.

---

## Branch workflow

No direct pushes to `master`. Every change goes through a branch and pull request.

```bash
git checkout -b feat/your-feature-name
# make changes, commit
git push origin feat/your-feature-name
# open a PR — CI must pass before merging
```

Branch naming follows commit type: `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`

---

## Deployments

| Environment              | Trigger           | URL                                      |
| ------------------------ | ----------------- | ---------------------------------------- |
| Frontend — production    | Merge to `master` | propscout.ca                             |
| API — production         | Merge to `master` | propscoutapi-production.up.railway.app   |
| Calc engine — production | Merge to `master` | propscout-production-e94c.up.railway.app |
| Frontend — preview       | Pull request      | Auto-generated Vercel URL                |

See [`docs/SETUP.md`](docs/SETUP.md) for the full deployment configuration.

---

## Development guide

Read [`CLAUDE.md`](CLAUDE.md) before writing any code. It covers file structure rules, the API service layer pattern, TypeScript strictness requirements, React component rules, Python structure rules, testing conventions, and git commit format.

Read [`docs/MVP_TODO.md`](docs/MVP_TODO.md) for the week-by-week build order and what to work on next.

---

## License

Proprietary — all rights reserved.
