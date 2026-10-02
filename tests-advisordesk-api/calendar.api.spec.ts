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
import type { CalendarEvent } from "../types";
import { dateInDays, eventData } from "./support/test-data";

test.describe("AdvisorDesk calendar — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  test("rescheduling a meeting preserves its client and title", async ({
    api,
    client,
  }) => {
    const event = await api.create<CalendarEvent>(
      "events",
      eventData(client.id),
    );
    const changes = { date: dateInDays(14), time: "09:15" };
    await jsonResponse(
      await api.http.patch(resourcePath("events", event.id), { data: changes }),
      200,
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("events", event.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      id: event.id,
      title: event.title,
      clientId: client.id,
      ...changes,
    });
  });

  test("impossible calendar dates are rejected without rescheduling the meeting", async ({
    api,
    client,
  }) => {
    const event = await api.create<CalendarEvent>(
      "events",
      eventData(client.id),
    );
    await expectError(
      await api.http.patch(resourcePath("events", event.id), {
        data: { date: "2026-02-30" },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("events", event.id)),
      200,
    );
    expect(saved.data.date).toBe(event.date);
  });

  test("deleted meeting cannot be retrieved", async ({ api, client }) => {
    const event = await api.create<CalendarEvent>(
      "events",
      eventData(client.id),
    );
    await deleteAndVerify(api, "events", event.id);
  });

  test("calendar event retains the meeting date and client", async ({
    api,
    client,
  }) => {
    const input = {
      title: "Annual review",
      date: dateInDays(7),
      time: "14:30",
      clientId: client.id,
    };
    const event = await api.create<CalendarEvent>("events", input);
    const saved = await jsonResponse(
      await api.http.get(resourcePath("events", event.id)),
      200,
    );
    expect(saved.data).toMatchObject({ id: event.id, ...input });
  });
});
