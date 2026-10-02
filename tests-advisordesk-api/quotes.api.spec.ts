/** Proposed API contract; these endpoints are not verified on the public demo. */
import {
  test,
  expect,
  baseURL,
  token,
  resourcePath,
  jsonResponse,
  expectError,
  deleteAndVerify,
} from "./support/api.fixture";
import type { Quote } from "../types";
import { dateInDays, quoteData } from "./support/test-data";

test.describe("AdvisorDesk quotes — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  test("sent quote can be accepted while preserving its total", async ({
    api,
    client,
  }) => {
    const quote = await api.create<Quote>("quotes", {
      ...quoteData(client.id),
      status: "sent",
    });
    expect(quote.status).toBe("sent");
    expect(quote.total).toBe(300);
    await jsonResponse(
      await api.http.patch(resourcePath("quotes", quote.id), {
        data: { status: "accepted" },
      }),
      200,
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("quotes", quote.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      status: "accepted",
      clientId: client.id,
      total: quote.total,
    });
  });

  test("quote line changes recalculate its total", async ({ api, client }) => {
    const quote = await api.create<Quote>("quotes", quoteData(client.id));
    expect(quote.total).toBe(300);
    const lines = [{ description: "Revised planning", qty: 4, rate: 250 }];
    const updated = await jsonResponse(
      await api.http.patch(resourcePath("quotes", quote.id), {
        data: { lines },
      }),
      200,
    );
    expect(updated.data).toMatchObject({ total: 1000, lines });
    const saved = await jsonResponse(
      await api.http.get(resourcePath("quotes", quote.id)),
      200,
    );
    expect(saved.data).toMatchObject({ total: 1000, lines });
  });

  test("quote validity cannot end before the issue date", async ({
    api,
    client,
  }) => {
    const quote = await api.create<Quote>("quotes", quoteData(client.id));
    await expectError(
      await api.http.patch(resourcePath("quotes", quote.id), {
        data: { validUntil: dateInDays(-1) },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("quotes", quote.id)),
      200,
    );
    expect(saved.data.validUntil).toBe(quote.validUntil);
  });

  test("deleted draft quote cannot be retrieved", async ({ api, client }) => {
    const quote = await api.create<Quote>("quotes", quoteData(client.id));
    await deleteAndVerify(api, "quotes", quote.id);
  });

  test("quote creation calculates a total and retains its client", async ({
    api,
    client,
  }) => {
    const quote = await api.create<Quote>("quotes", {
      clientId: client.id,
      status: "draft",
      issueDate: dateInDays(0),
      validUntil: dateInDays(30),
      lines: [{ description: "Planning session", qty: 2, rate: 300 }],
    });
    const saved = await jsonResponse(
      await api.http.get(resourcePath("quotes", quote.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      id: quote.id,
      clientId: client.id,
      status: "draft",
      total: 600,
    });
  });
});
