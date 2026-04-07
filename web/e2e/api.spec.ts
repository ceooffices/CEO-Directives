import { test, expect } from "@playwright/test";

test.describe("API Routes — Public", () => {
  test("GET /api/status trả về health score và summary", async ({ request }) => {
    const res = await request.get("/api/status");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.summary).toBeDefined();
    expect(body.summary.total_directives).toBeGreaterThanOrEqual(0);
    expect(body.health_score).toBeGreaterThanOrEqual(0);
    expect(body.health_score).toBeLessThanOrEqual(100);
    expect(body.timestamp).toBeDefined();
  });

  test("GET /api/track/invalid-token trả về tracking pixel (không lỗi)", async ({ page }) => {
    // Dùng native fetch vì Playwright request API không handle binary GIF tốt
    await page.goto("/login"); // cần trang nào đó để chạy JS
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/track/invalid-token");
      return { status: res.status, contentType: res.headers.get("content-type") };
    });
    expect(result.status).toBe(200);
    expect(result.contentType).toContain("image/gif");
  });
});

test.describe("API Routes — Protected (cần auth)", () => {
  test("POST /api/remind không có body → 400", async ({ request }) => {
    const res = await request.post("/api/remind", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/escalate không có body → 400", async ({ request }) => {
    const res = await request.post("/api/escalate", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/approve không có body → 400", async ({ request }) => {
    const res = await request.post("/api/approve", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/confirm không có body → 400", async ({ request }) => {
    const res = await request.post("/api/confirm", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("API Routes — Rate Limiting", () => {
  test("POST /api/remind bị giới hạn sau nhiều request liên tục", async ({ request }) => {
    // Gửi 12 request liên tục (limit = 10/min)
    const results: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await request.post("/api/remind", {
        data: { directive_id: "test-rate-limit" },
      });
      results.push(res.status());
    }

    // Ít nhất 1 request cuối phải bị 429
    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
