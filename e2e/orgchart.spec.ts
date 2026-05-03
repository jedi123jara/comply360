import { test, expect, type APIResponse } from "@playwright/test";

const protectedGetEndpoints = [
  { url: "/api/orgchart", contentType: "application/json" },
  { url: "/api/orgchart/change-log", contentType: "application/json" },
  { url: "/api/orgchart/export-pdf", contentType: "application/pdf" },
  {
    url: "/api/orgchart/rit",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  { url: "/api/orgchart/snapshots", contentType: "application/json" },
];

const protectedPostEndpoints = [
  "/api/orgchart/alerts/monitor",
  "/api/orgchart/assignments",
  "/api/orgchart/compliance-roles",
  "/api/orgchart/diagnose",
  "/api/orgchart/positions",
  "/api/orgchart/snapshots",
  "/api/orgchart/units",
];

function isRedirect(status: number) {
  return status === 307 || status === 308;
}

async function expectProtectedOrDevFallback(
  response: APIResponse,
  expectedContentType?: string,
) {
  const status = response.status();
  expect([200, 401, 403, 307, 308]).toContain(status);

  if (status === 200 && expectedContentType) {
    expect(response.headers()["content-type"]).toContain(expectedContentType);
  }

  if (isRedirect(status)) {
    expect(response.headers().location).toBeTruthy();
  }
}

async function expectRejectedOrInvalid(response: APIResponse) {
  const status = response.status();
  expect([400, 401, 403, 307, 308]).toContain(status);

  if (isRedirect(status)) {
    expect(response.headers().location).toBeTruthy();
  }
}

test.describe("Organigrama module", () => {
  test("dashboard organigrama is protected or available through dev auth fallback", async ({
    request,
  }) => {
    const response = await request.get("/dashboard/organigrama", {
      maxRedirects: 0,
    });

    await expectProtectedOrDevFallback(response, "text/html");
  });

  for (const endpoint of protectedGetEndpoints) {
    test(`GET ${endpoint.url} is protected or wired in dev fallback`, async ({
      request,
    }) => {
      const response = await request.get(endpoint.url, { maxRedirects: 0 });

      await expectProtectedOrDevFallback(response, endpoint.contentType);
    });
  }

  for (const endpoint of protectedPostEndpoints) {
    test(`POST ${endpoint} rejects anonymous or invalid payloads`, async ({
      request,
    }) => {
      const response = await request.post(endpoint, {
        data: {},
        maxRedirects: 0,
      });

      await expectRejectedOrInvalid(response);
    });
  }

  test("orgchart cron rejects missing or invalid token", async ({ request }) => {
    const missingToken = await request.get("/api/cron/orgchart-alerts");
    expect([401, 503]).toContain(missingToken.status());

    const invalidToken = await request.get("/api/cron/orgchart-alerts", {
      headers: {
        Authorization: "Bearer invalid_fake_token_12345",
      },
    });
    expect([401, 503]).toContain(invalidToken.status());
  });
});
