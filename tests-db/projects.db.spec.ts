/**
 * DB tests — Projects table.
 */
import { test, expect } from '@playwright/test';
import { Projects, Clients } from '../utils/db/repository';
import { seed } from '../utils/db/seed';

test.beforeAll(() => seed());

test.describe('@db Projects — CRUD @smoke', () => {
  test('insert and read back', () => {
    const cid = Clients.insert({ name: 'P-Client', status: 'active' });
    const pid = Projects.insert({
      clientId: cid,
      name: 'Test Project',
      stage: 'lead',
      value: 5000,
    });
    const p = Projects.byId(pid);
    expect(p).toBeTruthy();
    expect(p?.name).toBe('Test Project');
    expect(p?.value).toBe(5000);
  });

  test('byClient returns only that client\'s projects', () => {
    const cid = Clients.insert({ name: 'P-Cascade', status: 'active' });
    Projects.insert({ clientId: cid, name: 'A', stage: 'lead' });
    Projects.insert({ clientId: cid, name: 'B', stage: 'in_progress' });
    const list = Projects.byClient(cid);
    expect(list.length).toBe(2);
  });

  test('byStage filters correctly', () => {
    const cid = Clients.insert({ name: 'Stage-Filter-Client', status: 'active' });
    Projects.insert({ clientId: cid, name: 'X', stage: 'review' });
    const review = Projects.byStage('review');
    expect(review.length).toBeGreaterThan(0);
  });

  test('total project value', () => {
    const all = Projects.all();
    const total = all.reduce((s, p) => s + (p.value ?? 0), 0);
    expect(total).toBeGreaterThan(0);
  });

  test('count > 0 after seed', () => {
    expect(Projects.count()).toBeGreaterThan(0);
  });

  test('delete removes project', () => {
    const cid = Clients.insert({ name: 'To Delete', status: 'active' });
    const pid = Projects.insert({ clientId: cid, name: 'Del', stage: 'lead' });
    Projects.remove(pid);
    expect(Projects.byId(pid)).toBeUndefined();
  });
});

test.describe('@db Projects — Stage transitions @regression', () => {
  for (const stage of ['lead', 'in_progress', 'review', 'done']) {
    test(`stage "${stage}" accepts inserts`, () => {
      const cid = Clients.insert({ name: `Stage-${stage}`, status: 'active' });
      const pid = Projects.insert({
        clientId: cid,
        name: `S-${stage}`,
        stage: stage as 'lead',
      });
      const p = Projects.byId(pid);
      expect(p?.stage).toBe(stage);
    });
  }

  test('invalid stage is rejected', () => {
    const cid = Clients.insert({ name: 'Bad', status: 'active' });
    expect(() =>
      Projects.insert({
        clientId: cid,
        name: 'Bad',
        stage: 'invalid' as 'lead',
      }),
    ).toThrow();
  });

  test('total value of done projects is computable', () => {
    const done = Projects.byStage('done');
    const total = done.reduce((s, p) => s + (p.value ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(0);
  });
});

test.describe('@db Projects — Date ranges @regression', () => {
  test('projects have start_date and end_date', () => {
    const cid = Clients.insert({ name: 'Dates', status: 'active' });
    const pid = Projects.insert({
      clientId: cid,
      name: 'Dated',
      stage: 'in_progress',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const p = Projects.byId(pid);
    expect(p?.startDate).toBe('2026-01-01');
    expect(p?.endDate).toBe('2026-12-31');
  });

  test('overlapping project ranges', () => {
    const cid = Clients.insert({ name: 'Overlap', status: 'active' });
    Projects.insert({
      clientId: cid,
      name: 'A',
      stage: 'in_progress',
      startDate: '2026-01-01',
      endDate: '2026-06-01',
    });
    Projects.insert({
      clientId: cid,
      name: 'B',
      stage: 'in_progress',
      startDate: '2026-03-01',
      endDate: '2026-09-01',
    });
    const all = Projects.byClient(cid);
    expect(all.length).toBe(2);
  });
});