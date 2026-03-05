# KOGUMA_FLYER_POSTCARD_V2

こぐまリトミックルーム向けハガキフライヤー再設計稿です（V3: Spring Open版）。

## デザイン方針
- コア導線を `タイトル → 3要点 → QR` に固定
- 主メッセージは `2026年春オープン` に一本化
- こぐまサイト準拠のトーン（`#fdf6f0` / `#4a3728` / `#F7708F` / `#28C0CB` / `#62D1B6`）
- 子どもの顔写真は不使用（ヒーローイラストのみ）
- `立地` ではなく `アクセス` 表現に統一

## ファイル構成
- `koguma_flyer_postcard_v2.html`
  - マスター編集用（1249x1816 / 100x148mm + 3mm塗り足し換算）
  - `?export=1` を付けるとガイド線非表示で出力
- `koguma_flyer_postcard_v2_capture.html`
  - Figma取り込み専用（capture script 挿入済み）
- `assets/hero-illustration.jpg`
- `output/koguma_flyer_postcard_v2_master.png`
  - 仕上がり画像（ガイドなし）
- `output/koguma_flyer_postcard_v2_sns.png`
  - SNS共有用（長辺1080）
- `output/koguma_flyer_postcard_v2_print.pdf`
  - 印刷確認用PDF
- `output/koguma_flyer_postcard_v2.png`
  - ガイド入りレビュー用

## Figmaファイル
- https://www.figma.com/design/RzOW6sBqSmpoYONIQryWfI

## V3変更点
- ヒーロー訴求を `2026年春オープン` へ変更
- `リトミックってなに？` を `リトミックって？` に短縮
- 体験会/本開講の月表記を削除し、Web案内訴求へ変更
- `立地` を `アクセス` へ変更
- ぴーちゃん写真ブロックを削除し、右カラムをQR導線へ集約

## QR導線
- メイン: `https://kogumarr.netlify.app/`
- 下帯: `https://abepianoroom.netlify.app/`

## 備考
- QRは `api.qrserver.com` の画像URLを直接参照しています。
- テキスト・余白・サイズの最終調整はFigma側で行ってください。
