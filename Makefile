SHELL := /bin/zsh

.PHONY: setup-codex check e2e test

setup-codex:
	npm install
	git config core.hooksPath .githooks

check:
	node scripts/check_content_master_consistency.mjs

e2e:
	npx playwright test

test: check e2e
