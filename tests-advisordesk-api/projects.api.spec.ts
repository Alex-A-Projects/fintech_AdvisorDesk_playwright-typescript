/** Proposed API contract; these endpoints are not verified on the public demo. */
import { randomUUID } from "node:crypto";
import {
  test,
  expect,
  baseURL,
  token,
  missingId,
  resourcePath,
  jsonResponse,
  expectError,
  deleteAndVerify,
} from "./support/api.fixture";
import type { Project } from "../types";
import { projectData } from "./support/test-data";

test.describe("AdvisorDesk projects — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  for (const [field, value] of [
    ["name", ""],
    ["stage", "invalid-stage"],
    ["value", -1],
  ] as const) {
    test(`invalid project ${field} is rejected atomically`, async ({
      api,
      client,
    }) => {
      const project = await api.create<Project>(
        "projects",
        projectData(client.id),
      );
      await expectError(
        await api.http.patch(resourcePath("projects", project.id), {
          data: { [field]: value },
        }),
        422,
        "VALIDATION_ERROR",
      );
      const saved = await jsonResponse(
        await api.http.get(resourcePath("projects", project.id)),
        200,
      );
      expect(saved.data[field]).toBe(project[field]);
      expect(saved.data.clientId).toBe(client.id);
    });
  }

  test("deleting a project removes it without deleting its client", async ({
    api,
    client,
  }) => {
    const project = await api.create<Project>(
      "projects",
      projectData(client.id),
    );
    await deleteAndVerify(api, "projects", project.id);
    const saved = await jsonResponse(
      await api.http.get(resourcePath("clients", client.id)),
      200,
    );
    expect(saved.data.id).toBe(client.id);
  });

  test("project belongs to its client and a stage change persists", async ({
    api,
    client,
  }) => {
    const project = await api.create<Project>("projects", {
      name: `Portfolio Review ${randomUUID()}`,
      clientId: client.id,
      stage: "lead",
      value: 12500,
    });
    expect(project.clientId).toBe(client.id);
    await jsonResponse(
      await api.http.patch(resourcePath("projects", project.id), {
        data: { stage: "in_progress" },
      }),
      200,
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("projects", project.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      id: project.id,
      clientId: client.id,
      stage: "in_progress",
      value: 12500,
    });
  });

  test("project cannot be reassigned to a nonexistent client", async ({
    api,
    client,
  }) => {
    const project = await api.create<Project>("projects", {
      name: `Reference Check ${randomUUID()}`,
      clientId: client.id,
      stage: "lead",
    });
    await expectError(
      await api.http.patch(resourcePath("projects", project.id), {
        data: { clientId: missingId() },
      }),
      422,
      "VALIDATION_ERROR",
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("projects", project.id)),
      200,
    );
    expect(saved.data.clientId).toBe(client.id);
  });
});
