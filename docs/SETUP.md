# PropScout — Pre-Development Setup Checklist

Last updated: May 2026
Complete everything in this file before writing the first line of application code.
Items are ordered by priority — top to bottom is the sequence to follow.

---

## 1. Domain and DNS

- [ ] Confirm propscout.ca is registered and showing in GoDaddy account
- [ ] Add Vercel A record to GoDaddy DNS: Type `A`, Name `@`, Value `13.248.243.5`, TTL `3600`
- [ ] Add Vercel CNAME to GoDaddy DNS: Type `CNAME`, Name `www`, Value `propscout.ca`, TTL `3600`
- [ ] Verify propagation at dnschecker.org — search propscout.ca, type A, wait for green checkmarks
- [ ] Add transactional email DNS records in GoDaddy (SPF and DKIM — provided by Resend after account setup)

Note: The Vercel DNS records can't be added until a Vercel project exists. Add them in Step 5 once Vercel is set up. Do the Resend DNS records at the same time so both are done in one GoDaddy session.

---

## 2. Social handles — register today before someone else takes them

- [ ] X (Twitter): @propscoutca
- [ ] Instagram: @propscoutca
- [ ] LinkedIn: PropScout company page
- [ ] TikTok: @propscout (tenant report virality strategy depends on this)

Register all four now even if you don't post immediately. Losing a handle after the product launches means rebranding or using an inferior handle permanently.

---

## 3. External accounts — create before coding starts

All of these are free to create. You only pay when you use them.

### Required at MVP
- [ ] Supabase — supabase.com — create a new project, save the project URL and anon key
- [ ] Railway — railway.app — create account, connect GitHub
- [ ] Vercel — vercel.com — create account, connect GitHub
- [ ] Anthropic — console.anthropic.com — confirm API access, generate an API key
- [ ] Mapbox — mapbox.com — create account, generate a public token
- [ ] Walk Score — walkscore.com/professional/api.php — request an API key (approval takes 1–2 days)
- [ ] Google Cloud — console.cloud.google.com — create a project, enable Places API, generate a key
- [ ] Resend — resend.com — create account, add propscout.ca as a sending domain, get DNS records

### Required before launch (not day one)
- [ ] Stripe — stripe.com — create account, stay in test mode until ready to charge

### Phase 2 (do not set up yet)
- [ ] AirDNA — airdna.co — STR revenue data (Phase 2)

Save all API keys in a password manager immediately. Do not put them anywhere else until they go into `.env`.

---

## 4. GitHub repository

- [ ] Create a new private repository on GitHub — name: `propscout`
- [ ] Clone it locally
- [ ] Create the folder structure from `CLAUDE.md` before writing any code
- [ ] Create `.gitignore` — must include at minimum:

```
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/
venv/

# Build output
dist/
build/
.next/

# IDE
.DS_Store
.vscode/
.idea/

# Railway / Vercel
.vercel/
```

- [ ] Create `.env.example` with all required variable names and placeholder values (see Step 7)
- [ ] Create `README.md` (see Step 6)
- [ ] Make the initial commit with just the folder structure, `.gitignore`, `.env.example`, and `README.md` — no application code yet
- [ ] Set branch protection on `main`:
  - Require pull request before merging
  - Require at least one CI check to pass before merge
  - No direct pushes to main — ever

---

## 5. Vercel project setup

- [ ] Go to vercel.com → Add New Project → Import from GitHub → select `propscout`
- [ ] Set root directory to `apps/web`
- [ ] Add environment variables in Vercel dashboard (same values as `.env`)
- [ ] Deploy — Vercel generates a `.vercel.app` URL for testing before the custom domain is connected
- [ ] In Vercel project → Settings → Domains → add `propscout.ca`
- [ ] Vercel provides the A record and CNAME — add these to GoDaddy DNS (Step 1)
- [ ] Confirm `propscout.ca` loads the Vercel deployment

---

## 6. README.md

Write this before writing any application code. Any developer (or future you) opening the repo needs to be able to set it up and run it without asking questions.

The README must cover:

```markdown
# PropScout

One sentence: what PropScout is.

## Docs
Link to propscout_platform_spec.md, CLAUDE.md, MVP_TODO.md

## Prerequisites
- Node.js 20+
- Python 3.11+
- A Supabase project
- API keys listed in .env.example

## Setup
1. Clone the repo
2. Copy .env.example to .env and fill in all values
3. Install frontend dependencies: cd apps/web && npm install
4. Install backend dependencies: cd apps/api && npm install
5. Install Python dependencies: cd services/calc-engine && pip install -r requirements.txt
6. Run database migrations: npx supabase db push
7. Start all services: (commands here)

## Running tests
- Python unit tests: pytest services/calc-engine/ -v
- Frontend tests: npm test --workspace=apps/web
- Golden dataset: pytest services/calc-engine/tests/golden_dataset/ -v
- Calculation regression: pytest services/calc-engine/tests/test_regression.py -v

## Architecture
Brief summary with link to CLAUDE.md for full detail.
```

---

## 7. Environment variables

Create `.env` in the project root with these variables filled in from Step 3.
This file is never committed. `.env.example` is committed with placeholder values.

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Mapbox
MAPBOX_TOKEN=

# Walk Score
WALKSCORE_API_KEY=

# Google Places
GOOGLE_PLACES_KEY=

# Resend (transactional email)
RESEND_API_KEY=

# Stripe (leave blank until payments are activated)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

Verify every key works by making one test call from each service before starting development.
A broken API key discovered mid-build wastes hours.

---

## 8. Design system setup — do this before building any component

The design handoff lives in `docs/design_handoff_propscout_mvp/`. Set it up before writing a single component.

- [ ] Open the HTML files in a browser to explore the designs: `npx serve docs/design_handoff_propscout_mvp/designs/`
- [ ] Spend 10 minutes in `Investor Report.html` and `Tenant Report.html` — toggle the theme, drag the financing sliders, click locked sections
- [ ] Copy `tokens.css` into `apps/web/src/styles/tokens.css`
- [ ] Import it at the top of your global stylesheet: `@import './tokens.css';`
- [ ] Add Google Fonts to `apps/web/index.html` — all three fonts must be loaded:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

- [ ] Read `DESIGN_README.md` — covers the full token system, typography rules, interaction timing, and component patterns
- [ ] Read `COMPONENT_MANIFEST.md` — maps every design surface to a React component and defines the exact build order

The Tweaks panel visible in the top-right of every HTML prototype is for design review only — do not port it.

---

## 9. Code quality tools — install before first commit

Install these into the project before writing any application code.
Once these are in place Claude Code will produce consistently formatted output from day one.

### ESLint (TypeScript linting)

```bash
cd apps/web && npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks
cd apps/api && npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Create `.eslintrc.json` in each app:

```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": "warn"
  }
}
```

### Prettier (code formatting)

```bash
npm install --save-dev prettier
```

Create `.prettierrc` in the project root:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Husky + lint-staged (pre-commit hooks)

Runs ESLint and Prettier automatically before every commit.
Prevents badly formatted or linted code from ever reaching the repo.

```bash
npm install --save-dev husky lint-staged
npx husky init
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,json,md}": ["prettier --write"],
    "*.py": ["black", "flake8"]
  }
}
```

### Python formatting (Black + Flake8)

```bash
cd services/calc-engine && pip install black flake8
```

Create `setup.cfg` in the calc-engine folder:

```ini
[flake8]
max-line-length = 100
exclude = .venv, __pycache__

[tool:pytest]
testpaths = .
python_files = *_test.py test_*.py
```

---

## 10. CI/CD pipeline — GitHub Actions

Create `.github/workflows/ci.yml` in the repo root.
This runs automatically on every pull request and blocks merges if any check fails.

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:

  typecheck-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd apps/web && npm install && npm run typecheck

  typecheck-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd apps/api && npm install && npm run typecheck

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd apps/web && npm install && npm test -- --watchAll=false

  test-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd apps/api && npm install && npm test

  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: |
          cd services/calc-engine
          pip install -r requirements.txt
          pytest . -v --ignore=tests/golden_dataset

  golden-dataset:
    runs-on: ubuntu-latest
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: |
          cd services/calc-engine
          pip install -r requirements.txt
          pytest tests/golden_dataset/test_extraction.py -v

  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: |
          cd services/calc-engine
          pip install -r requirements.txt
          pytest tests/test_regression.py -v
```

Add secrets to GitHub:
- Go to repo → Settings → Secrets and variables → Actions
- Add `ANTHROPIC_API_KEY` (needed for the golden dataset test which calls Claude Haiku)

---

## 11. Transactional email setup (Resend)

Supabase auth emails come from a Supabase address by default. Before launch, users should receive emails from `no-reply@propscout.ca`.

- [ ] Create account at resend.com
- [ ] Add `propscout.ca` as a sending domain
- [ ] Resend provides SPF and DKIM DNS records — add these to GoDaddy
- [ ] In Supabase dashboard → Authentication → Email settings → set custom SMTP to Resend's SMTP details
- [ ] Test: sign up with a real email and confirm the confirmation email arrives from `no-reply@propscout.ca`

Emails that need to work at launch:
- Email confirmation on signup
- Password reset
- Province waitlist confirmation ("We'll notify you when [province] launches")

---

## 12. Error monitoring — post-launch, first week

Do not set up before launch — adds complexity during development.
Set up in the first week after going live.

- [ ] Create Sentry account at sentry.io (free tier is sufficient to start)
- [ ] Add Sentry SDK to Fastify API: `npm install @sentry/node`
- [ ] Add Sentry SDK to React frontend: `npm install @sentry/react`
- [ ] Add Sentry DSN to `.env` as `SENTRY_DSN`
- [ ] Verify: trigger a test error and confirm it appears in Sentry dashboard

---

## 13. Analytics — post-launch, first week

- [ ] Create Plausible account at plausible.io ($9/month — privacy-friendly, PIPEDA compliant, no cookie banner needed)
- [ ] Add the Plausible script to the React app
- [ ] Set up goals for key events: analysis completed, PDF exported, share link generated, upgrade prompt shown
- [ ] Verify events are tracking in the Plausible dashboard

---

## 14. Legal and government — complete before first paying customer

These items are not needed to build or launch a free version of the app.
Complete them before activating Stripe and charging anyone money.

### Business structure
- [ ] Decide: sole proprietor or incorporated company
- [ ] If incorporating: hire a lawyer or use an online incorporation service (ownr.co or owncompany.ca for Ontario)
- [ ] Incorporation protects personal assets — recommended given that PropScout influences decisions worth hundreds of thousands of dollars
- [ ] Open a separate business bank account once incorporated

### HST registration
- [ ] Register for a GST/HST number with the Canada Revenue Agency at canada.ca/en/revenue-agency
- [ ] Required before your first paid Canadian subscriber
- [ ] Stripe can collect and remit HST automatically once the CRA number is configured
- [ ] Registration is free and takes about 20 minutes online

### Privacy policy (PIPEDA compliance)
- [ ] Write a privacy policy explaining: what data is collected, why, how long it is retained, and how users can request deletion
- [ ] Publish it at propscout.ca/privacy before any users sign up
- [ ] Data collected by PropScout includes: email address, listing URLs analysed, analysis results, and usage data
- [ ] Define and implement a data retention policy: how long analyses are stored, when they are deleted, what happens when a user deletes their account

### Terms of service
- [ ] Write terms of service covering: no financial advice disclaimer, acceptable use, subscription terms, cancellation policy
- [ ] Publish at propscout.ca/terms before any users sign up
- [ ] The "Not financial or legal advice" disclaimer that appears on every report must be reflected in the terms

### Disclaimer (already in the app)
- [ ] Confirm "Not financial or legal advice" appears in the footer of every report type
- [ ] Confirm it appears in the PDF footer on every page
- [ ] Confirm it is referenced in the terms of service

---

## Quick reference — what can wait vs what is needed now

| Item | Needed now | Can wait |
|---|---|---|
| Domain DNS (Vercel) | ✅ Before coding | |
| Social handles | ✅ This week | |
| Supabase, Railway, Vercel accounts | ✅ Before coding | |
| Anthropic, Mapbox, Walk Score, Google Places keys | ✅ Before coding | |
| Resend account + DNS records | ✅ Before coding | |
| GitHub repo + branch protection | ✅ Before coding | |
| .gitignore + .env.example + README | ✅ Before first commit | |
| Design system setup (tokens.css, Google Fonts) | ✅ Before first commit | |
| ESLint, Prettier, Husky | ✅ Before first commit | |
| GitHub Actions CI/CD | ✅ Before first PR | |
| Stripe account | | ✅ Before payments activate |
| Sentry error monitoring | | ✅ First week post-launch |
| Plausible analytics | | ✅ First week post-launch |
| HST registration | | ✅ Before first paid customer |
| Business incorporation | | ✅ Before first paid customer |
| Privacy policy + Terms of service | | ✅ Before any users sign up |

---

*PropScout · Pre-Development Setup · May 2026 · Complete this file before opening a code editor*
