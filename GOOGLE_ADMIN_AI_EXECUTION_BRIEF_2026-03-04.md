# Google Admin AI Execution Brief (2026-03-04)

## Scope
- 対象サイト: `https://abepianoroom.netlify.app/`
- 対象作業: Google管理画面（Search Console / GA4）のみ
- 除外: ソースコード編集、サーバ設定変更

## 事前条件
- GSCプロパティにアクセス可能
- GA4プロパティ/データストリームにアクセス可能
- 証跡画像を保存できること

## 実行手順（優先順）
1. Search Console 所有権確認
- URL-prefix: `https://abepianoroom.netlify.app/`
- 状態が「確認済み」か確認

2. Search Console sitemap
- 送信URL: `https://abepianoroom.netlify.app/sitemap.xml`
- 結果が `Success` か確認

3. URL検査
- 対象: `https://abepianoroom.netlify.app/`
- クロール可能 / インデックス登録可能か確認
- 未登録なら「インデックス登録をリクエスト」

4. GA4 Realtime
- `page_view` 受信を確認

5. GA4 DebugView
- 導線クリックで `contact_click` が入るか確認
- リトミック外部リンクで `rhythmic_link_click` が入るか確認
- スクロールで `scroll_depth_50` / `scroll_depth_90` が入るか確認

6. GA4運用設定
- `contact_click` を Key event に設定
- 必要に応じてイベントスコープのカスタム定義を登録
  - `placement`
  - `link_url`

7. プロダクト連携
- Search Console と GA4 のリンク状態を確認（未連携なら連携）

## 期限付き確認
- T+1日: 初回反映確認（GSC Pages/GA4 Realtime）
- T+3日: 連続受信確認（Key event継続）
- T+7日: PerformanceとCTR確認
- T+14日: 初期運用レビュー完了

## 証跡必須一覧
1. GSC 所有権確認画面
2. GSC sitemap送信結果
3. GSC URL検査結果
4. GSC Pagesレポート（T+1/T+3/T+7/T+14）
5. GA4 Realtime（`page_view`）
6. GA4 DebugView（`contact_click` ほか）
7. GA4 Key event設定画面（`contact_click`）

## 報告フォーマット（必須）
| 項目 | 状態 | 原因分類 | 次アクション | 期限 | 証跡 |
|---|---|---|---|---|---|
| 例: GSC sitemap送信 | PASS | - | なし | 当日 | 画像URL |

- `状態`: `PASS` / `FAIL` / `保留`
- `原因分類`: `反映待ち` / `権限不足` / `計測未到達` / `設定不一致`

## 失敗時の切り分け
- 反映待ち: 公開反映・クロール反映待ち
- 権限不足: プロパティ権限不足
- 計測未到達: DebugView対象端末/イベント到達不全
- 設定不一致: URL-prefix、データストリーム、プロパティ取り違え

## 注意事項
- 正規URLは `https://abepianoroom.netlify.app/`
- noindex等のサイト側設定は変更しない
- コード改修が必要と判断した場合は、変更内容を具体化してサイト実装担当へ返却する
