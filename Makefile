SHELL := /bin/zsh

.PHONY: setup-codex build-content check e2e test

setup-codex:
	npm install
	git config core.hooksPath .githooks

build-content:
	node scripts/build_home_content.mjs --write

check:
	node scripts/build_home_content.mjs --check
	node scripts/check_content_master_consistency.mjs

e2e:
	npx playwright test

test: check e2e
