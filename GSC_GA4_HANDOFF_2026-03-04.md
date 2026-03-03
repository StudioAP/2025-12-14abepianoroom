# GSC/GA4 Handoff (2026-03-04)

## 1) 現在の実装状態（コード事実）
- Site URL: `https://abepianoroom.netlify.app/`
- Search Console verification:
  - `index.html` に `google-site-verification` を実装済み
  - token: `Ba4qap8XP56DDNrc1ybWkaMPgTZiPMZ_C9DApIcjh54`
- GA4:
  - Measurement ID: `G-YJ8P67WYLQ`
  - `gtag.js` 読み込みと `gtag('config', ...)` 実装済み
- カスタムイベント実装済み:
  - `contact_click`
  - `rhythmic_link_click`
  - `scroll_depth_50`
  - `scroll_depth_90`
- Crawl/indexing関連:
  - `robots.txt`: `Allow: /` + sitemap指定済み
  - `sitemap.xml`: single URL (`/`) + `lastmod` あり

## 2) ローカル検証結果（2026-03-04時点）
- `node scripts/seo_release_audit.mjs` -> PASS
- `node scripts/check_content_master_consistency.mjs` -> PASS

## 3) GSC/GA4担当AIが次にやるべきこと（優先順）
1. Search ConsoleでURL-prefixプロパティを確認済みにする
- property: `https://abepianoroom.netlify.app/`
- method: HTMLタグ方式（実装済みmeta tagを利用）

2. Sitemap送信と受理確認
- submit: `https://abepianoroom.netlify.app/sitemap.xml`
- 受理ステータスが `Success` か確認

3. URL検査
- 対象: `https://abepianoroom.netlify.app/`
- 期待: クロール可能 / インデックス登録可能
- 必要なら「インデックス登録をリクエスト」

4. GA4受信確認
- Realtime / DebugView で `page_view` 確認
- `?ga_debug=1` 付きアクセスでイベント受信を確認

5. 重要イベント設定
- `contact_click` を Key event に設定
- イベントパラメータ `placement` と `link_url` をカスタム定義に登録
  - scope: Event

6. プロダクト連携
- Search Console と GA4 をリンク連携

7. GA4プロパティ設定の最終確認
- timezone / currency / data retention / internal traffic filter

## 4) 検証シナリオ（担当AI作業時の受け入れ条件）
1. 計測
- `page_view` がRealtimeで確認できる
- 問い合わせリンクで `contact_click`
- リトミックリンクで `rhythmic_link_click`
- 50%/90%スクロールで各イベントが1回ずつ入る

2. Search Console
- 所有権確認が完了
- sitemap送信が成功
- URL検査でrobots/noindex問題なし

3. 分析可視化
- GA4探索で `contact_click` を `placement` 別に集計できる
- GSC検索パフォーマンスで主要クエリとCTRが取得できる

## 5) 補足提案（担当AI判断）
- `sitemap.xml` の `lastmod` は実更新日に合わせて更新運用
- `changefreq` / `priority` は不要なら削除して運用簡素化
- AI検索ポリシーを明示したい場合、`robots.txt` に
  `OAI-SearchBot` / `GPTBot` 方針を追加するか検討
