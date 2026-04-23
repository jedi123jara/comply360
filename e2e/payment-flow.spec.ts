import { test, expect } from "@playwright/test";

test.describe("Payment Flow — Auth Boundaries", () => {
  test("/dashboard/planes redirects to sign-in for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/dashboard/planes");
    // Clerk middleware should redirect unauthenticated users to sign-in
    await page.waitForURL(/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("sign-in");
  });

  test("POST /api/payments/checkout without auth is rejected", async ({
    request,
  }) => {
    const resp = await request.post("/api/payments/checkout", {
      data: { planId: "STARTER", token: "fake_token" },
      maxRedirects: 0,
    });
    // withRole('OWNER') wrapper should reject — 307 redirect, 401, or 403
    expect([307, 401, 403]).toContain(resp.status());
  });

  test("GET /api/payments/history without auth is rejected", async ({
    request,
  }) => {
    const resp = await request.get("/api/payments/history", {
      maxRedirects: 0,
    });
    // Should reject unauthenticated requests
    expect([307, 401, 403]).toContain(resp.status());
  });

  test("/dashboard/planes is not accessible as a public page", async ({
    request,
  }) => {
    // Direct API-level check: the page should not return 200 without auth
    const resp = await request.get("/dashboard/planes", {
      maxRedirects: 0,
    });
    // Expect redirect (302/307) to sign-in, not a 200
    expect(resp.status()).toBeGreaterThanOrEqual(300);
    expect(resp.status()).toBeLessThan(400);
  });
});
