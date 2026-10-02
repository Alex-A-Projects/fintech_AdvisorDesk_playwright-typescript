/** Proposed API contract; these endpoints are not verified on the public demo. */
import {
  test,
  expect,
  baseURL,
  token,
  resourcePath,
  jsonResponse,
  expectError,
} from "./support/api.fixture";
import type { Invoice } from "../types";
import { dateInDays, invoiceData } from "./support/test-data";

test.describe("AdvisorDesk invoices — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  test("decimal invoice rates produce a two-decimal monetary total", async ({
    api,
    client,
  }) => {
    const invoice = await api.create<Invoice>("invoices", {
      ...invoiceData(client.id),
      lines: [
        { description: "Advisory sessions", qty: 3, rate: 19.99 },
        { description: "Report", qty: 1, rate: 0.1 },
      ],
    });
    expect(invoice).toMatchObject({ subtotal: 60.07, tax: 0, total: 60.07 });
    const saved = await jsonResponse(
      await api.http.get(resourcePath("invoices", invoice.id)),
      200,
    );
    expect(saved.data.total).toBe(60.07);
  });

  test("replacing invoice lines recalculates and persists the total", async ({
    api,
    client,
  }) => {
    const invoice = await api.create<Invoice>(
      "invoices",
      invoiceData(client.id),
    );
    expect(invoice.total).toBe(100);
    const lines = [{ description: "Updated fee", qty: 3, rate: 125 }];
    const updated = await jsonResponse(
      await api.http.patch(resourcePath("invoices", invoice.id), {
        data: { lines },
      }),
      200,
    );
    expect(updated.data).toMatchObject({
      subtotal: 375,
      tax: 0,
      total: 375,
      lines,
    });
    const saved = await jsonResponse(
      await api.http.get(resourcePath("invoices", invoice.id)),
      200,
    );
    expect(saved.data).toMatchObject({ total: 375, lines });
  });

  test("negative invoice rates are rejected without modifying saved lines", async ({
    api,
    client,
  }) => {
    const invoice = await api.create<Invoice>(
      "invoices",
      invoiceData(client.id),
    );
    await expectError(
      await api.http.patch(resourcePath("invoices", invoice.id), {
        data: { lines: [{ description: "Invalid rate", qty: 1, rate: -100 }] },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("invoices", invoice.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      lines: invoice.lines,
      total: invoice.total,
    });
  });

  test("invoice due date cannot precede its issue date", async ({
    api,
    client,
  }) => {
    const invoice = await api.create<Invoice>(
      "invoices",
      invoiceData(client.id),
    );
    await expectError(
      await api.http.patch(resourcePath("invoices", invoice.id), {
        data: { dueDate: dateInDays(-1) },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("invoices", invoice.id)),
      200,
    );
    expect(saved.data.dueDate).toBe(invoice.dueDate);
  });

  test("invoice totals are calculated from line items", async ({
    api,
    client,
  }) => {
    const invoice = await api.create<Invoice>("invoices", {
      clientId: client.id,
      status: "draft",
      issueDate: dateInDays(0),
      dueDate: dateInDays(30),
      lines: [
        { description: "Advisory fee", qty: 2, rate: 1250 },
        { description: "Report", qty: 1, rate: 750 },
      ],
    });
    expect(invoice).toMatchObject({
      clientId: client.id,
      status: "draft",
      subtotal: 3250,
      tax: 0,
      total: 3250,
    });
    expect(invoice.number).toEqual(expect.any(String));
    expect(invoice.number.length).toBeGreaterThan(0);
    const saved = await jsonResponse(
      await api.http.get(resourcePath("invoices", invoice.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      id: invoice.id,
      total: 3250,
      lines: invoice.lines,
    });
  });

  test("negative invoice quantities are rejected without changing the total", async ({
    api,
    client,
  }) => {
    const invoice = await api.create<Invoice>("invoices", {
      clientId: client.id,
      status: "draft",
      issueDate: dateInDays(0),
      dueDate: dateInDays(30),
      lines: [{ description: "Advisory fee", qty: 1, rate: 100 }],
    });
    await expectError(
      await api.http.patch(resourcePath("invoices", invoice.id), {
        data: { lines: [{ description: "Invalid fee", qty: -1, rate: 100 }] },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("invoices", invoice.id)),
      200,
    );
    expect(saved.data).toMatchObject({ total: 100, lines: invoice.lines });
  });
});
