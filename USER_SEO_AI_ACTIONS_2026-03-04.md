# USER SEO/AI Actions (2026-03-04)

## 目的
- リリース完了判定に必要な運用タスクを、ユーザ視点で漏れなく実行する。
- サイト改修ではなく、Google管理画面運用（GSC/GA4/GBP）を完了させる。

## 現状前提
- 本番URL: `https://abepianoroom.netlify.app/`
- 実装済みイベント: `contact_click`, `rhythmic_link_click`, `scroll_depth_50`, `scroll_depth_90`
- 計測ID: `G-QVNNE0X4VW`
- GSC verification token: 実装済み

## ユーザが準備するもの
1. Google Search Console 権限
- 対象プロパティを閲覧できること（推奨: フル権限）

2. Google Analytics 4 権限
- 対象プロパティでイベント設定・カスタム定義を編集できること

3. Google Business Profile 権限（任意だが推奨）
- ビジネス情報更新とURL設定を編集できること

4. 証跡保存先
- スクリーンショット保存先（Drive/Notionなど）を決める
- ファイル命名規則を統一（例: `2026-03-04_GSC_sitemap_success.png`）

## 管理画面担当AIへの依頼文（コピペ用）
以下をそのまま渡してください。

---
サイト側実装は完了済みです。  
対象: `https://abepianoroom.netlify.app/`

Search Consoleで所有権確認・sitemap送信・URL検査を実施してください。  
GA4 DebugView/Realtimeで `page_view` / `contact_click` / `rhythmic_link_click` / `scroll_depth_50` / `scroll_depth_90` の疎通確認をお願いします。  

結果は以下フォーマットで返却してください。
- 状態: `PASS` / `FAIL` / `保留`
- 原因分類: `反映待ち` / `権限不足` / `計測未到達` / `設定不一致`
- 次アクション
- 期限
- 証跡（スクリーンショットURLまたは添付）
---

## 監視スケジュール
- T+1日: GSC Pages / Performance、GA4 Realtimeの初回確認
- T+3日: インデックス反映とKey event計測の継続確認
- T+7日: クエリ別CTRと`contact_click`導線別比較
- T+14日: 初期運用の総括と次月の改善項目確定

## 未達時エスカレーション条件
1. GSC
- 所有権確認失敗が24時間以上継続
- sitemap送信が`Success`にならない

2. GA4
- `page_view` がRealtimeに出ない
- `contact_click` がDebugViewで再現しない
- Key event化後に件数が0のまま継続

3. 原因分類ルール
- 反映待ち: 変更は正しいが反映待ち
- 権限不足: 画面操作権限が足りない
- 計測未到達: 発火は想定されるがGA4到達が確認できない
- 設定不一致: プロパティ/ストリーム/URLなど設定値がズレている

## AI検索クローラ方針（意思決定済み）
- 方針: 「検索のみ許可」
- ルール:
  - `OAI-SearchBot` は許可
  - `GPTBot` は拒否
- 注意: これは `robots.txt` 反映が必要。管理画面担当AIではなくサイト実装担当へ別依頼する。
