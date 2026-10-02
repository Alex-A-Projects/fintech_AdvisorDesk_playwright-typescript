/** Proposed API contract; these endpoints are not verified on the public demo. */
import { randomUUID } from "node:crypto";
import {
  test,
  expect,
  baseURL,
  token,
  missingId,
  resourcePath,
  uniqueClient,
  jsonResponse,
  expectError,
} from "./support/api.fixture";
import type { Client } from "../types";

test.describe("AdvisorDesk clients — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  test("client optional fields and Unicode text round-trip unchanged", async ({
    api,
  }) => {
    const input = {
      ...uniqueClient(),
      name: `José 李 ${randomUUID()}`,
      phone: "+1-555-0100",
      address: "42 Résumé Street",
      notes: "Review café investment — annual meeting.",
      source: "Referral",
    };
    const client = await api.create<Client>("clients", input);
    const saved = await jsonResponse(
      await api.http.get(resourcePath("clients", client.id)),
      200,
    );
    expect(saved.data).toMatchObject({ id: client.id, ...input });
  });

  test("creating a client with an empty name is rejected", async ({ api }) => {
    const response = await api.post("clients", { ...uniqueClient(), name: "" });
    await expectError(response, 422, "VALIDATION_ERROR");
    expect((await response.json()).error.fields).toHaveProperty("name");
  });

  test("unsupported client status is rejected without changing the record", async ({
    api,
    client,
  }) => {
    await expectError(
      await api.http.patch(resourcePath("clients", client.id), {
        data: { status: "not-a-status" },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("clients", client.id)),
      200,
    );
    expect(saved.data.status).toBe(client.status);
  });

  for (const params of [
    { page: 0, limit: 5 },
    { page: 1, limit: 0 },
  ]) {
    test(`invalid pagination page=${params.page} limit=${params.limit} is rejected`, async ({
      api,
    }) => {
      await expectError(
        await api.http.get("clients", { params }),
        422,
        "VALIDATION_ERROR",
      );
    });
  }

  test("create a client and retrieve the saved record", async ({ api }) => {
    const input = uniqueClient();
    const client = await api.create<Client>("clients", input);
    expect(client).toMatchObject(input);
    const body = await jsonResponse(
      await api.http.get(resourcePath("clients", client.id)),
      200,
    );
    expect(body.data).toMatchObject({ id: client.id, ...input });
  });

  test("client list returns pagination metadata and the requested page size", async ({
    api,
    client,
  }) => {
    const body = await jsonResponse(
      await api.http.get("clients", { params: { page: 1, limit: 5 } }),
      200,
    );
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 5,
      total: expect.any(Number),
    });
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
    for (const row of body.data)
      expect(row).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
      });
  });

  test("client status filter excludes other statuses", async ({ api }) => {
    await api.create<Client>("clients", uniqueClient());
    await api.create<Client>("clients", {
      ...uniqueClient(),
      status: "archived",
    });
    const body = await jsonResponse(
      await api.http.get("clients", {
        params: { status: "active", limit: 100 },
      }),
      200,
    );
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    for (const row of body.data) expect(row.status).toBe("active");
  });

  test("client updates persist and preserve untouched fields", async ({
    api,
    client,
  }) => {
    const body = await jsonResponse(
      await api.http.patch(resourcePath("clients", client.id), {
        data: { name: "Updated QA Client", status: "archived" },
      }),
      200,
    );
    expect(body.data).toMatchObject({
      id: client.id,
      name: "Updated QA Client",
      status: "archived",
      email: client.email,
    });
    const saved = await jsonResponse(
      await api.http.get(resourcePath("clients", client.id)),
      200,
    );
    expect(saved.data).toMatchObject(body.data);
  });

  for (const field of ["name", "email"] as const) {
    test(`invalid client ${field} returns a field-level validation error`, async ({
      api,
      client,
    }) => {
      const response = await api.http.patch(
        resourcePath("clients", client.id),
        {
          data: { [field]: field === "name" ? "" : "not-an-email" },
        },
      );
      await expectError(response, 422, "VALIDATION_ERROR");
      expect((await response.json()).error.fields).toHaveProperty(field);
      const unchanged = await jsonResponse(
        await api.http.get(resourcePath("clients", client.id)),
        200,
      );
      expect(unchanged.data[field]).toBe(client[field]);
    });
  }

  test("deleted client cannot be retrieved", async ({ api, client }) => {
    const response = await api.http.delete(resourcePath("clients", client.id));
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe("");
    await expectError(
      await api.http.get(resourcePath("clients", client.id)),
      404,
      "NOT_FOUND",
    );
  });

  test("unknown client returns a structured not-found error", async ({
    api,
  }) => {
    await expectError(
      await api.http.get(resourcePath("clients", missingId())),
      404,
      "NOT_FOUND",
    );
  });
});
