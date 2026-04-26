# 講師用テキスト編集運用

## Goal
講師が `/admin/` にログインし、トップページの本文ブロックを保存だけで更新できるようにする。

## Context
- 編集対象は `content/home-text.json` のテキストだけです。
- `index.html` と `content_master_v1.md` は `scripts/build_home_content.mjs` で同期生成します。
- 料金表、曜日表、価格セル、画像、ヒーロー文言はCMSに出しません。

## Constraints
- Netlifyで Identity と Git Gateway を有効にしてください。
- Identity は招待制にし、講師用アカウントだけにログイン情報を渡します。
- Git Gateway の Roles は `admin` と `teacher` に限定します。
- CMS 側も `accept_roles` を `admin` / `teacher` に限定します。
- 講師が保存すると Git に `content/home-text.json` がコミットされ、Netlify の build command が公開HTMLを生成します。

## Done when
- 講師は `https://abepianoroom.netlify.app/admin/` にログインできる。
- 「トップページ本文」を編集して保存すると、数分後に公開ページへ反映される。
- `make check` と `make test` が通る。

## 講師への案内文
以下をそのまま共有する。

```text
【安部ピアノルーム 本文編集の初回設定】

1. Netlifyから届いたメールを開きます。
2. メール内のボタン、またはリンクを押します。
3. パスワードを決めます。
4. 次回からは https://abepianoroom.netlify.app/admin/ を開きます。
5. メールアドレスとパスワードを入れると、本文編集画面が開きます。
6. 文章を直したら「保存」します。
7. 公開ページへの反映には数分かかります。

料金、曜日、画像はこの画面では変更しません。
わからなくなったら、いったん画面を閉じて、https://abepianoroom.netlify.app/admin/ を開き直してください。
```

## Netlify設定
1. Netlifyの対象サイトで Identity を有効にする。
2. Registration を invite only にする。
3. Git Gateway を有効にし、Roles を `admin` / `teacher` に限定する。
4. 管理者用ユーザーには `admin` role、講師用ユーザーには `teacher` role を付ける。
5. 講師用ユーザーを招待し、パスワードを設定する。
6. `/admin/` でログインし、「トップページ本文」を編集して保存する。

## 招待メールのリンク
- Netlifyの招待メールは英語になることがある。
- メール内リンクがトップページ宛てになっていても、`invite_token` / `confirmation_token` / `recovery_token` / `email_change_token` が付いていれば、トップページ側で自動的に `/admin/` へ移動する。
- 講師にはURLの書き換えを依頼しない。リンクを押すだけでよい状態にする。

## ローカル編集
```sh
node scripts/build_home_content.mjs --write
make check
make test
```
