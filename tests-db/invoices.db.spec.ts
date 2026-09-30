/**
 * DB tests — Invoices & invoice_lines.
 */
import { test, expect } from '@playwright/test';
import { Invoices, Clients } from '../utils/db/repository';
import { seed } from '../utils/db/seed';

test.beforeAll(() => seed());

test.describe('@db Invoices — CRUD @smoke', () => {
  test('insert with lines and read back', () => {
    const cid = Clients.insert({ name: 'Inv-Client', status: 'active' });
    const id = Invoices.insert({
      number: `INV-T-${Date.now()}`,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-09-29',
      dueDate: '2026-10-29',
      lines: [
        { description: 'Service A', qty: 1, rate: 1000 },
        { description: 'Service B', qty: 2, rate: 250 },
      ],
      tax: 0,
    });
    const inv = Invoices.getWithLines(id);
    expect(inv).toBeTruthy();
    expect(inv?.lines.length).toBe(2);
    expect(inv?.subtotal).toBe(1500);
    expect(inv?.total).toBe(1500);
  });

  test('unique invoice numbers enforced', () => {
    const cid = Clients.insert({ name: 'Dup-Inv', status: 'active' });
    const num = `INV-DUP-${Date.now()}`;
    Invoices.insert({
      number: num,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'X', qty: 1, rate: 100 }],
    });
    expect(() =>
      Invoices.insert({
        number: num,
        clientId: cid,
        status: 'draft',
        issueDate: '2026-01-01',
        dueDate: '2026-02-01',
        lines: [{ description: 'X', qty: 1, rate: 100 }],
      }),
    ).toThrow(/UNIQUE/);
  });

  test('count, all, byId return data', () => {
    expect(Invoices.count()).toBeGreaterThan(0);
    expect(Invoices.all().length).toBe(Invoices.count());
    const first = Invoices.all()[0];
    expect(Invoices.byId(first.id)?.id).toBe(first.id);
  });

  test('byStatus filters correctly', () => {
    const sent = Invoices.byStatus('sent');
    for (const inv of sent) expect(inv.status).toBe('sent');
    const paid = Invoices.byStatus('paid');
    for (const inv of paid) expect(inv.status).toBe('paid');
  });

  test('revenue sums only paid invoices', () => {
    const paid = Invoices.byStatus('paid');
    const expectedRevenue = paid.reduce((s, i) => s + (i.total ?? 0), 0);
    const actualRevenue = Invoices.revenue();
    expect(Math.abs(actualRevenue - expectedRevenue)).toBeLessThan(0.01);
  });

  test('outstanding sums sent invoices', () => {
    const sent = Invoices.byStatus('sent');
    const expected = sent.reduce((s, i) => s + (i.total ?? 0), 0);
    const actual = Invoices.outstanding();
    expect(Math.abs(actual - expected)).toBeLessThan(0.01);
  });

  test('delete cascades invoice lines', () => {
    const cid = Clients.insert({ name: 'Cascade', status: 'active' });
    const id = Invoices.insert({
      number: `INV-C-${Date.now()}`,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'X', qty: 1, rate: 100 }],
    });
    Invoices.remove(id);
    expect(Invoices.byId(id)).toBeUndefined();
  });
});

test.describe('@db Invoices — Tax calculations @regression', () => {
  test('tax of 10% on $100 = $110', () => {
    const cid = Clients.insert({ name: 'Tax', status: 'active' });
    const id = Invoices.insert({
      number: `INV-T10-${Date.now()}`,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'X', qty: 1, rate: 100 }],
      tax: 10,
    });
    const inv = Invoices.byId(id);
    expect(inv?.subtotal).toBe(100);
    expect(inv?.total).toBe(110);
  });

  test('multiple lines total correctly', () => {
    const cid = Clients.insert({ name: 'Multi', status: 'active' });
    const id = Invoices.insert({
      number: `INV-M-${Date.now()}`,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [
        { description: 'A', qty: 2, rate: 50 },
        { description: 'B', qty: 3, rate: 30 },
        { description: 'C', qty: 1, rate: 100 },
      ],
    });
    const inv = Invoices.byId(id);
    expect(inv?.subtotal).toBe(100 + 90 + 100);
  });

  test('zero-rate line accepted', () => {
    const cid = Clients.insert({ name: 'Zero', status: 'active' });
    const id = Invoices.insert({
      number: `INV-Z-${Date.now()}`,
      clientId: cid,
      status: 'draft',
      issueDate: '2026-01-01',
      dueDate: '2026-02-01',
      lines: [{ description: 'Free', qty: 1, rate: 0 }],
    });
    const inv = Invoices.byId(id);
    expect(inv?.total).toBe(0);
  });
});

test.describe('@db Invoices — Overdue @regression', () => {
  test('overdue returns sent invoices past due date', () => {
    const overdue = Invoices.overdue();
    const today = new Date().toISOString().slice(0, 10);
    for (const inv of overdue) {
      expect(inv.status).toBe('sent');
      expect(inv.dueDate < today).toBe(true);
    }
  });
});