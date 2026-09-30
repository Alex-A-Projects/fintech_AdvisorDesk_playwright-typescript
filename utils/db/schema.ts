/**
 * Schema for the AdvisorDesk DB. One file with every CREATE TABLE so we can
 * bootstrap, reset, and inspect from tests.
 */
export const SCHEMA = `
-- =========================================================================
-- AdvisorDesk DB schema — mirrors the demo's localStorage store.
-- =========================================================================

CREATE TABLE IF NOT EXISTS clients (
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
  aum           REAL DEFAULT 0,           -- assets under management (advisor-specific)
  risk_profile  TEXT
                  CHECK (risk_profile IN ('conservative','moderate','balanced','growth','aggressive') OR risk_profile IS NULL),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email  ON clients(email);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  stage       TEXT NOT NULL DEFAULT 'lead'
                CHECK (stage IN ('lead','in_progress','review','done')),
  value       REAL DEFAULT 0,
  start_date  TEXT,
  end_date    TEXT,
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage  ON projects(stage);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0,1)),
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  due_date    TEXT,
  priority    TEXT CHECK (priority IN ('low','med','high') OR priority IS NULL),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);

CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','paid')),
  issue_date  TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  subtotal    REAL NOT NULL DEFAULT 0,
  tax         REAL NOT NULL DEFAULT 0,
  total       REAL NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty         REAL NOT NULL DEFAULT 1,
  rate        REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

CREATE TABLE IF NOT EXISTS quotes (
  id          TEXT PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','accepted','declined')),
  issue_date  TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  total       REAL NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  time        TEXT,
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  notes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS timelogs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_ts    INTEGER NOT NULL,
  end_ts      INTEGER,
  notes       TEXT,
  billed      INTEGER NOT NULL DEFAULT 0 CHECK (billed IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_timelogs_project ON timelogs(project_id);

CREATE TABLE IF NOT EXISTS activity (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  entity      TEXT NOT NULL,
  message     TEXT NOT NULL,
  ts          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity(ts);

CREATE TABLE IF NOT EXISTS integrations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  connected   INTEGER NOT NULL DEFAULT 0 CHECK (connected IN (0,1)),
  config_json TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  before_json TEXT,
  after_json  TEXT,
  ts          INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`;