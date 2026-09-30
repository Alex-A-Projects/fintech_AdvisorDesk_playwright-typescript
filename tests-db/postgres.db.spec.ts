/**
 * DB tests — Live Postgres (real server, real network, real SQL engine).
 *
 * Boots a Postgres container with `docker compose up -d postgres`, then
 * exercises the same domain as the SQLite suite but against a real RDBMS.
 *
 * Skip gracefully if Postgres isn't reachable — every test becomes a skip
 * rather than a failure.
 */
import { test as base, expect } from '@playwright/test';
import {
  connectPg,
  applyPgSchema,
  closePg,
  pgPing,
  pgQuery,
  pgExec,
} from '../utils/db/connection.postgres';
import {
  PgClients,
  PgProjects,
  PgTasks,
  PgInvoices,
  PgRaw,
} from '../utils/db/repository.pg';
import { log } from '../utils/helpers/logger';

// Module-level state, populated by `beforeAll` hooks below.
let pgAvailable = false;
let pgConnected = false;

/** Run the test only when Postgres is up. Skipped otherwise. */
const pgTest = base.extend({});

base.beforeAll(async () => {
  pgAvailable = await pgPing().catch(() => false);
  if (!pgAvailable) {
    log.warn('⚠️  Postgres unreachable — start it with: npm run db:up');
    return;
  }
  await connectPg();
  pgConnected = true;
  await applyPgSchema();
  await PgRaw.truncateAll();
});

base.afterAll(async () => {
  if (pgConnected) {
    await closePg();
    pgConnected = false;
  }
});

// Helper that emits a `test.skip(...)` when Postgres is unreachable,
// otherwise delegates to the real test runner.
function pgTestFn(title: string, body: () => Promise<void> | void, tag?: '@smoke' | '@regression') {
  base.describe(tag ? `${title} ${tag}` : title, () => {
    base(title.split(' — ').pop() ?? title, async () => {
      if (!pgAvailable) {
        base.skip(true, 'Postgres not reachable');
        return;
      }
      await body();
    });
  });
}

// ============================================================================
// Connectivity
// ============================================================================
base.describe('@db Postgres — Connectivity @smoke', () => {
  base('connects and reports version', async () => {
    if (!pgAvailable) {
      base.skip(true, 'Postgres not reachable');
      return;
    }
    const version = await PgRaw.version();
    expect(version).toContain('PostgreSQL');
  });

  base('schema applied — clients table exists', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const rows = await pgQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM information_schema.tables WHERE table_name = 'clients'`,
    );
    expect(parseInt(rows[0].n, 10)).toBe(1);
  });

  base('all 13 expected tables exist', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const expected = [
      'clients', 'projects', 'tasks', 'invoices', 'invoice_lines',
      'quotes', 'events', 'notes', 'timelogs', 'activity',
      'integrations', 'settings', 'audit_log',
    ];
    for (const t of expected) {
      const rows = await pgQuery<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM information_schema.tables WHERE table_name = $1`,
        [t],
      );
      expect(parseInt(rows[0].n, 10), `table ${t} should exist`).toBe(1);
    }
  });
});

// ============================================================================
// Clients CRUD
// ============================================================================
base.describe('@db Postgres — Clients CRUD @smoke', () => {
  base('insert and read back', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const id = await PgClients.insert({
      name: 'Pg Test Client',
      status: 'active',
      email: 'pg@example.com',
    });
    expect(typeof id).toBe('string');
    const c = await PgClients.byId(id);
    expect(c?.name).toBe('Pg Test Client');
    expect(c?.email).toBe('pg@example.com');
  });

  base('count matches inserts', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const before = await PgClients.count();
    await PgClients.insert({ name: 'Count-A', status: 'lead' });
    await PgClients.insert({ name: 'Count-B', status: 'active' });
    const after = await PgClients.count();
    expect(after).toBe(before + 2);
  });

  base('invalid status is rejected', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    await expect(
      pgExec(
        `INSERT INTO clients (id, name, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
        [uuid(), 'bad', 'invalid', Date.now(), Date.now()],
      ),
    ).rejects.toThrow(/check/i);
  });

  base('cascade delete removes projects', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Cascade Test', status: 'active' });
    await PgProjects.insert({ clientId: cid, name: 'Cascade Project', stage: 'lead' });
    await PgClients.remove(cid);
    const remaining = await pgQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM projects WHERE client_id = $1`,
      [cid],
    );
    expect(parseInt(remaining[0].n, 10)).toBe(0);
  });

  base('email lookup works', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const email = `lookup-${Date.now()}@example.com`;
    await PgClients.insert({ name: 'Lookup', status: 'active', email });
    const rows = await pgQuery<{ email: string }>(
      `SELECT email FROM clients WHERE email = $1`,
      [email],
    );
    expect(rows[0]?.email).toBe(email);
  });
});

// ============================================================================
// Projects
// ============================================================================
base.describe('@db Postgres — Projects @regression', () => {
  base('insert and read back', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Proj-Client', status: 'active' });
    const pid = await PgProjects.insert({
      clientId: cid,
      name: 'Postgres Project',
      stage: 'in_progress',
      value: 5000,
    });
    const p = await PgProjects.byId(pid);
    expect(p?.name).toBe('Postgres Project');
    expect(p?.value).toBe(5000);
  });

  base('foreign key to clients enforced', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    await expect(
      pgExec(
        `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuid(), 'nonexistent-client', 'X', 'lead', Date.now(), Date.now()],
      ),
    ).rejects.toThrow(/foreign key/i);
  });

  base('count is accurate after multiple inserts', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Multi-Project', status: 'active' });
    const before = await PgProjects.count();
    for (let i = 0; i < 10; i++) {
      await PgProjects.insert({ clientId: cid, name: `P-${i}`, stage: 'lead' });
    }
    const after = await PgProjects.count();
    expect(after).toBe(before + 10);
  });

  base('stage check constraint rejects invalid', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Bad Stage', status: 'active' });
    await expect(
      pgExec(
        `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuid(), cid, 'X', 'invalid', Date.now(), Date.now()],
      ),
    ).rejects.toThrow(/check/i);
  });
});

// ============================================================================
// Tasks
// ============================================================================
base.describe('@db Postgres — Tasks @regression', () => {
  base('insert and read back', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const id = await PgTasks.insert({ title: 'PG Task', priority: 'high' });
    const rows = await pgQuery<{ title: string; priority: string }>(
      `SELECT title, priority FROM tasks WHERE id = $1`,
      [id],
    );
    expect(rows[0]?.title).toBe('PG Task');
    expect(rows[0]?.priority).toBe('high');
  });

  base('done defaults to false', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const id = await PgTasks.insert({ title: 'Defaults' });
    const rows = await pgQuery<{ done: boolean }>(
      `SELECT done FROM tasks WHERE id = $1`,
      [id],
    );
    expect(rows[0]?.done).toBe(false);
  });

  base('overdue query returns past due tasks', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const past = '2020-01-01';
    const cid = await PgClients.insert({ name: 'Overdue', status: 'active' });
    const id = await PgTasks.insert({
      title: 'Way overdue',
      dueDate: past,
      clientId: cid,
    });
    const overdue = await PgTasks.overdue();
    expect(overdue.find((t) => t.id === id)).toBeTruthy();
  });

  base('bulk insert 100 tasks', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const before = await PgTasks.count();
    for (let i = 0; i < 100; i++) {
      await PgTasks.insert({ title: `Bulk ${i}` });
    }
    const after = await PgTasks.count();
    expect(after).toBe(before + 100);
  });
});

// ============================================================================
// Invoices
// ============================================================================
base.describe('@db Postgres — Invoices @regression', () => {
  base('insert with lines computes total', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Inv-Client', status: 'active' });
    const id = await PgInvoices.insert({
      number: `PG-${Date.now()}`,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-09-29',
      dueDate: '2026-10-29',
      lines: [
        { description: 'A', qty: 2, rate: 100 },
        { description: 'B', qty: 1, rate: 50 },
      ],
    });
    const rows = await pgQuery<{ subtotal: string; total: string }>(
      `SELECT subtotal::text, total::text FROM invoices WHERE id = $1`,
      [id],
    );
    expect(parseFloat(rows[0].subtotal)).toBe(250);
    expect(parseFloat(rows[0].total)).toBe(250);
  });

  base('unique invoice number enforced', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Dup-Inv', status: 'active' });
    const num = `DUP-${Date.now()}`;
    await PgInvoices.insert({
      number: num,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'X', qty: 1, rate: 100 }],
    });
    await expect(
      PgInvoices.insert({
        number: num,
        clientId: cid,
        status: 'draft',
        issueDate: '2026-01-01',
        dueDate: '2026-02-01',
        lines: [{ description: 'X', qty: 1, rate: 100 }],
      }),
    ).rejects.toThrow(/unique/i);
  });

  base('revenue sums paid invoices', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Rev-Client', status: 'active' });
    await PgInvoices.insert({
      number: `REV-${Date.now()}-A`,
      clientId: cid,
      status: 'paid',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'X', qty: 1, rate: 1000 }],
    });
    await PgInvoices.insert({
      number: `REV-${Date.now()}-B`,
      clientId: cid,
      status: 'paid',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'Y', qty: 1, rate: 500 }],
    });
    const rev = await PgInvoices.revenue();
    expect(rev).toBeGreaterThanOrEqual(1500);
  });

  base('cascade deletes invoice lines', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Line-Cascade', status: 'active' });
    const id = await PgInvoices.insert({
      number: `LC-${Date.now()}`,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'X', qty: 1, rate: 100 }],
    });
    await pgExec(`DELETE FROM invoices WHERE id = $1`, [id]);
    const remaining = await pgQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM invoice_lines WHERE invoice_id = $1`,
      [id],
    );
    expect(parseInt(remaining[0].n, 10)).toBe(0);
  });
});

// ============================================================================
// Transactions
// ============================================================================
base.describe('@db Postgres — Transactions @regression', () => {
  base('BEGIN/COMMIT commits both inserts', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Tx-OK', status: 'active' });
    const before = await PgProjects.count();
    await pgExec(`BEGIN`);
    try {
      await pgExec(
        `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuid(), cid, 'Tx-A', 'lead', Date.now(), Date.now()],
      );
      await pgExec(
        `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuid(), cid, 'Tx-B', 'lead', Date.now(), Date.now()],
      );
      await pgExec(`COMMIT`);
    } catch (e) {
      await pgExec(`ROLLBACK`);
      throw e;
    }
    const after = await PgProjects.count();
    expect(after).toBe(before + 2);
  });

  base('BEGIN/ROLLBACK reverts inserts on failure', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Tx-Rollback', status: 'active' });
    const before = await PgProjects.count();
    await pgExec(`BEGIN`);
    try {
      await pgExec(
        `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuid(), cid, 'RB-A', 'lead', Date.now(), Date.now()],
      );
      await pgExec(
        `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuid(), 'nonexistent-client', 'RB-B', 'lead', Date.now(), Date.now()],
      );
      await pgExec(`COMMIT`);
    } catch {
      await pgExec(`ROLLBACK`);
    }
    const after = await PgProjects.count();
    expect(after).toBe(before);
  });
});

// ============================================================================
// Aggregations
// ============================================================================
base.describe('@db Postgres — Aggregations @regression', () => {
  base('GROUP BY status returns counts', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    await PgClients.insert({ name: 'Group-A', status: 'active' });
    await PgClients.insert({ name: 'Group-B', status: 'active' });
    await PgClients.insert({ name: 'Group-C', status: 'lead' });
    const rows = await pgQuery<{ status: string; n: string }>(
      `SELECT status, COUNT(*)::text AS n FROM clients GROUP BY status`,
    );
    const activeCount = parseInt(rows.find((r) => r.status === 'active')?.n ?? '0', 10);
    expect(activeCount).toBeGreaterThanOrEqual(2);
  });

  base('JOIN clients to projects', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const cid = await PgClients.insert({ name: 'Join Test', status: 'active' });
    await PgProjects.insert({ clientId: cid, name: 'Joined', stage: 'lead' });
    const rows = await pgQuery<{ cname: string; pname: string }>(
      `SELECT c.name AS cname, p.name AS pname FROM clients c
       INNER JOIN projects p ON p.client_id = c.id WHERE c.id = $1`,
      [cid],
    );
    expect(rows[0]?.cname).toBe('Join Test');
    expect(rows[0]?.pname).toBe('Joined');
  });

  base('EXISTS subquery', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const rows = await pgQuery<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM clients LIMIT 1) AS exists`,
    );
    expect(rows[0]?.exists).toBe(true);
  });
});

// ============================================================================
// Performance
// ============================================================================
base.describe('@db Postgres — Performance @regression', () => {
  base('EXPLAIN ANALYZE works', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const plan = await PgRaw.explain(`SELECT * FROM clients WHERE status = 'active'`);
    expect(plan.length).toBeGreaterThan(0);
  });

  base('indexed query on status is fast', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const start = Date.now();
    await pgQuery(`SELECT id FROM clients WHERE status = 'active' LIMIT 100`);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  base('connection survives concurrent queries', async () => {
    if (!pgAvailable) return base.skip(true, 'Postgres not reachable');
    const queries = Array.from({ length: 10 }, () =>
      pgQuery(`SELECT pg_sleep(0.05), 1 AS one`),
    );
    const results = await Promise.all(queries);
    expect(results.length).toBe(10);
    for (const r of results) {
      expect((r[0] as { one: number }).one).toBe(1);
    }
  });
});

// Local uuid helper (avoids importing uuid at the top, which triggers a CJS warning).
import { v4 as uuid } from 'uuid';