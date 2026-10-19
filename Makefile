SHELL := /bin/sh

.PHONY: help install run build preview lint format test test-e2e ui-shots vuln sast check

help:
	@echo "Usage: make <target>"
	@echo "  install    npm ci"
	@echo "  run        vite dev server on http://localhost:5173 (proxies /v1 to API_PROXY_TARGET)"
	@echo "  build      production build (dist/)"
	@echo "  preview    serve the build on http://localhost:4173"
	@echo "  lint / format / test / vuln / sast / check"
	@echo "  test-e2e   Playwright against the production build + mock API (installs Chromium first)"
	@echo "  ui-shots   screenshots of every screen at 375, 768 and 1280 px, light and dark, into ui-shots/ (look at them)"

install:
	npm ci

run:
	npm run dev

build:
	npm run build

preview:
	npm run preview

lint:
	npm run lint

format:
	npm run format

test:
	npm test

test-e2e:
	npx playwright install chromium
	npm run test:e2e

ui-shots:
	npx playwright install chromium
	npx playwright test screens

vuln:
	npm audit --omit=dev --audit-level=high

# Semgrep SAST with the public registry rules, no account needed (brew install semgrep, or pipx install semgrep).
# .semgrep/antislop.yml is the slop lint (generic copy, gradients, emoji, hard-coded colors, placeholder content);
# an exception is `nosemgrep: <rule-id> -- <reason>` next to the code, never a removed rule.
sast:
	semgrep scan --config p/default --config .semgrep/antislop.yml --error --metrics=off

check: lint test vuln sast build
