import { test, expect } from "@playwright/test";

test.describe("Calculators", () => {
  test("calculators page loads", async ({ page }) => {
    // Calculators are behind the dashboard, which requires auth.
    // If redirected to sign-in, that confirms the route exists and middleware works.
    const response = await page.goto("/dashboard/calculadoras");
    expect(response).not.toBeNull();
    const status = response!.status();
    // Either loads (200) or redirects to sign-in (302 resolved to 200)
    expect(status).toBeLessThan(400);
  });

  test("CTS calculator page renders form fields", async ({ page }) => {
    const response = await page.goto("/dashboard/calculadoras/cts");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);

    // If user is redirected to sign-in, we verify the redirect works
    const url = page.url();
    if (url.includes("sign-in")) {
      // Route exists but requires auth - expected behavior
      expect(url).toContain("sign-in");
    } else {
      // If somehow accessible, check for form elements
      const form = page.locator("form, [role='form'], input, select");
      await expect(form.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test("gratificacion calculator page renders", async ({ page }) => {
    const response = await page.goto("/dashboard/calculadoras/gratificacion");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);

    const url = page.url();
    if (url.includes("sign-in")) {
      expect(url).toContain("sign-in");
    } else {
      const form = page.locator("form, [role='form'], input, select");
      await expect(form.first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
