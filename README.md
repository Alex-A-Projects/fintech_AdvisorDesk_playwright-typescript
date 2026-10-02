# AdvisorDesk Test Framework

Playwright + TypeScript automation for the
[AdvisorDesk demo](https://cdn.shopify.com/s/files/1/0604/1550/8613/t/1/assets/demo-financial-advisors.html),
using Page Object Models, reusable fixtures, and HTML reports.

- **UI:** website workflows across 11 pages, with desktop and mobile projects.
- **Database:** SQLite and Postgres tests against repository-managed test databases.
- **API:** 58 tests across nine feature files for a proposed AdvisorDesk backend.

The demo uses localStorage. The API endpoints are assumed contracts, not
verified endpoints on the public demo; a compatible backend is required to run them.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

UI tests automatically start the local demo at `http://localhost:8765/demo.html`.
For Firefox or WebKit, install them with `npx playwright install firefox webkit`.

## Run tests

```bash
npm run test:ui                         # Chromium
npm run test:db                         # SQLite
npm run test:api:website                # Proposed API suite
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=mobile
npx playwright test --project=db-integration
npm run test:report                     # Open the main HTML report
```

`npm test` runs all projects in the main configuration. The API suite uses its
own configuration; run it with `test:api:website`.

## API configuration

Set these values in `.env` or your shell:

```dotenv
ADVISORDESK_API_BASE_URL=http://localhost:3000/api/v1/
ADVISORDESK_API_TOKEN=your-test-user-token
```

The URL is an example, not a backend included in this repository. Tests skip
when either value is missing. Use a test backend: scenarios create records and
clean them up afterward.

Tests cover health, authentication, clients, projects, tasks, invoices, quotes,
calendar events, and notes. Run one feature or list all cases:

```bash
npm run test:api:website -- clients.api.spec.ts
npm run test:api:website -- --list
npx playwright show-report playwright-report/advisordesk-api
```

## Postgres

Docker is required for the Postgres suite:

```bash
npm run db:up
npm run test:db:pg
npm run db:down
```

## Project structure

| Folder | Purpose |
|---|---|
| `pages/`, `components/` | Page Object Models and reusable UI components |
| `fixtures/` | Browser setup and sample data |
| `tests/e2e/` | UI, mobile, and browser/database mirror tests |
| `tests-advisordesk-api/` | Proposed API tests, shared fixtures, and test data |
| `tests-db/`, `utils/db/` | Database tests, connections, seed, and repositories |
| `config/`, `types/` | Environment configuration and shared domain types |
| `public/demo.html` | Local copy of the demo |

Main reports are saved in `playwright-report/` and `test-results/`.
