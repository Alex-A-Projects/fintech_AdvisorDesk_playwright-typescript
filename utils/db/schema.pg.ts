/**
 * Postgres DDL — same domain as the SQLite schema, adapted for Postgres.
 * Keeps the column names identical so repository code can stay portable.
 */
export const SCHEMA = `
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS activity CASCADE;
DROP TABLE IF EXISTS timelogs CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

CREATE TABLE clients (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  company       TEXT,
  email         TEXT,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'lead'
                  CHECK (status IN ('lead','active','past','archived')),
  source        TEXT,
  address       TEXT,
  notes         TEXT,
  aum           DOUBLE PRECISION DEFAULT 0,
  risk_profile  TEXT
                  CHECK (risk_profile IN ('conservative','moderate','balanced','growth','aggressive') OR risk_profile IS NULL),
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL
);
CREATE INDEX idx_clients_status ON clients(status);

CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  stage       TEXT NOT NULL DEFAULT 'lead'
                CHECK (stage IN ('lead','in_progress','review','done')),
  value       DOUBLE PRECISION DEFAULT 0,
  start_date  TEXT,
  end_date    TEXT,
  notes       TEXT,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  due_date    TEXT,
  priority    TEXT CHECK (priority IN ('low','med','high')),
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE TABLE invoices (
  id          TEXT PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','paid')),
  issue_date  TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  subtotal    DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax         DOUBLE PRECISION NOT NULL DEFAULT 0,
  total       DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE TABLE invoice_lines (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty         DOUBLE PRECISION NOT NULL DEFAULT 1,
  rate        DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE quotes (
  id          TEXT PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','accepted','declined')),
  issue_date  TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  total       DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE TABLE events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  time        TEXT,
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  notes       TEXT
);

CREATE TABLE notes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE TABLE timelogs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_ts    BIGINT NOT NULL,
  end_ts      BIGINT,
  notes       TEXT,
  billed      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE activity (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  entity      TEXT NOT NULL,
  message     TEXT NOT NULL,
  ts          BIGINT NOT NULL
);

CREATE TABLE integrations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  connected   BOOLEAN NOT NULL DEFAULT FALSE,
  config_json TEXT
);

CREATE TABLE settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  before_json TEXT,
  after_json  TEXT,
  ts          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);
`;