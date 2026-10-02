import { randomUUID } from "node:crypto";

/** Synthetic test data only; dates are relative to avoid stale deadlines. */
export function dateInDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const projectData = (clientId: string) => ({
  name: `QA Project ${randomUUID()}`,
  clientId,
  stage: "lead" as const,
  value: 12500,
});

export const taskData = (clientId: string) => ({
  title: `QA Task ${randomUUID()}`,
  clientId,
  priority: "high" as const,
  done: false,
});

export const invoiceData = (clientId: string) => ({
  clientId,
  status: "draft" as const,
  issueDate: dateInDays(0),
  dueDate: dateInDays(30),
  lines: [{ description: "Advisory fee", qty: 1, rate: 100 }],
});

export const quoteData = (clientId: string) => ({
  clientId,
  status: "draft" as const,
  issueDate: dateInDays(0),
  validUntil: dateInDays(30),
  lines: [{ description: "Planning session", qty: 1, rate: 300 }],
});

export const eventData = (clientId: string) => ({
  title: `QA Meeting ${randomUUID()}`,
  date: dateInDays(7),
  time: "14:30",
  clientId,
});

export const noteData = (clientId: string) => ({
  title: `QA Note ${randomUUID()}`,
  body: "Initial notes",
  clientId,
});
