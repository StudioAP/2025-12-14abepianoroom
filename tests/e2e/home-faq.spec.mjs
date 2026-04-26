import { expect, test } from "@playwright/test";

test("homepage smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/安部ピアノルーム/);
  await expect(page.getByRole("heading", { level: 1, name: "安部ピアノルーム" })).toBeVisible();
  await expect(page.getByRole("link", { name: "お問合せ" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "よくあるご質問" }).first()).toBeVisible();
});

test("homepage editable text blocks render with the existing pricing table", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("初めてだけど弾いてみたい…")).toBeVisible();
  await expect(page.getByText("（住所登録が必須となるGoogle広告は掲載しておりません）")).toBeVisible();
  await expect(page.getByText("※「自宅練習サポート動画」について")).toBeVisible();
  await expect(page.getByText("都合がつかない時期には休み、時間ができたらまた再開する")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "講師略歴" })).toBeVisible();
  await expect(page.getByRole("link", { name: "こぐまリトミックルームを見る" }).first()).toBeVisible();

  const pricingSection = page.locator("#section-3");
  await expect(pricingSection.locator(".stream-table--pricing")).toHaveCount(2);
  await expect(pricingSection.getByText("単発レッスン")).toBeVisible();
  await expect(pricingSection.getByText("5,000円")).toBeVisible();
});

test("Netlify Identity email links land on the admin screen", async ({ page }) => {
  await page.route("https://identity.netlify.com/**", (route) => route.abort());
  await page.route("https://unpkg.com/**", (route) => route.abort());

  await page.goto("/#invite_token=test-token");

  await expect(page).toHaveURL(/\/admin\/#invite_token=test-token$/);
});

test("faq smoke", async ({ page }) => {
  await page.goto("/faq/");
  await expect(page).toHaveTitle(/よくあるご質問/);
  await expect(page.getByRole("heading", { level: 1, name: "よくあるご質問" })).toBeVisible();
  await expect(page.getByText("ピアノの体験レッスンは1,000円")).toBeVisible();
  await expect(page.getByRole("link", { name: "お問合せ" })).toBeVisible();
});
