# KOGUMA_FLYER_POSTCARD_V4_LANDSCAPE

こぐまリトミックルーム告知ハガキのV4（横向き）です。

## 目的
- 参考PDFの情報設計（左サイド帯 + 右情報面）を採用
- ただしトーンはWeb実装に忠実（配色・フォント・素材）
- 春オープン告知 + 3月/4月体験 + 5月本開講を明示

## ブランド忠実設定
- 色: `#fdf6f0`, `#4a3728`, `#F7708F`, `#28C0CB`, `#62D1B6`
- 見出しフォント: `Shippori Mincho`
- 本文フォント: `Noto Sans JP`
- 写真/素材: Web使用のこぐまイラストのみ（子どもの顔写真/ぴーちゃん不使用）

## 印刷仕様
- 仕上がり: `148mm x 100mm`（横）
- 塗り足し: 四辺 `3mm`
- 作業サイズ（300dpi換算）: `1816 x 1249 px`
- 安全マージン: 四辺 `5mm` 相当

## ファイル構成
- `koguma_flyer_postcard_v4_landscape.html`
  - マスター編集用
  - `?export=1` でガイド線非表示出力
- `koguma_flyer_postcard_v4_landscape_capture.html`
  - Figma取り込み用（capture script入り）
- `assets/koguma-illustration.png`
- `output/koguma_flyer_postcard_v4_landscape_master.png`
- `output/koguma_flyer_postcard_v4_landscape_sns.png`
- `output/koguma_flyer_postcard_v4_landscape_print.pdf`
- `output/koguma_flyer_postcard_v4_landscape_review.png`

## QR導線
- メイン: `https://kogumarr.netlify.app/`
- 下帯: `https://abepianoroom.netlify.app/`

## Figma
- 既存ファイル: `https://www.figma.com/design/RzOW6sBqSmpoYONIQryWfI`
- 追加ノードURL: `https://www.figma.com/design/RzOW6sBqSmpoYONIQryWfI?node-id=4-2`
- 追加ノード運用名: `V4_LayoutRef_Landscape`

## 備考
- QR画像は `api.qrserver.com` のURL生成を使用。
- 下帯「安部ピアノルーム 大人レッスン募集中」は維持。
