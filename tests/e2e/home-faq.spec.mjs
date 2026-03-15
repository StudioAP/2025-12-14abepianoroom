import { expect, test } from "@playwright/test";

test("homepage smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/安部ピアノルーム/);
  await expect(page.getByRole("heading", { level: 1, name: "安部ピアノルーム" })).toBeVisible();
  await expect(page.getByRole("link", { name: "お問合せ" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "よくあるご質問" }).first()).toBeVisible();
});

test("faq smoke", async ({ page }) => {
  await page.goto("/faq/");
  await expect(page).toHaveTitle(/よくあるご質問/);
  await expect(page.getByRole("heading", { level: 1, name: "よくあるご質問" })).toBeVisible();
  await expect(page.getByText("ピアノの体験レッスンは1,000円")).toBeVisible();
  await expect(page.getByRole("link", { name: "お問合せ" })).toBeVisible();
});
