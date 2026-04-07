import { test, expect } from "@playwright/test";

const TEST_EMAIL = "hoangkha@esuhai.com";
const TEST_PASSWORD = "admin123";

test.describe("Authentication", () => {
  test("trang chủ redirect về /login khi chưa đăng nhập", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/dashboard/assistant redirect về /login khi chưa đăng nhập", async ({ page }) => {
    await page.goto("/dashboard/assistant");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/approve/test-id redirect về /login khi chưa đăng nhập", async ({ page }) => {
    await page.goto("/approve/test-id");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/confirm/test-id redirect về /login khi chưa đăng nhập", async ({ page }) => {
    await page.goto("/confirm/test-id");
    await expect(page).toHaveURL(/\/login/);
  });

  test("trang login hiển thị form đăng nhập", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Bảng Điều Hành Chỉ Đạo");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("đăng nhập sai hiển thị lỗi", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', "wrong-password");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Email hoặc mật khẩu không đúng")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("đăng nhập đúng → redirect về dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Sau login thành công, phải redirect ra khỏi /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("đăng nhập giữ redirect param (next)", async ({ page }) => {
    await page.goto("/directive/some-id");
    // Middleware redirect về /login?next=/directive/some-id
    await expect(page).toHaveURL(/\/login\?next=/);

    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Sau login redirect về trang gốc
    await expect(page).toHaveURL(/\/directive\/some-id/, { timeout: 15_000 });
  });
});
