import { test, expect } from "@playwright/test";

test.describe("Diagnostico Gratis (Public Funnel)", () => {
  test("page loads without auth and shows SUNAFIL hero text", async ({
    page,
  }) => {
    const response = await page.goto("/diagnostico-gratis");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);

    // The hero heading mentions "SUNAFIL" and the page has diagnostic content
    const body = await page.locator("body").textContent();
    expect(body?.toLowerCase()).toMatch(/sunafil/);
  });

  test("page displays the start CTA button", async ({ page }) => {
    await page.goto("/diagnostico-gratis");

    // The CTA button contains "Iniciar diagnostico gratis"
    const ctaButton = page.locator("button", {
      hasText: /iniciar diagn[oó]stico/i,
    });
    await expect(ctaButton).toBeVisible({ timeout: 10_000 });
  });

  test("page shows 20 questions and company size input", async ({ page }) => {
    await page.goto("/diagnostico-gratis");

    // The intro phase displays "20 preguntas" as a trust signal
    const body = await page.locator("body").textContent();
    expect(body).toContain("20 preguntas");

    // Company size input is visible
    const sizeInput = page.locator('input[type="number"]');
    await expect(sizeInput).toBeVisible();
  });

  test("GET /api/diagnostics?action=questions&type=EXPRESS requires auth", async ({
    request,
  }) => {
    // The diagnostics API is protected by withAuth — unauthenticated requests
    // should be rejected (redirect or 401/403)
    const resp = await request.get(
      "/api/diagnostics?action=questions&type=EXPRESS",
      { maxRedirects: 0 },
    );
    // Clerk withAuth returns 307 redirect to sign-in or 401/403
    expect([307, 401, 403]).toContain(resp.status());
  });
});
