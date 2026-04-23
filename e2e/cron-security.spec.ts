import { test, expect } from "@playwright/test";

const CRON_ENDPOINTS = [
  "/api/cron/morning-briefing",
  "/api/cron/drip-emails",
  "/api/cron/daily-alerts",
  "/api/cron/weekly-digest",
  "/api/cron/norm-updates",
  "/api/cron/founder-digest",
  "/api/cron/check-trials",
  "/api/cron/risk-sweep",
];

test.describe("Cron Endpoint Security", () => {
  test("GET /api/health returns 200 (server sanity check)", async ({
    request,
  }) => {
    const resp = await request.get("/api/health");
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    expect(body).toHaveProperty("status");
  });

  for (const endpoint of CRON_ENDPOINTS) {
    test(`${endpoint} rejects request without Bearer token`, async ({
      request,
    }) => {
      const resp = await request.get(endpoint);
      // Cron endpoints return 401 (bad/missing token) or 503 (CRON_SECRET not configured)
      expect([401, 503]).toContain(resp.status());
    });

    test(`${endpoint} rejects request with invalid Bearer token`, async ({
      request,
    }) => {
      const resp = await request.get(endpoint, {
        headers: {
          Authorization: "Bearer invalid_fake_token_12345",
        },
      });
      // Should still reject — either 401 (wrong token) or 503 (CRON_SECRET not set)
      expect([401, 503]).toContain(resp.status());
    });
  }
});
