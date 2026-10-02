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
import type { Note } from "../types";
import { noteData } from "./support/test-data";

test.describe("AdvisorDesk notes — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  test("Unicode and multiline note content round-trip unchanged", async ({
    api,
    client,
  }) => {
    const input = {
      ...noteData(client.id),
      body: "Résumé — 李\nDiscuss café investments.\nNext steps: review.",
    };
    const note = await api.create<Note>("notes", input);
    const saved = await jsonResponse(
      await api.http.get(resourcePath("notes", note.id)),
      200,
    );
    expect(saved.data).toMatchObject({ id: note.id, ...input });
  });

  test("empty note title is rejected without overwriting the saved note", async ({
    api,
    client,
  }) => {
    const note = await api.create<Note>("notes", noteData(client.id));
    await expectError(
      await api.http.patch(resourcePath("notes", note.id), {
        data: { title: "" },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("notes", note.id)),
      200,
    );
    expect(saved.data).toMatchObject({ title: note.title, body: note.body });
  });

  test("deleted note cannot be retrieved", async ({ api, client }) => {
    const note = await api.create<Note>("notes", noteData(client.id));
    await deleteAndVerify(api, "notes", note.id);
  });

  test("client note edits persist", async ({ api, client }) => {
    const note = await api.create<Note>("notes", {
      title: "Review notes",
      body: "Initial notes",
      clientId: client.id,
    });
    await jsonResponse(
      await api.http.patch(resourcePath("notes", note.id), {
        data: { body: "Follow-up scheduled" },
      }),
      200,
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("notes", note.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      id: note.id,
      clientId: client.id,
      body: "Follow-up scheduled",
    });
  });
});
