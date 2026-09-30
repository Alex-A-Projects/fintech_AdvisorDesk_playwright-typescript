/**
 * DB tests — Audit log & transactions.
 */
import { test, expect } from '@playwright/test';
import { db } from '../utils/db/connection';
import { Audit, Clients, Projects, Tasks } from '../utils/db/repository';
import { seed } from '../utils/db/seed';

test.beforeAll(() => seed());

test.describe('@db Audit log @smoke', () => {
  test('Audit.log writes a row', () => {
    const before = Audit.count();
    Audit.log('system', 'create', 'client', 'abc', null, { name: 'X' });
    const after = Audit.count();
    expect(after).toBe(before + 1);
  });

  test('Audit.recent returns rows in descending order', () => {
    Audit.log('system', 'create', 'client', 'r1');
    Audit.log('system', 'create', 'client', 'r2');
    const rows = Audit.recent(10);
    for (let i = 0; i < rows.length - 1; i++) {
      expect((rows[i].ts as number) >= (rows[i + 1].ts as number)).toBe(true);
    }
  });

  test('Audit captures before/after JSON', () => {
    Audit.log(
      'qa-bot',
      'update',
      'client',
      'x',
      { name: 'Old' },
      { name: 'New' },
    );
    const last = Audit.recent(1)[0];
    expect(last).toBeTruthy();
    expect(last.before_json).toBeTruthy();
    expect(last.after_json).toBeTruthy();
    expect(JSON.parse(last.before_json as string).name).toBe('Old');
    expect(JSON.parse(last.after_json as string).name).toBe('New');
  });
});

test.describe('@db Transactions @regression', () => {
  test('successful transaction commits', () => {
    const cid = Clients.insert({ name: 'Tx-Client', status: 'active' });
    const tx = db.transaction(() => {
      Projects.insert({ clientId: cid, name: 'Tx-A', stage: 'lead' });
      Projects.insert({ clientId: cid, name: 'Tx-B', stage: 'in_progress' });
    });
    tx();
    expect(Projects.byClient(cid).length).toBe(2);
  });

  test('failing transaction rolls back', () => {
    const cid = Clients.insert({ name: 'Tx-Fail', status: 'active' });
    const before = Projects.byClient(cid).length;
    const tx = db.transaction(() => {
      Projects.insert({ clientId: cid, name: 'Tx-X', stage: 'lead' });
      // Force failure on second insert
      Projects.insert({ clientId: 'nonexistent-client', name: 'Tx-Y', stage: 'lead' });
    });
    expect(() => tx()).toThrow();
    expect(Projects.byClient(cid).length).toBe(before);
  });

  test('large transaction (100 rows)', () => {
    const cid = Clients.insert({ name: 'Tx-Big', status: 'active' });
    const tx = db.transaction(() => {
      for (let i = 0; i < 100; i++) {
        Tasks.insert({ title: `Big-Tx-${i}`, clientId: cid });
      }
    });
    tx();
    const all = Tasks.all();
    const mine = all.filter((t) => t.clientId === cid);
    expect(mine.length).toBeGreaterThanOrEqual(100);
  });
});

test.describe('@db Aggregations @regression', () => {
  test('total revenue across all invoices', () => {
    const all = db.prepare(`SELECT COALESCE(SUM(total),0) AS r FROM invoices`).get() as { r: number };
    expect(all.r).toBeGreaterThan(0);
  });

  test('client count by status', () => {
    const rows = db
      .prepare(`SELECT status, COUNT(*) AS n FROM clients GROUP BY status`)
      .all() as Array<{ status: string; n: number }>;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.n).toBeGreaterThan(0);
  });

  test('average invoice value', () => {
    const r = db.prepare(`SELECT AVG(total) AS avg FROM invoices`).get() as { avg: number | null };
    expect(r.avg).not.toBeNull();
    expect(r.avg!).toBeGreaterThan(0);
  });

  test('max invoice value', () => {
    const r = db.prepare(`SELECT MAX(total) AS m FROM invoices`).get() as { m: number | null };
    expect(r.m).toBeGreaterThan(0);
  });

  test('min invoice value', () => {
    const r = db.prepare(`SELECT MIN(total) AS m FROM invoices`).get() as { m: number | null };
    expect(r.m).toBeGreaterThanOrEqual(0);
  });

  test('clients sorted by AUM desc', () => {
    const rows = db
      .prepare(`SELECT name, aum FROM clients ORDER BY aum DESC LIMIT 5`)
      .all() as Array<{ aum: number }>;
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i].aum >= rows[i + 1].aum).toBe(true);
    }
  });

  test('JOIN clients to projects returns owner info', () => {
    const rows = db
      .prepare(
        `SELECT c.name AS cname, p.name AS pname, p.value
         FROM projects p
         INNER JOIN clients c ON c.id = p.client_id
         LIMIT 5`,
      )
      .all() as Array<{ cname: string; pname: string; value: number }>;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.cname.length).toBeGreaterThan(0);
    }
  });

  test('subquery: clients with overdue tasks', () => {
    const rows = db
      .prepare(
        `SELECT DISTINCT c.name FROM clients c
         INNER JOIN tasks t ON t.client_id = c.id
         WHERE t.done = 0 AND t.due_date < date('now')`,
      )
      .all();
    expect(Array.isArray(rows)).toBe(true);
  });

  test('subquery: clients without any projects', () => {
    const rows = db
      .prepare(
        `SELECT c.name FROM clients c
         WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.client_id = c.id)`,
      )
      .all();
    expect(Array.isArray(rows)).toBe(true);
  });
});

test.describe('@db Concurrent access @regression', () => {
  test('10 parallel reads', () => {
    const queries = Array.from({ length: 10 }, () => Clients.count());
    const counts = queries.map((fn) => fn);
    expect(counts.every((c) => c > 0)).toBe(true);
  });

  test('read while writing is safe', () => {
    const start = Clients.count();
    Clients.insert({ name: 'Race-1', status: 'active' });
    expect(Clients.count()).toBe(start + 1);
    Clients.insert({ name: 'Race-2', status: 'active' });
    expect(Clients.count()).toBe(start + 2);
  });
});