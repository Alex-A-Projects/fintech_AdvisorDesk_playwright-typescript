/**
 * PROPOSED AdvisorDesk backend contract — endpoints have NOT been discovered
 * on the public demo. Domain fields come from ../../types; HTTP routes, auth,
 * response envelopes and business rules below are assumptions.
 *
 * Run against a disposable test backend implementing this contract:
 *   ADVISORDESK_API_BASE_URL=http://localhost:3000/api/v1/
 *   ADVISORDESK_API_TOKEN=<test-user bearer token>
 *   npm run test:api:website
 *
 * Without both variables, tests are explicitly skipped. With them, missing
 * endpoints and contract mismatches FAIL. Never use the Shopify HTML URL.
 * Tests create unique records and delete them in reverse dependency order.
 */
import { randomUUID } from "node:crypto";
import {
  test as base,
  expect,
  APIRequestContext,
  APIResponse,
} from "@playwright/test";
import type { Client } from "../../types";

export const baseURL = process.env.ADVISORDESK_API_BASE_URL?.trim();
export const token = process.env.ADVISORDESK_API_TOKEN?.trim();
export const missingId = () => randomUUID();
export const resourcePath = (resource: string, id: string) =>
  `${resource}/${encodeURIComponent(id)}`;
export const uniqueClient = () => ({
  name: `API Test ${randomUUID()}`,
  email: `qa-${randomUUID()}@example.com`,
  company: "AdvisorDesk QA",
  status: "active" as const,
});

type Resource =
  "clients" | "projects" | "tasks" | "invoices" | "quotes" | "events" | "notes";
type RecordWithId = { id: string };
type ApiFixture = {
  http: APIRequestContext;
  post(resource: Resource, data: Record<string, unknown>): Promise<APIResponse>;
  create<T extends RecordWithId>(
    resource: Resource,
    data: Record<string, unknown>,
  ): Promise<T>;
};

export async function jsonResponse(
  response: APIResponse,
  expectedStatus: number,
) {
  expect(response.status(), `${response.url()} status`).toBe(expectedStatus);
  expect(response.headers()["content-type"]).toContain("application/json");
  return response.json();
}

export async function expectError(
  response: APIResponse,
  status: number,
  code: string,
) {
  const body = await jsonResponse(response, status);
  expect(body).toMatchObject({ error: { code, message: expect.any(String) } });
  expect(body.error.message.trim().length).toBeGreaterThan(0);
}

export async function deleteAndVerify(
  api: ApiFixture,
  resource: Resource,
  id: string,
) {
  const response = await api.http.delete(resourcePath(resource, id));
  expect(response.status()).toBe(204);
  expect(await response.text()).toBe("");
  await expectError(
    await api.http.get(resourcePath(resource, id)),
    404,
    "NOT_FOUND",
  );
}

export const test = base.extend<{ api: ApiFixture; client: Client }>({
  api: async ({ playwright }, use) => {
    const url = new URL(baseURL!);
    if (!["http:", "https:"].includes(url.protocol) || url.search || url.hash) {
      throw new Error(
        "ADVISORDESK_API_BASE_URL must be an HTTP(S) API root without a query or hash.",
      );
    }
    url.pathname = `${url.pathname.replace(/\/$/, "")}/`;
    const http = await playwright.request.newContext({
      baseURL: url.href,
      extraHTTPHeaders: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 10_000,
      maxRedirects: 0,
    });
    const created: Array<{ resource: Resource; id: string }> = [];
    // Also track unexpected successes from negative POST tests for cleanup.
    const post = async (
      resource: Resource,
      data: Record<string, unknown>,
    ): Promise<APIResponse> => {
      const response = await http.post(resource, { data });
      if (response.ok()) {
        const body = await response.json();
        if (typeof body.data?.id === "string" && body.data.id)
          created.push({ resource, id: body.data.id });
      }
      return response;
    };
    try {
      await use({
        http,
        post,
        async create<T extends RecordWithId>(
          resource: Resource,
          data: Record<string, unknown>,
        ): Promise<T> {
          const response = await post(resource, data);
          // Track a returned ID before assertions, so a wrong success status
          // or malformed payload does not prevent cleanup of a known record.
          const body = await response.json();
          await jsonResponse(response, 201);
          expect(body.data).toMatchObject({ id: expect.any(String) });
          expect(body.data.id.length).toBeGreaterThan(0);
          expect(body.data).toMatchObject(data);
          return body.data as T;
        },
      });
    } finally {
      const failures: string[] = [];
      for (const item of created.reverse()) {
        try {
          const response = await http.delete(
            resourcePath(item.resource, item.id),
          );
          if (![204, 404].includes(response.status()))
            failures.push(`${item.resource}/${item.id}: ${response.status()}`);
        } catch {
          failures.push(`${item.resource}/${item.id}: cleanup request failed`);
        }
      }
      await http.dispose();
      expect(failures, "Cleanup of records created by this test").toEqual([]);
    }
  },
  client: async ({ api }, use) => {
    await use(await api.create<Client>("clients", uniqueClient()));
  },
});

export { expect };
