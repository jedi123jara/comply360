import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("marketing page loads or redirects", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
  });

  test("/sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    // Clerk sign-in page should render
    await expect(page).toHaveURL(/sign-in/);
    // Page should contain some sign-in related content
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("dashboard redirects to sign-in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should redirect unauthenticated users to sign-in
    await page.waitForURL(/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("sign-in");
  });
});
