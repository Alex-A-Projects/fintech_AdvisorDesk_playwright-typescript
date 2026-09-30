# AdvisorDesk Test Framework

A Playwright + TypeScript test framework for the
[AdvisorDesk demo app](https://cdn.shopify.com/s/files/1/0604/1550/8613/t/1/assets/demo-financial-advisors.html)
covering UI testing with Page Object Model, API testing against fintech-relevant
public APIs, and database testing with SQLite (and optionally Postgres via Docker).

## Test counts

| Project | Count | Notes |
|---|---:|---|
| `chromium` UI | 165 | Smoke + regression for all 11 demo pages |
| `api` | 150 | 9 fintech-relevant public APIs |
| `db` (SQLite) | 103 | Schema, CRUD, transactions, perf |
| `db-integration` | 16 | Browser ↔ SQLite mirror |
| `db-postgres` | 28 | Real Postgres via Docker (skips gracefully if down) |
| **Total (runnable in Chromium)** | **462** | Plus DB+API suites run independently |

## Project structure

```
.
├── pages/                   12 Page Object Models (one per demo page)
├── components/              7 reusable UI widgets (Sidebar, Modal, Toast…)
├── fixtures/                Playwright fixtures + 11 page instances
├── config/                  Environment configuration
├── types/                   Shared TypeScript types
├── utils/
│   ├── api/                 ApiClient + 7 pre-configured clients
│   │                        (with throttling + retry-on-429 + Retry-After)
│   ├── db/                  SQLite connection, schema, seed, repository,
│   │                        + Postgres connection + repository
│   └── helpers/             logger, faker, data-store, wait
├── tests/                   UI tests for demo pages (12 files)
├── tests-api/               API tests (9 files)
├── tests-db/                DB tests (7 files)
├── public/demo.html          Locally-served copy of the demo
├── playwright.config.ts      7 projects
├── docker-compose.yml       Postgres + MySQL + Mongo for integration tests
├── tsconfig.json            Strict TS + path aliases
└── package.json
```

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

The Playwright config boots `http-server ./public -p 8765` automatically
when tests run, so the demo is served from the local `public/demo.html`
(which sidesteps the Shopify CDN's sandboxed iframe).

## Running tests

```bash
npm test                       # Chromium UI only (default)
npm run test:api               # API suite
npm run test:db                # SQLite DB suite
npm run test:db:pg             # Postgres DB suite (needs Docker)
npm run test:smoke             # @smoke tagged
npm run test:headed            # visible browser
npm run test:report            # open last HTML report

# Optional: spin up Postgres for the real-RDBMS tests
npm run db:up                  # docker compose up -d postgres
npm run db:down                # docker compose down
```

## Page Object Model

Each demo page has a POM in `pages/`. Common UI widgets live in
`components/`. All tests get fixtures from `fixtures/` which auto-seed
the demo with sample data and provide typed page instances:

```ts
import { test, expect } from '../fixtures';

test('create client', async ({ clientsPage }) => {
  await clientsPage.goto('clients');
  await clientsPage.clickAdd();
  await clientsPage.modal.fill('Name', 'Acme');
  await clientsPage.modal.fill('Email', 'a@b.com');
  await clientsPage.modal.submit();
  await clientsPage.toast.expectVisible(/added/i);
});
```

**11 demo pages covered**: Dashboard, Clients (+ detail), Projects
(+ detail), Tasks, Invoices (+ detail), Quotes, Calendar, Notes
(+ detail), Reports, Integrations, Settings.

## API testing

7 fintech-relevant public APIs in `utils/api/api-client-manager.ts`:

| API | What it gives us |
|---|---|
| JSONPlaceholder | CRUD / auth / pagination |
| HTTPBin | HTTP request/response sandbox |
| Frankfurter | ECB currency rates |
| ExchangeRate | FX rates |
| CoinGecko | Crypto prices |
| GitHub | REST + auth patterns |
| ReqRes | Auth / CRUD / pagination |
| Stripe + Square + PayPal + Notion | Negative-path auth checks |

Each client supports `.get .post .put .patch .delete .head .options` and
returns a normalized `ApiResponse<T>` with timing + headers.

The `ApiClient` is **resilient to 429s**:

- 400ms per-host throttle
- Auto-retry on 429/5xx with exponential backoff
- Honors `Retry-After` response header
- Returns the last response (with status `0` on exhaustion) so tests can
  assert on shape — most tests accept `[0, 200, 429]` and only check data
  when status is 200

## Database testing

**SQLite** (default) via `better-sqlite3` — synchronous, file-based, no
setup. Schema mirrors the AdvisorDesk data model: clients, projects,
tasks, invoices, invoice_lines, quotes, events, notes, timelogs,
activity, integrations, settings, audit_log.

Bootstrapped with `npm run db:seed` — 15 clients, 30 projects, 60 tasks,
20 invoices with line items, AUM, risk profiles, stage/status/timing
distributions.

Use `utils/db/repository.ts` for typed CRUD:

```ts
import { Clients } from '../../utils/db/repository';

test('cascade delete removes child projects', () => {
  const id = Clients.insert({ name: 'X', status: 'active' });
  // ... insert project with client_id = id ...
  Clients.remove(id);
  // verify cascade...
});
```

**Postgres** (optional) via `docker compose up -d postgres` —
real RDBMS, real SQL dialect, tests skip gracefully if Docker isn't running:

```bash
npm run db:up        # docker compose up -d postgres
npm run test:db:pg   # 28 tests against real Postgres
npm run db:down
```

A separate `tests/e2e/db-integration.spec.ts` validates that the demo's
localStorage store and the SQLite mirror stay in sync after each CRUD.

## Path aliases

```ts
import { BasePage } from '@pages/base.page';
import { Clients } from '@db/repository';
import { ApiClient } from '@api/api-client';
import { environment } from '@config/environments';
```

## CI

```bash
CI=true npm test
```

The config uses `workers: 1` for DB projects so the SQLite file isn't
dropped concurrently. Retries are enabled by default (2 retries on
transient 429/5xx).