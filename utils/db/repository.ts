/**
 * Repository — typed CRUD operations against the SQLite DB.
 * DB tests and (optionally) UI tests can call into here to validate state.
 */
import { db } from './connection';
import { v4 as uuid } from 'uuid';
import type {
  Client,
  Project,
  Task,
  Invoice,
  InvoiceLine,
  Quote,
  CalendarEvent,
  Note,
  TimeLog,
} from '../../types';

interface DbClient extends Client {
  aum?: number;
  risk_profile?: string;
}

const mapClient = (r: unknown): DbClient => {
  const o = r as Record<string, unknown>;
  return {
    id: o.id as string,
    name: o.name as string,
    company: (o.company as string) ?? undefined,
    email: (o.email as string) ?? undefined,
    phone: (o.phone as string) ?? undefined,
    status: o.status as Client['status'],
    source: (o.source as string) ?? undefined,
    address: (o.address as string) ?? undefined,
    notes: (o.notes as string) ?? undefined,
    aum: (o.aum as number) ?? undefined,
    risk_profile: (o.risk_profile as string) ?? undefined,
  };
};

const mapProject = (r: unknown): Project => {
  const o = r as Record<string, unknown>;
  return {
    id: o.id as string,
    clientId: o.client_id as string,
    name: o.name as string,
    stage: o.stage as Project['stage'],
    value: (o.value as number) ?? 0,
    startDate: (o.start_date as string) ?? undefined,
    endDate: (o.end_date as string) ?? undefined,
    notes: (o.notes as string) ?? undefined,
    createdAt: o.created_at as number,
    updatedAt: o.updated_at as number,
  };
};

const mapTask = (r: unknown): Task => {
  const o = r as Record<string, unknown>;
  return {
    id: o.id as string,
    title: o.title as string,
    done: o.done === 1,
    clientId: (o.client_id as string) ?? undefined,
    projectId: (o.project_id as string) ?? undefined,
    dueDate: (o.due_date as string) ?? undefined,
    priority: o.priority as Task['priority'],
    createdAt: o.created_at as number,
    updatedAt: o.updated_at as number,
  };
};

const mapInvoice = (r: unknown): Invoice => {
  const o = r as Record<string, unknown>;
  return {
    id: o.id as string,
    number: o.number as string,
    clientId: o.client_id as string,
    projectId: (o.project_id as string) ?? undefined,
    status: o.status as Invoice['status'],
    issueDate: o.issue_date as string,
    dueDate: o.due_date as string,
    subtotal: o.subtotal as number,
    tax: o.tax as number,
    total: o.total as number,
    notes: (o.notes as string) ?? undefined,
    createdAt: o.created_at as number,
    updatedAt: o.updated_at as number,
    // `lines` is populated by `getInvoiceWithLines`
    lines: [],
  };
};

const mapLine = (r: unknown): InvoiceLine => {
  const o = r as Record<string, unknown>;
  return {
    description: o.description as string,
    qty: o.qty as number,
    rate: o.rate as number,
  };
};

/* ============ CRUD: clients ============ */

export const Clients = {
  all(): DbClient[] {
    return db.prepare('SELECT * FROM clients ORDER BY name').all().map(mapClient);
  },
  byId(id: string): DbClient | undefined {
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
      ? mapClient(db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Record<string, unknown>)
      : undefined;
  },
  byStatus(status: string): DbClient[] {
    return db.prepare('SELECT * FROM clients WHERE status = ? ORDER BY name').all(status).map(mapClient);
  },
  byEmail(email: string): DbClient | undefined {
    return db.prepare('SELECT * FROM clients WHERE email = ?').get(email)
      ? mapClient(db.prepare('SELECT * FROM clients WHERE email = ?').get(email) as Record<string, unknown>)
      : undefined;
  },
  count(): number {
    return (db.prepare('SELECT COUNT(*) AS n FROM clients').get() as { n: number }).n;
  },
  insert(c: Omit<DbClient, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = uuid();
    const now = Date.now();
    db.prepare(
      `INSERT INTO clients (id, name, company, email, phone, status, source, address, notes, aum, risk_profile, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
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
    );
    return id;
  },
  update(id: string, patch: Partial<DbClient>): void {
    const fields = Object.keys(patch)
      .map((k) => `${k === 'aum' || k === 'risk_profile' ? k : k} = ?`)
      .join(', ');
    const values = Object.values(patch);
    db.prepare(`UPDATE clients SET ${fields}, updated_at = ? WHERE id = ?`).run(...values, Date.now(), id);
  },
  remove(id: string): void {
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  },
};

/* ============ CRUD: projects ============ */

export const Projects = {
  all(): Project[] {
    return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all().map(mapProject);
  },
  byId(id: string): Project | undefined {
    const r = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return r ? mapProject(r as Record<string, unknown>) : undefined;
  },
  byClient(clientId: string): Project[] {
    return db.prepare('SELECT * FROM projects WHERE client_id = ?').all(clientId).map(mapProject);
  },
  byStage(stage: string): Project[] {
    return db.prepare('SELECT * FROM projects WHERE stage = ?').all(stage).map(mapProject);
  },
  count(): number {
    return (db.prepare('SELECT COUNT(*) AS n FROM projects').get() as { n: number }).n;
  },
  insert(p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = uuid();
    const now = Date.now();
    db.prepare(
      `INSERT INTO projects (id, client_id, name, stage, value, start_date, end_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
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
    );
    return id;
  },
  remove(id: string): void {
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  },
};

/* ============ CRUD: tasks ============ */

export const Tasks = {
  all(): Task[] {
    return db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all().map(mapTask);
  },
  byId(id: string): Task | undefined {
    const r = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return r ? mapTask(r as Record<string, unknown>) : undefined;
  },
  pending(): Task[] {
    return db.prepare('SELECT * FROM tasks WHERE done = 0').all().map(mapTask);
  },
  completed(): Task[] {
    return db.prepare('SELECT * FROM tasks WHERE done = 1').all().map(mapTask);
  },
  overdue(): Task[] {
    return db
      .prepare(`SELECT * FROM tasks WHERE done = 0 AND due_date IS NOT NULL AND due_date < date('now')`)
      .all()
      .map(mapTask);
  },
  count(): number {
    return (db.prepare('SELECT COUNT(*) AS n FROM tasks').get() as { n: number }).n;
  },
  insert(t: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'done'> & { done?: boolean }): string {
    const id = uuid();
    const now = Date.now();
    db.prepare(
      `INSERT INTO tasks (id, title, done, client_id, project_id, due_date, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      t.title,
      t.done ? 1 : 0,
      t.clientId ?? null,
      t.projectId ?? null,
      t.dueDate ?? null,
      t.priority ?? null,
      now,
      now,
    );
    return id;
  },
  markDone(id: string, done = true): void {
    db.prepare('UPDATE tasks SET done = ?, updated_at = ? WHERE id = ?').run(done ? 1 : 0, Date.now(), id);
  },
  remove(id: string): void {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  },
};

/* ============ CRUD: invoices ============ */

export const Invoices = {
  all(): Invoice[] {
    return db.prepare('SELECT * FROM invoices ORDER BY issue_date DESC').all().map(mapInvoice);
  },
  byId(id: string): Invoice | undefined {
    const r = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    return r ? mapInvoice(r as Record<string, unknown>) : undefined;
  },
  byStatus(status: string): Invoice[] {
    return db.prepare('SELECT * FROM invoices WHERE status = ?').all(status).map(mapInvoice);
  },
  overdue(): Invoice[] {
    return db
      .prepare(`SELECT * FROM invoices WHERE status = 'sent' AND due_date < date('now')`)
      .all()
      .map(mapInvoice);
  },
  getWithLines(id: string): (Invoice & { lines: InvoiceLine[] }) | undefined {
    const inv = Invoices.byId(id);
    if (!inv) return undefined;
    const lines = db
      .prepare('SELECT description, qty, rate FROM invoice_lines WHERE invoice_id = ?')
      .all(id)
      .map(mapLine);
    return { ...inv, lines };
  },
  count(): number {
    return (db.prepare('SELECT COUNT(*) AS n FROM invoices').get() as { n: number }).n;
  },
  revenue(): number {
    return (db.prepare(`SELECT COALESCE(SUM(total),0) AS r FROM invoices WHERE status = 'paid'`).get() as { r: number }).r;
  },
  outstanding(): number {
    return (
      db.prepare(`SELECT COALESCE(SUM(total),0) AS r FROM invoices WHERE status = 'sent'`).get() as { r: number }
    ).r;
  },
  insert(inv: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = uuid();
    const now = Date.now();
    const subtotal = inv.lines.reduce((s, l) => s + l.qty * l.rate, 0);
    const tax = inv.tax ?? 0;
    const total = +(subtotal + tax).toFixed(2);
    const insert = db.prepare(
      `INSERT INTO invoices (id, number, client_id, project_id, status, issue_date, due_date, subtotal, tax, total, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertLine = db.prepare(
      'INSERT INTO invoice_lines (id, invoice_id, description, qty, rate) VALUES (?, ?, ?, ?, ?)',
    );
    const tx = db.transaction(() => {
      insert.run(
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
      );
      for (const l of inv.lines) insertLine.run(uuid(), id, l.description, l.qty, l.rate);
    });
    tx();
    return id;
  },
  remove(id: string): void {
    db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
  },
};

/* ============ CRUD: events ============ */

export const Events = {
  all(): CalendarEvent[] {
    return db.prepare('SELECT * FROM events ORDER BY date').all().map((r) => ({
      id: (r as Record<string, unknown>).id as string,
      title: (r as Record<string, unknown>).title as string,
      date: (r as Record<string, unknown>).date as string,
      time: ((r as Record<string, unknown>).time as string) ?? undefined,
      clientId: ((r as Record<string, unknown>).client_id as string) ?? undefined,
      projectId: ((r as Record<string, unknown>).project_id as string) ?? undefined,
    }));
  },
  byDay(date: string): CalendarEvent[] {
    return db.prepare('SELECT * FROM events WHERE date = ?').all(date).map((r) => ({
      id: (r as Record<string, unknown>).id as string,
      title: (r as Record<string, unknown>).title as string,
      date: (r as Record<string, unknown>).date as string,
      time: ((r as Record<string, unknown>).time as string) ?? undefined,
    }));
  },
  insert(e: Omit<CalendarEvent, 'id'>): string {
    const id = uuid();
    db.prepare(
      'INSERT INTO events (id, title, date, time, client_id, project_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, e.title, e.date, e.time ?? null, e.clientId ?? null, e.projectId ?? null, e.notes ?? null);
    return id;
  },
  remove(id: string): void {
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
  },
};

/* ============ Audit ============ */

export const Audit = {
  log(actor: string, action: string, entity: string, entityId: string | null, before?: unknown, after?: unknown): void {
    db.prepare(
      `INSERT INTO audit_log (actor, action, entity, entity_id, before_json, after_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(actor, action, entity, entityId, JSON.stringify(before ?? null), JSON.stringify(after ?? null));
  },
  recent(n = 50): Array<Record<string, unknown>> {
    return db.prepare(`SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?`).all(n) as Array<
      Record<string, unknown>
    >;
  },
  count(): number {
    return (db.prepare('SELECT COUNT(*) AS n FROM audit_log').get() as { n: number }).n;
  },
};

/* ============ Settings ============ */

export const Settings = {
  get(key: string): string | undefined {
    const r = db.prepare('SELECT v FROM settings WHERE k = ?').get(key) as { v: string } | undefined;
    return r?.v;
  },
  set(key: string, value: string): void {
    db.prepare('INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)').run(key, value);
  },
  all(): Record<string, string> {
    return Object.fromEntries(
      (db.prepare('SELECT k, v FROM settings').all() as Array<{ k: string; v: string }>).map((r) => [r.k, r.v]),
    );
  },
};

/* ============ Activity / timelogs ============ */

export const Activity = {
  recent(n = 50) {
    return db.prepare('SELECT * FROM activity ORDER BY ts DESC LIMIT ?').all(n);
  },
  insert(type: string, entity: string, message: string): void {
    db.prepare('INSERT INTO activity (id, type, entity, message, ts) VALUES (?, ?, ?, ?, ?)').run(
      uuid(),
      type,
      entity,
      message,
      Date.now(),
    );
  },
};

export const Timelogs = {
  byProject(projectId: string): TimeLog[] {
    return db
      .prepare('SELECT * FROM timelogs WHERE project_id = ? ORDER BY start_ts DESC')
      .all(projectId)
      .map((r) => ({
        id: (r as Record<string, unknown>).id as string,
        projectId: (r as Record<string, unknown>).project_id as string,
        startTs: (r as Record<string, unknown>).start_ts as number,
        endTs: ((r as Record<string, unknown>).end_ts as number) ?? undefined,
        notes: ((r as Record<string, unknown>).notes as string) ?? undefined,
        billed: ((r as Record<string, unknown>).billed as number) === 1,
      }));
  },
};

/* ============ Quote stub ============ */

export const Quotes = {
  all(): Quote[] {
    return db.prepare('SELECT * FROM quotes').all().map((r) => {
      const o = r as Record<string, unknown>;
      return {
        id: o.id as string,
        number: o.number as string,
        clientId: o.client_id as string,
        projectId: (o.project_id as string) ?? undefined,
        status: o.status as Quote['status'],
        issueDate: o.issue_date as string,
        validUntil: o.valid_until as string,
        total: o.total as number,
        lines: [],
      };
    });
  },
};

/* ============ Note stub ============ */

export const Notes = {
  all(): Note[] {
    return db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all().map((r) => ({
      id: (r as Record<string, unknown>).id as string,
      title: (r as Record<string, unknown>).title as string,
      body: (r as Record<string, unknown>).body as string,
      clientId: ((r as Record<string, unknown>).client_id as string) ?? undefined,
      projectId: ((r as Record<string, unknown>).project_id as string) ?? undefined,
      createdAt: (r as Record<string, unknown>).created_at as number,
      updatedAt: (r as Record<string, unknown>).updated_at as number,
    }));
  },
};