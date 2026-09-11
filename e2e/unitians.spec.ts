import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, user = "aarav", password = "password") {
  await page.goto("/login");
  await page.getByPlaceholder(/username or email/i).fill(user);
  await page.getByPlaceholder(/^password$/i).fill(password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL(/\/(home|onboarding)/);
}

test.describe("UNITIANS demo flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.removeItem("uu-community-demo-v3");
      localStorage.removeItem("uu-community-demo-v2");
    });
    await page.reload();
  });

  test("registration and login", async ({ page }) => {
    await page.goto("/signup");
    const uniq = `u${Date.now().toString().slice(-8)}`;
    await page.getByPlaceholder(/display name/i).fill("Test User");
    await page.getByPlaceholder(/unique username/i).fill(uniq);
    await page.getByPlaceholder(/^email$/i).fill(`${uniq}@test.edu`);
    await page.getByPlaceholder(/^password$/i).fill("password123");
    await page.getByRole("button", { name: /sign up/i }).click();
    await page.waitForURL(/\/onboarding/);
    await page.locator("select").nth(0).selectOption({ index: 1 });
    await page.locator("select").nth(1).selectOption({ index: 1 });
    await page.locator("select").nth(2).selectOption({ index: 1 });
    await page.getByRole("button", { name: /continue to feed/i }).click();
    await page.waitForURL(/\/home/);
  });

  test("login + feed filters", async ({ page }) => {
    await login(page);
    await expect(page.getByText(/study only/i)).toBeVisible();
    await page.getByLabel(/study only/i).check();
    await expect(page.getByText(/verified only/i)).toBeVisible();
    await page.getByLabel(/class only/i).check();
  });

  test("admin roles portal", async ({ page }) => {
    await login(page, "admin", "admin123");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /developer portal/i })).toBeVisible();
    await expect(page.getByText(/free-tier notice/i)).toBeVisible();
    await expect(page.getByText(/teacher delegation/i)).toBeVisible();
  });

  test("friend requests accept", async ({ page }) => {
    await login(page, "aarav", "password");
    await page.getByLabel(/friend requests/i).click();
    await expect(page.getByText(/incoming/i)).toBeVisible();
    const accept = page.getByLabel("Accept");
    if (await accept.count()) {
      await accept.first().click();
    }
  });

  test("DMs inbox reachable", async ({ page }) => {
    await login(page, "aarav", "password");
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: /messages/i })).toBeVisible();
  });

  test("stories rail on home", async ({ page }) => {
    await login(page);
    await expect(page.getByText(/your story/i)).toBeVisible();
  });

  test("profile search directory", async ({ page }) => {
    await login(page);
    await page.goto("/search");
    await page.getByPlaceholder(/search username or name/i).fill("riya");
    await expect(page.getByText(/riya/i).first()).toBeVisible();
  });

  test("responsive footer navigation", async ({ page }) => {
    await login(page);
    await expect(page.getByLabel(/create post/i)).toBeVisible();
    await expect(page.getByLabel(/friend requests/i)).toBeVisible();
  });
});
