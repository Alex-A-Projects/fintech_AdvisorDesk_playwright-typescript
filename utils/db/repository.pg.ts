/**
 * Postgres repository — typed CRUD against the live pg instance.
 *
 * Mirrors utils/db/repository.ts (SQLite) but uses parameterized pg queries.
 * The DB tests in `tests/db/postgres.db.spec.ts` exercise this directly.
 */
import { v4 as uuid } from 'uuid';
import { pgQuery, pgExec } from './connection.postgres';
import type { Client, Project, Task, Invoice } from '../../types';

export const PgClients = {
  all: () => pgQuery<Client & { aum?: number; risk_profile?: string }>(
    `SELECT id, name, company, email, phone, status, source, address, notes,
            aum, risk_profile, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM clients ORDER BY name`,
  ),

  byId: async (id: string) => {
    const rows = await pgQuery<Client>(
      `SELECT id, name, company, email, phone, status, source, address, notes,
              aum, risk_profile, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM clients WHERE id = $1`,
      [id],
    );
    return rows[0];
  },

  insert: async (c: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { aum?: number; risk_profile?: string }) => {
    const id = uuid();
    const now = Date.now();
    await pgExec(
      `INSERT INTO clients (id, name, company, email, phone, status, source, address, notes, aum, risk_profile, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        c.name,
        c.company ?? null,
        c.email ?? null,
        c.phone ?? null,
        c.status,
        c.source ?? null,
        c.address ?? null,
        c.notes ?? null,
        c.aum ?? 0,
        c.risk_profile ?? null,
        now,
        now,
      ],
    );
    return id;
  },

  count: async () => {
    const rows = await pgQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM clients`);
    return parseInt(rows[0].n, 10);
  },

  remove: (id: string) => pgExec(`DELETE FROM clients WHERE id = $1`, [id]),
};

export const PgProjects = {
  all: () => pgQuery<Project>(
    `SELECT id, client_id AS "clientId", name, stage, value,
            start_date AS "startDate", end_date AS "endDate", notes,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM projects ORDER BY created_at DESC`,
  ),

  byId: async (id: string) => {
    const rows = await pgQuery<Project>(
      `SELECT id, client_id AS "clientId", name, stage, value,
              start_date AS "startDate", end_date AS "endDate", notes,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM projects WHERE id = $1`,
      [id],
    );
    return rows[0];
  },

  insert: async (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = uuid();
    const now = Date.now();
    await pgExec(
      `INSERT INTO projects (id, client_id, name, stage, value, start_date, end_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        p.clientId,
        p.name,
        p.stage,
        p.value ?? 0,
        p.startDate ?? null,
        p.endDate ?? null,
        p.notes ?? null,
        now,
        now,
      ],
    );
    return id;
  },

  count: async () => {
    const rows = await pgQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM projects`);
    return parseInt(rows[0].n, 10);
  },
};

export const PgTasks = {
  all: () => pgQuery<Task>(
    `SELECT id, title, done, client_id AS "clientId", project_id AS "projectId",
            due_date AS "dueDate", priority,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM tasks ORDER BY created_at DESC`,
  ),

  insert: async (t: { title: string; done?: boolean; clientId?: string; projectId?: string; dueDate?: string; priority?: 'low' | 'med' | 'high' }) => {
    const id = uuid();
    const now = Date.now();
    await pgExec(
      `INSERT INTO tasks (id, title, done, client_id, project_id, due_date, priority, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        t.title,
        t.done ?? false,
        t.clientId ?? null,
        t.projectId ?? null,
        t.dueDate ?? null,
        t.priority ?? null,
        now,
        now,
      ],
    );
    return id;
  },

  count: async () => {
    const rows = await pgQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM tasks`);
    return parseInt(rows[0].n, 10);
  },

  pending: () => pgQuery<Task>(`SELECT id, title, done FROM tasks WHERE done = false LIMIT 10`),

  overdue: () => pgQuery<Task>(
    `SELECT id, title, due_date AS "dueDate", done FROM tasks
     WHERE done = false AND due_date IS NOT NULL AND due_date::date < CURRENT_DATE`,
  ),
};

export const PgInvoices = {
  count: async () => {
    const rows = await pgQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM invoices`);
    return parseInt(rows[0].n, 10);
  },

  revenue: async () => {
    const rows = await pgQuery<{ r: string }>(
      `SELECT COALESCE(SUM(total), 0)::text AS r FROM invoices WHERE status = 'paid'`,
    );
    return parseFloat(rows[0].r);
  },

  outstanding: async () => {
    const rows = await pgQuery<{ r: string }>(
      `SELECT COALESCE(SUM(total), 0)::text AS r FROM invoices WHERE status = 'sent'`,
    );
    return parseFloat(rows[0].r);
  },

  byStatus: (status: string) =>
    pgQuery<Invoice>(
      `SELECT id, number, client_id AS "clientId", status, issue_date AS "issueDate",
              due_date AS "dueDate", subtotal, tax, total, notes,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM invoices WHERE status = $1`,
      [status],
    ),

  insert: async (inv: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = uuid();
    const now = Date.now();
    const subtotal = inv.lines.reduce((s, l) => s + l.qty * l.rate, 0);
    const tax = inv.tax ?? 0;
    const total = +(subtotal + tax).toFixed(2);
    const insertLine = async (desc: string, qty: number, rate: number) => {
      await pgExec(
        `INSERT INTO invoice_lines (id, invoice_id, description, qty, rate) VALUES ($1, $2, $3, $4, $5)`,
        [uuid(), id, desc, qty, rate],
      );
    };
    await pgExec(
      `INSERT INTO invoices (id, number, client_id, project_id, status, issue_date, due_date, subtotal, tax, total, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        inv.number,
        inv.clientId,
        inv.projectId ?? null,
        inv.status,
        inv.issueDate,
        inv.dueDate,
        subtotal,
        tax,
        total,
        inv.notes ?? null,
        now,
        now,
      ],
    );
    for (const l of inv.lines) await insertLine(l.description, l.qty, l.rate);
    return id;
  },
};

/* ============ Raw query helpers (for the tests themselves) ============ */

export const PgRaw = {
  /** psql-style parameterized query — returns all rows. */
  query: pgQuery,
  /** psql-style statement — used for INSERT/UPDATE/DELETE. */
  exec: pgExec,
  /** SELECT COUNT(*) helper. */
  count: async (table: string) => {
    const rows = await pgQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM ${table}`,
    );
    return parseInt(rows[0].n, 10);
  },
  /** TRUNCATE everything for a clean test run. */
  truncateAll: async () => {
    await pgExec(`
      TRUNCATE TABLE
        audit_log, settings, integrations, activity, timelogs,
        notes, events, invoice_lines, invoices, quotes,
        tasks, projects, clients
      RESTART IDENTITY CASCADE
    `);
  },
  /** Postgres-internal diagnostics — what version are we on? */
  version: async () => {
    const rows = await pgQuery<{ version: string }>(`SELECT version()`);
    return rows[0].version;
  },
  /** EXPLAIN ANALYZE — used by perf tests. */
  explain: (sql: string) => pgQuery(`EXPLAIN ANALYZE ${sql}`),
};