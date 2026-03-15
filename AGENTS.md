# Mission
- この repo は `安部ピアノルーム` の静的サイトを管理する。
- durable な自走品質を保つため、仕様、検証、運用ルールを repo 内に固定する。

# Guardrails
- 複雑な変更、複数ページ変更、仕様が曖昧な変更は必ず `/plan` から始める。
- 依頼文や `GOALS.md` には `Goal / Context / Constraints / Done when` を必ず入れる。
- 長時間タスクは `git worktree` を使って分離し、セッション名は `abepiano-<goal>` 形式で残す。
- `content_master_v1.md` を仕様の正本とし、本文変更時は `index.html` と整合させる。
- 編集後は必ず `make check`、完了前は必ず `make test` を通す。
- 画面変更はコード読みだけで完了扱いにせず、desktop と mobile の実画面確認まで行う。
- 未確認の hook や config key は足さない。post-tool 検証は workflow で担保する。
- unrelated な untracked file は commit に含めない。

# Workflow
- `plan -> implement -> make check -> make test -> diff review -> retrospective` を崩さない。
- 実装は小さく区切り、差分ごとに壊していないか確認する。
- テストか視覚確認で不一致が出たら、その場で修正してから次へ進む。
- 恒久ルールの変更は `docs/adr` に残し、次回も自動適用できる状態にする。

# Environment
- 初回セットアップ: `make setup-codex`
- 内容整合: `make check`
- E2E smoke: `make e2e`
- 完了条件: `make test`
- pre-commit は `.githooks/pre-commit` で `make check` を強制する。
