/**
 * DB tests — Schema validation.
 * Verifies the SQLite DB has every expected table, column, and constraint.
 */
import { test, expect } from '@playwright/test';
import { db } from '../utils/db/connection';
import { SCHEMA } from '../utils/db/schema';

const REQUIRED_TABLES = [
  'clients',
  'projects',
  'tasks',
  'invoices',
  'invoice_lines',
  'quotes',
  'events',
  'notes',
  'timelogs',
  'activity',
  'integrations',
  'settings',
  'audit_log',
];

test.beforeAll(() => {
  // Apply schema to a fresh DB
  db.exec('DROP TABLE IF EXISTS audit_log;');
  db.exec('DROP TABLE IF EXISTS settings;');
  db.exec('DROP TABLE IF EXISTS integrations;');
  db.exec('DROP TABLE IF EXISTS activity;');
  db.exec('DROP TABLE IF EXISTS timelogs;');
  db.exec('DROP TABLE IF EXISTS notes;');
  db.exec('DROP TABLE IF EXISTS events;');
  db.exec('DROP TABLE IF EXISTS invoice_lines;');
  db.exec('DROP TABLE IF EXISTS invoices;');
  db.exec('DROP TABLE IF EXISTS quotes;');
  db.exec('DROP TABLE IF EXISTS tasks;');
  db.exec('DROP TABLE IF EXISTS projects;');
  db.exec('DROP TABLE IF EXISTS clients;');
  db.exec(SCHEMA);
});

test.afterAll(() => {
});

test.describe('@db Schema — Tables @smoke', () => {
  for (const table of REQUIRED_TABLES) {
    test(`table "${table}" exists`, () => {
      const r = db
        .prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table) as { n: number };
      expect(r.n).toBe(1);
    });
  }

  test('all tables are queryable', () => {
    for (const table of REQUIRED_TABLES) {
      const r = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
      expect(r.n).toBeGreaterThanOrEqual(0);
    }
  });

  test('PRAGMA foreign_keys is ON', () => {
    const r = db.prepare(`PRAGMA foreign_keys`).get() as { foreign_keys: number };
    expect(r.foreign_keys).toBe(1);
  });

  test('PRAGMA journal_mode is WAL', () => {
    const r = db.prepare(`PRAGMA journal_mode`).get() as { journal_mode: string };
    expect(r.journal_mode).toBe('wal');
  });
});

test.describe('@db Schema — Clients @regression', () => {
  test('has expected columns', () => {
    const cols = db.prepare(`PRAGMA table_info(clients)`).all() as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    for (const expected of [
      'id',
      'name',
      'company',
      'email',
      'phone',
      'status',
      'source',
      'address',
      'notes',
      'aum',
      'risk_profile',
      'created_at',
      'updated_at',
    ]) {
      expect(names).toContain(expected);
    }
  });

  test('status column has CHECK constraint', () => {
    const r = db.prepare(`SELECT sql FROM sqlite_master WHERE name='clients'`).get() as { sql: string };
    expect(r.sql).toContain("CHECK (status IN ('lead','active','past','archived'))");
  });

  test('rejects invalid status', () => {
    expect(() =>
      db.prepare(`INSERT INTO clients (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .run('x', 'x', 'invalid', 0, 0),
    ).toThrow();
  });

  test('accepts each valid status', () => {
    for (const status of ['lead', 'active', 'past', 'archived']) {
      db.prepare(`INSERT INTO clients (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .run(`c-${status}`, `Test ${status}`, status, 0, 0);
      const r = db.prepare(`SELECT status FROM clients WHERE id = ?`).get(`c-${status}`) as { status: string };
      expect(r.status).toBe(status);
    }
  });
});

test.describe('@db Schema — Projects @regression', () => {
  test('has expected columns', () => {
    const cols = db.prepare(`PRAGMA table_info(projects)`).all() as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    for (const expected of ['id', 'client_id', 'name', 'stage', 'value', 'start_date', 'end_date']) {
      expect(names).toContain(expected);
    }
  });

  test('foreign key to clients is enforced', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('p-bad', 'nonexistent-client', 'p', 'lead', 0, 0),
    ).toThrow(/FOREIGN KEY/);
  });

  test('on delete cascade removes child projects', () => {
    db.prepare(
      `INSERT INTO clients (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    ).run('c-cascade', 'Cascade Test', 'active', 0, 0);
    db.prepare(
      `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('p-cascade', 'c-cascade', 'Cascade', 'lead', 0, 0);
    db.prepare(`DELETE FROM clients WHERE id = ?`).run('c-cascade');
    const r = db.prepare(`SELECT COUNT(*) AS n FROM projects WHERE client_id = ?`).get('c-cascade') as { n: number };
    expect(r.n).toBe(0);
  });
});

test.describe('@db Schema — Invoices @regression', () => {
  test('invoices.number is unique', () => {
    db.prepare(
      `INSERT INTO clients (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    ).run('c-inv-unq', 'A', 'active', 0, 0);
    db.prepare(
      `INSERT INTO invoices (id, number, client_id, status, issue_date, due_date, subtotal, tax, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('i1', 'INV-1', 'c-inv-unq', 'draft', '2026-01-01', '2026-02-01', 100, 0, 100, 0, 0);
    expect(() =>
      db.prepare(
        `INSERT INTO invoices (id, number, client_id, status, issue_date, due_date, subtotal, tax, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run('i2', 'INV-1', 'c-inv-unq', 'draft', '2026-01-01', '2026-02-01', 100, 0, 100, 0, 0),
    ).toThrow(/UNIQUE/);
  });

  test('invoice_lines cascade on invoice delete', () => {
    db.prepare(
      `INSERT INTO invoices (id, number, client_id, status, issue_date, due_date, subtotal, tax, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('i-cascade', 'INV-C', 'c-inv-unq', 'draft', '2026-01-01', '2026-02-01', 100, 0, 100, 0, 0);
    db.prepare(`INSERT INTO invoice_lines (id, invoice_id, description, qty, rate) VALUES (?, ?, ?, ?, ?)`).run(
      'l-cascade',
      'i-cascade',
      'svc',
      1,
      100,
    );
    db.prepare(`DELETE FROM invoices WHERE id = ?`).run('i-cascade');
    const r = db.prepare(`SELECT COUNT(*) AS n FROM invoice_lines WHERE invoice_id = ?`).get('i-cascade') as {
      n: number;
    };
    expect(r.n).toBe(0);
  });
});

test.describe('@db Schema — Tasks @regression', () => {
  test('done column is integer 0/1', () => {
    db.prepare(
      `INSERT INTO clients (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    ).run('c-task', 'A', 'active', 0, 0);
    expect(() =>
      db.prepare(
        `INSERT INTO tasks (id, title, done, client_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('t-bool', 'T', 2, 'c-task', 0, 0),
    ).toThrow(/CHECK/);
  });

  test('priority enum check', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO tasks (id, title, done, created_at, updated_at, priority) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('t-pri', 'T', 0, 0, 0, 'invalid'),
    ).toThrow(/CHECK/);
    // Valid priority is accepted
    db.prepare(
      `INSERT INTO tasks (id, title, done, created_at, updated_at, priority) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('t-pri-good', 'T', 0, 0, 0, 'high');
    const r = db.prepare(`SELECT priority FROM tasks WHERE id = ?`).get('t-pri-good') as { priority: string };
    expect(r.priority).toBe('high');
  });
});

test.describe('@db Schema — Settings & Integrations @regression', () => {
  test('settings uses key/value store', () => {
    db.prepare(`INSERT INTO settings (k, v) VALUES (?, ?)`).run('theme', 'dark');
    const r = db.prepare(`SELECT v FROM settings WHERE k = ?`).get('theme') as { v: string };
    expect(r.v).toBe('dark');
  });

  test('integrations.connected is 0/1', () => {
    db.prepare(`INSERT INTO integrations (id, name, connected) VALUES (?, ?, ?)`).run('stripe', 'Stripe', 0);
    db.prepare(`UPDATE integrations SET connected = 1 WHERE id = ?`).run('stripe');
    const r = db.prepare(`SELECT connected FROM integrations WHERE id = ?`).get('stripe') as { connected: number };
    expect(r.connected).toBe(1);
  });
});

test.describe('@db Schema — Indexes @regression', () => {
  test('idx_clients_status exists', () => {
    const r = db
      .prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name='idx_clients_status'`)
      .get() as { n: number };
    expect(r.n).toBe(1);
  });

  test('idx_projects_client exists', () => {
    const r = db
      .prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name='idx_projects_client'`)
      .get() as { n: number };
    expect(r.n).toBe(1);
  });

  test('idx_tasks_done exists', () => {
    const r = db
      .prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name='idx_tasks_done'`)
      .get() as { n: number };
    expect(r.n).toBe(1);
  });
});