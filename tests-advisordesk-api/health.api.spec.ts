/** Proposed API contract; these endpoints are not verified on the public demo. */
import {
  test,
  expect,
  baseURL,
  token,
  jsonResponse,
} from "./support/api.fixture";

test.describe("AdvisorDesk health — proposed API @assumed-contract", () => {
  test.skip(
    !baseURL || !token,
    "Set ADVISORDESK_API_BASE_URL and ADVISORDESK_API_TOKEN for a real test backend.",
  );

  test("health endpoint reports ready", async ({ api }) => {
    const body = await jsonResponse(await api.http.get("health"), 200);
    expect(body).toMatchObject({ status: "ok" });
  });
});
