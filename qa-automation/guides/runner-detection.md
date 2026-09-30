---
name: runner-detection
description: How to decide which test framework this skill writes in — keep an existing runner, or scaffold Playwright on a project that has none. Includes the optional, staged migration to Playwright.
---

# Runner Detection

Rule: **use what the project already has.** Only choose a framework when there is nothing to use.

## Step 1: Detect

Look for these in the target repo, in this order. First match wins.

| Signal | Runner | `test_root` |
|---|---|---|
| `playwright.config.{ts,js,mjs}` | `playwright` | the `testDir` from that config |
| `cypress.config.{ts,js}` or `cypress/` | `cypress` | `cypress/e2e/` |
| `wdio.conf.{ts,js}` | `other` (WebdriverIO) | its spec directory |
| `*.spec.js` under `test/` with Selenium/Nightwatch imports | `other` | that directory |
| `manifest.json` with Gauge, or `specs/` with step implementations | `other` (Gauge) | `specs/` |
| `pytest.ini`, `pyproject.toml` with pytest, and existing API tests | `pytest` | the configured test path |
| Nothing above | **none — scaffold Playwright** | see Step 3 |

Also read `package.json` scripts for an existing entry point (`test:e2e`, `e2e`, `test:ui`). Record it; Phase 3 prefers it over a raw command.

Write `context.runner`, `context.runner_source` (`existing` or `scaffolded`), `context.framework_profile`, and `context.test_root`.

When the repo already has a Playwright suite, set `framework_profile: "project-native"` and follow that repo's own conventions. Use `generic` only for a scaffold this skill creates.

## Step 2: Existing runner

Write new tests in that runner. Follow its structure, naming, fixtures, and helper conventions.

Do not:

- add a second browser runner alongside it
- restructure or "modernize" the existing suite
- switch frameworks because another one is preferred

State what was detected in one line and continue.

### Brownfield Playwright inventory

Do not scan the whole automation repository. Read only:

1. `playwright.config.*`, `tsconfig.json`, and package scripts
2. one nearby spec for the target module
3. that module's page object
4. only the shared utilities imported by that spec

This is enough to extend the framework quickly without inventing another pattern.

## Step 3: Greenfield — scaffold Playwright

When no runner exists, Playwright is the default. Say so and let the user override once:

```
"This project has no end-to-end test setup. I'll use Playwright unless you
prefer something else — say the word and I'll use that instead."
```

For greenfield projects, set `framework_profile: "generic"` and add the minimum:

- `@playwright/test` as a dev dependency
- `playwright.config.ts` with `baseURL` from `context.env_url`, trace on first retry, and screenshot on failure
- a test directory (`e2e/` or `tests/e2e/` — match any existing convention in the repo)
- a `test:e2e` script in `package.json`
- git-ignore entries for `playwright-report/`, `test-results/`, `.env`, and any saved session file
- `.env.example` with empty placeholders when login is required

Keep the generic scaffold minimal. Do not add Allure, extra reporters, CI workflows, Docker, or a fixture framework the user did not ask for. Standard reports are Playwright HTML + list + JSON.

For an API-only surface on a Python project with pytest already present, use pytest instead of adding a JavaScript runner.

## Step 4: Migration to Playwright (only on request)

Runs only when `context.migration_requested` is `true` — set by an explicit user answer in Phase 0. Never infer it.

Principles:

- The existing suite keeps running. Playwright is added **beside** it.
- Convert in batches, smoke and critical path first.
- Old and new run in parallel until the user is satisfied they agree.
- Nothing is deleted by this skill. Retiring the old suite is the user's decision and their action.

Sequence:

1. Inventory the existing specs and group them: smoke, regression, and cases that are obsolete or already dead.
2. Confirm the grouping with the user. Obsolete tests are not migrated — they are listed for deletion by the team.
3. Scaffold Playwright per Step 3.
4. Convert one batch. Locators are re-confirmed against the live page per `guides/locator-strategy.md` — old selectors are **input, not truth**, because they often encode the previous tool's workarounds.
5. Run both suites on the same environment and present a comparison: case, old result, new result. Investigate any disagreement before continuing.
6. Repeat per batch until the user signs off.

Custom commands, waits, and data helpers in the old suite rarely map one-to-one. Re-implement the intent using Playwright's built-in waiting rather than porting the workaround.

Do not attempt a whole-suite conversion in a single pass.

## Step 5: Framework update / alter (only on request)

Runs only when `context.framework_alter_requested` is `true` — set by an explicit user answer in Phase 0. Never infer it from "the framework looks outdated."

Typical alter requests: change folder routing, switch reporter (standard ↔ Allure), introduce `.env` login variables, split a page object, or adjust Playwright config.

Sequence:

1. List the exact files you would add, change, or leave untouched.
2. State what stays the same (existing specs keep running).
3. Wait for approval of that list.
4. Apply only the approved items.
5. Run type-check and `npx playwright test --list` before claiming the alter worked.

Do not:

- rewrite working specs as a side effect of a config change
- add Allure as part of an unrelated alter
- move credentials out of `.env` into source
- delete the previous layout until the user signs off
