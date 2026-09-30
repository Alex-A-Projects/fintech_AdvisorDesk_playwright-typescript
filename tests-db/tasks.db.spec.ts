/**
 * DB tests — Tasks table.
 */
import { test, expect } from '@playwright/test';
import { Tasks, Clients, Projects } from '../utils/db/repository';
import { seed } from '../utils/db/seed';

test.beforeAll(() => seed());

test.describe('@db Tasks — CRUD @smoke', () => {
  test('insert and read back', () => {
    const id = Tasks.insert({ title: 'Task 1', priority: 'high' });
    const t = Tasks.byId(id);
    expect(t).toBeTruthy();
    expect(t?.title).toBe('Task 1');
    expect(t?.priority).toBe('high');
  });

  test('markDone toggles done state', () => {
    const id = Tasks.insert({ title: 'Toggle', priority: 'med' });
    expect(Tasks.byId(id)?.done).toBe(false);
    Tasks.markDone(id, true);
    expect(Tasks.byId(id)?.done).toBe(true);
    Tasks.markDone(id, false);
    expect(Tasks.byId(id)?.done).toBe(false);
  });

  test('pending vs completed counts add up', () => {
    const pending = Tasks.pending().length;
    const completed = Tasks.completed().length;
    expect(pending + completed).toBe(Tasks.count());
  });

  test('delete removes the task', () => {
    const id = Tasks.insert({ title: 'Doomed' });
    Tasks.remove(id);
    expect(Tasks.byId(id)).toBeUndefined();
  });

  test('count returns total', () => {
    expect(Tasks.count()).toBeGreaterThan(0);
  });
});

test.describe('@db Tasks — Queries @regression', () => {
  test('overdue tasks have past due dates', () => {
    const overdue = Tasks.overdue();
    const today = new Date().toISOString().slice(0, 10);
    for (const t of overdue) {
      expect(t.dueDate).toBeTruthy();
      expect(t.dueDate! < today).toBe(true);
      expect(t.done).toBe(false);
    }
  });

  test('tasks linked to client', () => {
    const cid = Clients.insert({ name: 'Task-Client', status: 'active' });
    Tasks.insert({ title: 'T1', clientId: cid });
    Tasks.insert({ title: 'T2', clientId: cid });
    const all = Tasks.all();
    const filtered = all.filter((t) => t.clientId === cid);
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  test('tasks linked to project', () => {
    const cid = Clients.insert({ name: 'Task-Proj-Client', status: 'active' });
    const pid = Projects.insert({ clientId: cid, name: 'TProj', stage: 'lead' });
    Tasks.insert({ title: 'T-A', projectId: pid });
    Tasks.insert({ title: 'T-B', projectId: pid });
    const all = Tasks.all();
    const filtered = all.filter((t) => t.projectId === pid);
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  test('priority enum', () => {
    for (const p of ['low', 'med', 'high']) {
      const id = Tasks.insert({ title: `P-${p}`, priority: p as 'low' });
      expect(Tasks.byId(id)?.priority).toBe(p);
    }
  });

  test('task with future due date is not overdue', () => {
    const future = '2099-12-31';
    const id = Tasks.insert({ title: 'Future', dueDate: future });
    expect(Tasks.overdue().find((t) => t.id === id)).toBeUndefined();
  });
});

test.describe('@db Tasks — Bulk @regression', () => {
  test('insert 100 tasks', () => {
    const ids: string[] = [];
    for (let i = 0; i < 100; i++) {
      ids.push(Tasks.insert({ title: `Bulk ${i}` }));
    }
    expect(ids.length).toBe(100);
    for (const id of ids) expect(Tasks.byId(id)).toBeTruthy();
  });

  test('insert 50 tasks and mark half done', () => {
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      ids.push(Tasks.insert({ title: `Bulk-Half-${i}` }));
    }
    for (let i = 0; i < 25; i++) Tasks.markDone(ids[i], true);
    expect(Tasks.completed().length).toBeGreaterThanOrEqual(25);
    expect(Tasks.pending().length).toBeGreaterThanOrEqual(25);
  });
});