/**
 * DB seed — populates the SQLite DB with realistic AdvisorDesk data so DB tests
 * have something to query against.
 */
import { db } from './connection';
import { SCHEMA } from './schema';
import { v4 as uuid } from 'uuid';
import faker from 'faker';

export function reset(): void {
  db.exec(`
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS integrations;
    DROP TABLE IF EXISTS activity;
    DROP TABLE IF EXISTS timelogs;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS invoice_lines;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS quotes;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS clients;
  `);
  db.exec(SCHEMA);
}

export function seed(): { clients: number; projects: number; tasks: number; invoices: number } {
  reset();

  const now = Date.now();
  const clientsCount = 15;
  const projectsCount = 30;
  const tasksCount = 60;
  const invoicesCount = 20;

  const insertClient = db.prepare(`
    INSERT INTO clients (id, name, company, email, phone, status, source, address, notes, aum, risk_profile, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProject = db.prepare(`
    INSERT INTO projects (id, client_id, name, stage, value, start_date, end_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, title, done, client_id, project_id, due_date, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, number, client_id, project_id, status, issue_date, due_date, subtotal, tax, total, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertInvoiceLine = db.prepare(`
    INSERT INTO invoice_lines (id, invoice_id, description, qty, rate)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const clientIds: string[] = [];
    for (let i = 0; i < clientsCount; i++) {
      const id = uuid();
      clientIds.push(id);
      const risk = faker.random.arrayElement(['conservative', 'moderate', 'balanced', 'growth', 'aggressive']);
      const aum = faker.random.number({ min: 50_000, max: 5_000_000 });
      insertClient.run(
        id,
        `Client ${i + 1} ${faker.company.companyName().split(' ')[0]}`,
        faker.company.companyName(),
        faker.internet.email(),
        faker.phone.phoneNumber('+1-555-0###'),
        faker.random.arrayElement(['lead', 'active', 'active', 'active', 'past']),
        faker.random.arrayElement(['Referral', 'Website', 'Social media']),
        faker.address.streetAddress(),
        faker.lorem.sentence(),
        aum,
        risk,
        now - faker.random.number({ min: 0, max: 1_000_000_000 }),
        now,
      );
    }
    const projectIds: string[] = [];
    for (let i = 0; i < projectsCount; i++) {
      const id = uuid();
      projectIds.push(id);
      const clientId = faker.random.arrayElement(clientIds);
      const value = faker.random.number({ min: 1000, max: 100_000 });
      insertProject.run(
        id,
        clientId,
        faker.company.bs(),
        faker.random.arrayElement(['lead', 'in_progress', 'review', 'done']),
        value,
        new Date(now - faker.random.number({ min: 0, max: 90 }) * 86400_000).toISOString().slice(0, 10),
        new Date(now + faker.random.number({ min: 1, max: 90 }) * 86400_000).toISOString().slice(0, 10),
        faker.lorem.sentence(),
        now,
        now,
      );
    }
    for (let i = 0; i < tasksCount; i++) {
      const id = uuid();
      const done = faker.random.arrayElement([0, 0, 0, 1]);
      const clientId = faker.random.arrayElement(clientIds);
      const projectId = faker.random.arrayElement(projectIds);
      insertTask.run(
        id,
        faker.lorem.sentence(4),
        done,
        clientId,
        projectId,
        new Date(now + faker.random.number({ min: -30, max: 30 }) * 86400_000)
          .toISOString()
          .slice(0, 10),
        faker.random.arrayElement(['low', 'med', 'high']),
        now,
        now,
      );
    }
    for (let i = 0; i < invoicesCount; i++) {
      const id = uuid();
      const number = `INV-${(1000 + i).toString()}`;
      const clientId = faker.random.arrayElement(clientIds);
      const status = faker.random.arrayElement(['draft', 'sent', 'paid']);
      const lines = [
        { description: 'Advisory fee', qty: 1, rate: faker.random.number({ min: 250, max: 5000 }) },
        { description: 'Performance report', qty: 1, rate: faker.random.number({ min: 250, max: 1500 }) },
      ];
      const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
      const tax = +(subtotal * 0.0).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      insertInvoice.run(
        id,
        number,
        clientId,
        null,
        status,
        new Date(now - faker.random.number({ min: 0, max: 60 }) * 86400_000)
          .toISOString()
          .slice(0, 10),
        new Date(now + faker.random.number({ min: 1, max: 30 }) * 86400_000)
          .toISOString()
          .slice(0, 10),
        subtotal,
        tax,
        total,
        faker.lorem.sentence(),
        now,
        now,
      );
      for (const ln of lines) {
        insertInvoiceLine.run(uuid(), id, ln.description, ln.qty, ln.rate);
      }
    }
  });
  tx();

  return { clients: clientsCount, projects: projectsCount, tasks: tasksCount, invoices: invoicesCount };
}

// Allow direct CLI execution: `ts-node utils/db/seed.ts`
if (require.main === module) {
  const counts = seed();
  // eslint-disable-next-line no-console
  console.log('Seeded DB:', counts);
}