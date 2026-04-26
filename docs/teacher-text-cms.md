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

## Netlify設定
1. Netlifyの対象サイトで Identity を有効にする。
2. Registration を invite only にする。
3. Git Gateway を有効にし、Roles を `admin` / `teacher` に限定する。
4. 管理者用ユーザーには `admin` role、講師用ユーザーには `teacher` role を付ける。
5. 講師用ユーザーを招待し、パスワードを設定する。
6. `/admin/` でログインし、「トップページ本文」を編集して保存する。

## ローカル編集
```sh
node scripts/build_home_content.mjs --write
make check
make test
```
