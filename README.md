# PropScout

Canadian real estate analysis platform. Paste a Realtor.ca or Zillow.ca URL and receive a full investment, personal buyer, tenant, or landlord report in under 30 seconds.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend API | Fastify (Node.js) |
| Database | Supabase (Postgres + Auth + Storage) |
| Scraping | Playwright on Railway |
| Calc engine | Python FastAPI on Railway |
| AI extraction | Claude Haiku |
| AI narrative | Claude Sonnet |
| Maps | Mapbox GL JS |
| Sun path | pvlib |
| Payments | Stripe |
| PDF | Puppeteer |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

## Project structure

```
propscout/
├── apps/web/          React + TypeScript frontend (Vercel)
├── apps/api/          Fastify backend API (Railway)
├── services/calc-engine/  Python FastAPI calc engine (Railway)
├── services/scrapers/     Playwright scraping workers (Railway)
├── supabase/migrations/   Database schema migrations
└── docs/              All project documentation
    ├── propscout_platform_spec.md  — single source of truth
    ├── CLAUDE.md                   — coding standards and session rules
    ├── MVP_TODO.md                 — week-by-week build checklist
    ├── TESTING.md                  — test plan for every feature
    └── design_handoff_propscout_mvp/  — pixel-final HTML prototypes + JSX source
```

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Supabase project
- Accounts for: Anthropic, Stripe, Mapbox, Walk Score, Google Places

### 1. Clone and install

```bash
git clone https://github.com/your-org/propscout.git
cd propscout
npm install          # installs all workspaces (apps/web + apps/api)
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in your real values — see SETUP.md for account setup guide
```

### 3. Run locally

```bash
# Frontend (http://localhost:5173)
npm run dev --workspace=apps/web

# Backend API (http://localhost:3001)
npm run dev --workspace=apps/api

# Calc engine (http://localhost:8000)
cd services/calc-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. View the designs

```bash
npx serve docs/design_handoff_propscout_mvp/designs/
# Open http://localhost:3000 and navigate to index.html
```

## Development

Read [`docs/CLAUDE.md`](docs/CLAUDE.md) before writing any code. It covers:
- File and folder structure rules
- API service layer pattern
- TypeScript strictness requirements
- React component rules
- Python structure rules
- Testing conventions (unit, functionality, sanity, regression)
- Git commit conventions

Read [`docs/MVP_TODO.md`](docs/MVP_TODO.md) for the week-by-week build order.

## Tests

```bash
# Python calc engine tests
pytest services/calc-engine/ -v

# Golden dataset regression (must pass 95%+)
pytest services/calc-engine/tests/golden_dataset/test_extraction.py -v

# Calculation regression (must pass 100%)
pytest services/calc-engine/tests/test_regression.py -v

# TypeScript tests
npm test --workspace=apps/web
npm test --workspace=apps/api

# Type check
npm run typecheck --workspace=apps/web
npm run typecheck --workspace=apps/api
```

## Deployment

- **Frontend**: Vercel — auto-deploys from `main` branch
- **Backend API + Calc engine + Scrapers**: Railway
- **Database**: Supabase

See [`docs/SETUP.md`](docs/SETUP.md) for full deployment checklist.

## License

Proprietary — all rights reserved.
