/** Proposed API contract; these endpoints are not verified on the public demo. */
import { randomUUID } from "node:crypto";
import { test, baseURL, token, expectError } from "./support/api.fixture";

test.describe("AdvisorDesk auth — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  for (const resource of [
    "projects",
    "tasks",
    "invoices",
    "quotes",
    "events",
    "notes",
  ]) {
    test(`${resource} rejects unauthenticated access`, async ({
      playwright,
    }) => {
      const anonymous = await playwright.request.newContext({
        baseURL: `${baseURL!.replace(/\/$/, "")}/`,
        maxRedirects: 0,
      });
      try {
        await expectError(await anonymous.get(resource), 401, "UNAUTHORIZED");
      } finally {
        await anonymous.dispose();
      }
    });

    test(`${resource} rejects an invalid bearer token`, async ({ api }) => {
      await expectError(
        await api.http.get(resource, {
          headers: { Authorization: `Bearer invalid-${randomUUID()}` },
        }),
        401,
        "UNAUTHORIZED",
      );
    });
  }

  test("clients reject requests without authentication", async ({
    playwright,
  }) => {
    const anonymous = await playwright.request.newContext({
      baseURL: `${baseURL!.replace(/\/$/, "")}/`,
      maxRedirects: 0,
    });
    try {
      await expectError(await anonymous.get("clients"), 401, "UNAUTHORIZED");
    } finally {
      await anonymous.dispose();
    }
  });

  test("clients reject an invalid bearer token", async ({ api }) => {
    await expectError(
      await api.http.get("clients", {
        headers: { Authorization: `Bearer invalid-${randomUUID()}` },
      }),
      401,
      "UNAUTHORIZED",
    );
  });
});
