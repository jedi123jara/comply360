import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status");
  });

  test("POST /api/portal-empleado returns 400 without body", async ({
    request,
  }) => {
    const response = await request.post("/api/portal-empleado", {
      data: {},
    });
    // Should reject empty/invalid request
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("POST /api/portal-empleado returns 400 with invalid DNI", async ({
    request,
  }) => {
    const response = await request.post("/api/portal-empleado", {
      data: {
        dni: "123", // Invalid: DNI must be 8 digits
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
