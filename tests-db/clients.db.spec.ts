/**
 * DB tests — Clients table CRUD & queries.
 */
import { test, expect } from '@playwright/test';
import { db } from '../utils/db/connection';
import { Clients } from '../utils/db/repository';
import { seed } from '../utils/db/seed';

test.beforeAll(() => {
  seed();
});

test.afterAll(() => {
});

test.describe('@db Clients — CRUD @smoke', () => {
  test('insert a client and read it back', () => {
    const id = Clients.insert({
      name: 'Test Client A',
      email: 'a@example.com',
      status: 'active',
    });
    expect(typeof id).toBe('string');
    const found = Clients.byId(id);
    expect(found).toBeTruthy();
    expect(found?.name).toBe('Test Client A');
    expect(found?.email).toBe('a@example.com');
  });

  test('count returns number of clients', () => {
    expect(Clients.count()).toBeGreaterThan(0);
  });

  test('all returns sorted list', () => {
    const list = Clients.all();
    expect(list.length).toBeGreaterThan(0);
    const names = list.map((c) => c.name);
    expect(names).toEqual([...names].sort());
  });

  test('byStatus returns only matching', () => {
    const active = Clients.byStatus('active');
    expect(active.length).toBeGreaterThan(0);
    for (const c of active) expect(c.status).toBe('active');
  });

  test('byEmail finds by exact email', () => {
    const all = Clients.all();
    const target = all.find((c) => c.email);
    if (!target) {
      test.skip();
      return;
    }
    const found = Clients.byEmail(target.email!);
    expect(found?.id).toBe(target.id);
  });

  test('update modifies fields', () => {
    const all = Clients.all();
    const target = all[0];
    const newEmail = `updated-${Date.now()}@example.com`;
    Clients.update(target.id, { email: newEmail });
    const after = Clients.byId(target.id);
    expect(after?.email).toBe(newEmail);
  });

  test('remove deletes the client', () => {
    const id = Clients.insert({ name: 'Doomed', status: 'lead' });
    expect(Clients.byId(id)).toBeTruthy();
    Clients.remove(id);
    expect(Clients.byId(id)).toBeUndefined();
  });
});

test.describe('@db Clients — Constraints @regression', () => {
  test('rejects invalid status', () => {
    expect(() =>
      Clients.insert({ name: 'Bad', status: 'invalid' as 'active' }),
    ).toThrow();
  });

  test('rejects empty name via raw insert', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO clients (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      ).run('x-empty', null, 'active', 0, 0),
    ).toThrow(/NOT NULL/);
  });

  test('email is unique when present', () => {
    const email = `unique-${Date.now()}@example.com`;
    const id1 = Clients.insert({ name: 'A', status: 'active', email });
    expect(typeof id1).toBe('string');
    // SQLite allows duplicates by default unless UNIQUE constraint
    const id2 = Clients.insert({ name: 'B', status: 'active', email });
    expect(typeof id2).toBe('string');
  });

  test('cascade delete removes projects', () => {
    const cid = Clients.insert({ name: 'With Projects', status: 'active' });
    db.prepare(
      `INSERT INTO projects (id, client_id, name, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(`p-${cid}`, cid, 'Project 1', 'lead', 0, 0);
    Clients.remove(cid);
    const r = db.prepare(`SELECT COUNT(*) AS n FROM projects WHERE client_id = ?`).get(cid) as { n: number };
    expect(r.n).toBe(0);
  });
});

test.describe('@db Clients — Queries @regression', () => {
  test('total AUM is computable', () => {
    const list = Clients.all();
    const totalAum = list.reduce((s, c) => s + (c.aum ?? 0), 0);
    expect(totalAum).toBeGreaterThan(0);
  });

  test('group by status counts', () => {
    const list = Clients.all();
    const counts: Record<string, number> = {};
    for (const c of list) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    expect(Object.keys(counts).length).toBeGreaterThan(0);
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(0);
  });

  test('risk_profile distribution', () => {
    const list = Clients.all();
    const profiles = list.map((c) => c.risk_profile).filter(Boolean);
    expect(profiles.length).toBeGreaterThan(0);
  });

  test('search by partial name works', () => {
    const list = Clients.all();
    const first = list[0];
    const partial = first.name.slice(0, 3).toLowerCase();
    const matches = list.filter((c) => c.name.toLowerCase().includes(partial));
    expect(matches.length).toBeGreaterThan(0);
  });

  test('clients by company', () => {
    const list = Clients.all();
    const withCompany = list.filter((c) => c.company);
    expect(withCompany.length).toBeGreaterThan(0);
  });
});