import fs from "node:fs";
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

  await expect(page.getByRole("heading", { level: 2, name: "ごあいさつ" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "小さいお子様向け（リトミック）" })).toBeVisible();
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

test("mobile admin opens the touch-friendly editor shell", async ({ page }) => {
  await page.route("https://identity.netlify.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/admin/");

  await expect(page).toHaveURL(/\/admin\/mobile\.html$/);
  await expect(page.getByRole("heading", { level: 1, name: "本文編集" })).toBeVisible();
  await expect(page.getByText("ログイン機能を読み込めませんでした。")).toBeVisible();
});

test("mobile admin renders editable fields after Identity login", async ({ page }) => {
  const encodedHomeText = Buffer.from(fs.readFileSync("content/home-text.json", "utf8"), "utf8").toString("base64");
  await page.route("https://identity.netlify.com/**", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `(() => {
      const handlers = {};
      const user = { email: "abepianoroom@gmail.com", jwt: async () => "mock-token" };
      window.netlifyIdentity = {
        on: (name, cb) => { handlers[name] = cb; },
        init: () => setTimeout(() => handlers.init && handlers.init(user), 0),
        currentUser: () => user,
        open: () => {},
        close: () => {},
        logout: () => { if (handlers.logout) handlers.logout(); }
      };
    })();`
  }));
  await page.route("**/.netlify/git/github/contents/content/home-text.json**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ sha: "mock-sha", content: encodedHomeText })
  }));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/admin/mobile.html");

  await expect(page.getByText("ログイン中: abepianoroom@gmail.com")).toBeVisible();
  await expect(page.locator('input[data-field="title"]').first()).toHaveValue("ごあいさつ");
  await expect(page.locator('input[data-block-id="main"][data-field="label"]').first()).toHaveValue("導入文");
  await expect(page.getByRole("button", { name: "保存" })).toBeVisible();
});

test("faq smoke", async ({ page }) => {
  await page.goto("/faq/");
  await expect(page).toHaveTitle(/よくあるご質問/);
  await expect(page.getByRole("heading", { level: 1, name: "よくあるご質問" })).toBeVisible();
  await expect(page.getByText("ピアノの体験レッスンは1,000円")).toBeVisible();
  await expect(page.getByRole("link", { name: "お問合せ" })).toBeVisible();
});
