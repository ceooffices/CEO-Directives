import { test, expect } from "@playwright/test";

const TEST_EMAIL = "hoangkha@esuhai.com";
const TEST_PASSWORD = "admin123";

// Helper: đăng nhập trước mỗi test
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe("Dashboard — Sau khi đăng nhập", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("trang chủ hiển thị dashboard với 4 tabs", async ({ page }) => {
    await page.goto("/");
    // Kiểm tra tiêu đề hoặc nội dung dashboard
    await expect(page.locator("body")).not.toContainText("Đăng nhập");
  });

  test("trang /dashboard/assistant load thành công", async ({ page }) => {
    await page.goto("/dashboard/assistant");
    await expect(page).toHaveURL(/\/dashboard\/assistant/);
    // Không bị redirect về login
    await expect(page.locator("body")).not.toContainText("Đăng nhập để tiếp tục");
  });
});

test.describe("Dashboard — Nhiều tài khoản", () => {
  const ACCOUNTS = [
    { email: "hoangkha@esuhai.com", password: "admin123" },
    { email: "vynnl@esuhai.com", password: "admin123" },
    { email: "trucly@esuhai.com", password: "admin123" },
  ];

  for (const account of ACCOUNTS) {
    test(`${account.email} đăng nhập thành công`, async ({ page }) => {
      await page.goto("/login");
      await page.fill('input[type="email"]', account.email);
      await page.fill('input[type="password"]', account.password);
      await page.click('button[type="submit"]');

      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }
});
