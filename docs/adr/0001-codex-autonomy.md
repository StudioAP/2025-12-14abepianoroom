# ADR 0001: Codex 自走運用を repo に固定する

## Context
- この repo は静的サイトなので、仕様ずれは `content_master_v1.md` と HTML の不一致で起きやすい。
- 公式 key と repo 内 harness だけで再現可能な運用に寄せたい。

## Decision
- 複雑タスクは `/plan` 開始を前提にする。
- `make check` を最小ガード、`make test` を完了ガードにする。
- pre-commit は高速な `make check` のみに限定する。
- E2E は homepage と FAQ の smoke に絞る。
- undocumented な `PostToolUse Hook` は使わず、`AGENTS.md` と Makefile の workflow で代替する。

## Consequences
- Codex は編集直後に `make check`、完了前に `make test` を実行する。
- durable な運用変更は `AGENTS.md`、`GOALS.md`、`.codex/config.toml`、ADR に残す。
- rollback は global backup と repo の git history の両方で戻せる。
