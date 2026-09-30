/**
 * Faker wrapper for deterministic-looking, unique test data.
 * Uses the lightweight `faker` package — pure JS, no native deps.
 */
import faker from 'faker';

faker.seed(424242);

export const td = {
  client: (overrides = {}) => ({
    name: faker.company.companyName(),
    email: faker.internet.email(),
    phone: faker.phone.phoneNumber('+1-555-0###'),
    company: faker.company.companyName(),
    address: `${faker.address.streetAddress()}, ${faker.address.city()}`,
    status: 'active' as const,
    source: faker.random.arrayElement(['Referral', 'Website', 'Social media', 'Google']),
    notes: faker.lorem.sentence(),
    ...overrides,
  }),

  project: (overrides = {}) => ({
    name: `${faker.company.bs()} engagement`,
    value: faker.random.number({ min: 1000, max: 100000 }),
    // The financial-advisor edition uses these stage IDs in App.cfg.projectStages.
    stage: faker.random.arrayElement([
      'discovery',
      'proposal',
      'onboarding',
      'active',
      'complete',
    ]),
    ...overrides,
  }),

  task: (overrides = {}) => ({
    title: faker.lorem.sentence(4),
    priority: faker.random.arrayElement(['low', 'med', 'high']) as 'low' | 'med' | 'high',
    ...overrides,
  }),

  invoice: (overrides = {}) => ({
    status: 'draft' as const,
    issueDate: faker.date.recent(30).toISOString().slice(0, 10),
    dueDate: faker.date.soon(30).toISOString().slice(0, 10),
    lines: [
      {
        description: 'Advisory fee',
        qty: 1,
        rate: faker.random.number({ min: 100, max: 5000 }),
      },
    ],
    ...overrides,
  }),

  event: (overrides = {}) => ({
    title: faker.lorem.words(3).join(' '),
    date: faker.date.soon(14).toISOString().slice(0, 10),
    time: '10:00',
    ...overrides,
  }),

  note: (overrides = {}) => ({
    title: faker.lorem.words(4).join(' '),
    body: faker.lorem.paragraph(),
    ...overrides,
  }),

  user: () => ({
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
  }),
};