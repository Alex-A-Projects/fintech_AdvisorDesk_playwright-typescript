/** Proposed API contract; these endpoints are not verified on the public demo. */
import { randomUUID } from "node:crypto";
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
import type { Project, Task } from "../types";
import { taskData } from "./support/test-data";

test.describe("AdvisorDesk tasks — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  for (const [field, value] of [
    ["title", ""],
    ["priority", "urgent"],
  ] as const) {
    test(`invalid task ${field} is rejected atomically`, async ({
      api,
      client,
    }) => {
      const task = await api.create<Task>("tasks", taskData(client.id));
      await expectError(
        await api.http.patch(resourcePath("tasks", task.id), {
          data: { [field]: value },
        }),
        422,
        "VALIDATION_ERROR",
      );
      const saved = await jsonResponse(
        await api.http.get(resourcePath("tasks", task.id)),
        200,
      );
      expect(saved.data[field]).toBe(task[field]);
    });
  }

  test("completed task can be reopened without losing its title", async ({
    api,
    client,
  }) => {
    const task = await api.create<Task>("tasks", {
      ...taskData(client.id),
      done: true,
    });
    expect(task.done).toBe(true);
    await jsonResponse(
      await api.http.patch(resourcePath("tasks", task.id), {
        data: { done: false },
      }),
      200,
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("tasks", task.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      id: task.id,
      title: task.title,
      done: false,
      clientId: client.id,
    });
  });

  test("deleted task cannot be retrieved", async ({ api, client }) => {
    const task = await api.create<Task>("tasks", taskData(client.id));
    await deleteAndVerify(api, "tasks", task.id);
  });

  test("task completion persists on the correct project", async ({
    api,
    client,
  }) => {
    const project = await api.create<Project>("projects", {
      name: `Task Project ${randomUUID()}`,
      clientId: client.id,
      stage: "in_progress",
    });
    const task = await api.create<Task>("tasks", {
      title: "Send portfolio review",
      clientId: client.id,
      projectId: project.id,
      priority: "high",
      done: false,
    });
    expect(task.done).toBe(false);
    await jsonResponse(
      await api.http.patch(resourcePath("tasks", task.id), {
        data: { done: true },
      }),
      200,
    );
    const saved = await jsonResponse(
      await api.http.get(resourcePath("tasks", task.id)),
      200,
    );
    expect(saved.data).toMatchObject({
      id: task.id,
      projectId: project.id,
      clientId: client.id,
      done: true,
    });
  });
});
