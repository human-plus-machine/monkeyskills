---
name: qa-automation
description: "Plans, writes, and runs UI and API test automation against a running application. Playwright by default on projects with no runner. Invoke with @qa-automation."
version: 1.0.0
author: MonkeyMode Contributors
---

# QA Automation

## Intent

Turn acceptance criteria into a **runnable UI/API test suite** in the project's own test framework, then execute it and report results.

**Invoke:** `@qa-automation for [feature]` or `@qa-automation for [ISSUE-KEY]`.

### Boundaries

This skill **writes and runs** test suites. It does **not**:

- run security scanners, measure coverage for a deployment gate, or produce `deployment-clearance.md` — use the **project's own** SAST/coverage/quality-gate process if it has one. Human UAT sign-off stays **MonkeyMode Phase 7**
- replace MonkeyMode unit tests (Phase 4), story verification (Phase 5), in-repo integration tests (Phase 6), or human UAT sign-off (Phase 7)
- write to `.monkeymode/`, `.qa/`, `.monkeyplan/`, or `.scope/`

MonkeyMode tests run **in-process during the build**. This skill tests a **deployed or locally running app** from the outside.

## Workspace setup

### On first invocation

1. **Extract feature name** from the user's request; convert to kebab-case.
2. **Read** `{workspace}/.qa-automation/{feature-name}/state.json`.
3. **If it does not exist:** create `.qa-automation/{feature-name}/`, write initial `state.json`, start Phase 0.
4. **If it exists:** announce `"Resuming @qa-automation for '{feature_name}' at phase {current_phase}."` and continue from `current_phase`.

Only this skill writes its own `state.json`. Subagents, if any are added later, never write it.

### State schema

```json
{
  "feature_name": "checkout-discount",
  "current_phase": "0|1|2|3|4|completed",
  "phase_status": {
    "intake": "pending|completed",
    "plan": "pending|approved|completed",
    "author": "pending|completed",
    "run": "pending|completed",
    "sync": "pending|completed|skipped"
  },
  "context": {
    "env_url": null,
    "auth_mode": "none|attached-browser|storage-state",
    "execution_auth": "none|env-login|storage-state|project-fixture|null",
    "runner": "playwright|cypress|pytest|other|null",
    "runner_source": "existing|scaffolded|null",
    "framework_profile": "project-native|generic|null",
    "test_root": null,
    "test_location": "app-repo|separate-repo|null",
    "browser_mcp": "playwright|chrome-devtools|none",
    "scope": "smoke|regression|both|null",
    "surface": "ui|api|both|null",
    "environment": null,
    "module": null,
    "reporter": "standard|allure|null",
    "env_file": ".env",
    "credential_vars": [],
    "ac_sources": [],
    "migration_requested": false,
    "framework_alter_requested": false
  },
  "cases": [],
  "last_run": {
    "started_at": null,
    "passed": 0,
    "failed": 0,
    "blocked": 0,
    "report_path": null
  }
}
```

`cases[]` entries use: `{ "id": "QA-001", "title": "...", "ac_ref": "...", "type": "ui|api", "suite": "smoke|regression|security", "status": "planned|authored|pass|fail|blocked", "spec_path": null, "locator_risk": "stable|fragile" }`.

### Artifacts

| Path | Contents |
|---|---|
| `.qa-automation/{feature}/state.json` | Progress and answers |
| `.qa-automation/{feature}/plan.md` | Case list mapped to acceptance criteria |
| `.qa-automation/{feature}/run-report.md` | Last execution result |

Generated **test source** is written to the application's test directory (`context.test_root`) — not under `.qa-automation/`.

## Phases

Run in order. **Read the phase file before executing it.**

| Phase | File | What to do |
|---|---|---|
| 0 Intake | `phases/00-intake.md` | Confirm feature, environment URL, auth, scope, surface. Detect runner and browser MCP. |
| 1 Plan | `phases/01-plan.md` | Map acceptance criteria to cases. Write `plan.md`. Get explicit approval. |
| 2 Author | `phases/02-author.md` | Observe the live page, then write tests in the detected runner. |
| 3 Run | `phases/03-run.md` | Execute the suite. Classify each result. Write `run-report.md`. |
| 4 Sync | `phases/04-sync.md` | Optional. Share the report or file defects in your issue tracker after confirmation. |

Ask for user confirmation **before** advancing a phase. Never write `current_phase` (or `phase_status.*` to a terminal value that implies the next phase) until that confirmation. Never advance more than one phase per approval. Match `@explore` / Phase 1: confirm first, then update state.

## Guides

Read the relevant guide before the step that needs it:

- `guides/runner-detection.md` — which test framework to use; Playwright-first rule for greenfield; optional migration and framework alter
- `guides/browser-mcp.md` — uses Chrome DevTools MCP if the user configured it (config snippet inside), else Playwright MCP, then codegen fallback
- `guides/locator-strategy.md` — locator priority order, banned patterns, and the not-found recovery loop

## Templates

- `templates/plan.md` — shape of `plan.md`
- `templates/run-report.md` — shape of `run-report.md`

## Guardrails

- **Never** write to `.monkeymode/`, `.qa/`, `.monkeyplan/`, or `.scope/`. Read them only if the user points at them.
- **Never** write a locator that was not confirmed against the live page or a user-supplied recording. No locators from memory.
- **Never** request, paste, or handle real credentials in chat. During authoring, the user signs in and the skill attaches to that session. For test execution, tell the user the exact `.env` variable names and wait for them to fill that file locally.
- **Never** commit secrets, tokens, passwords, or a real `.env`. Commit `.env.example` with empty placeholders only.
- **Never** add Allure unless the user opts in. Default reporter is Playwright HTML + list + JSON.
- **Never** report a case as passed when it was blocked. `blocked` is a distinct, reported outcome.
- **Never** change the project's existing test framework unless the user explicitly asks to migrate or alter it.
- **Never** delete or rewrite an existing test suite without explicit confirmation.
- **Never** overwrite an existing canonical spec during normal generation. Reuse or extend it; regeneration requires explicit confirmation.
- **Never** write to an issue tracker without showing the exact payload and getting confirmation.
- **Never** duplicate a test that MonkeyMode already wrote in-repo. Link it in `plan.md` instead.
- **Do not** produce `deployment-clearance.md` or claim a deployment gate result.
- **Do not** add a second browser runner (for example Playwright alongside an existing Cypress suite) outside an approved migration.
- **Do not** write tests, run tests, or drive the live app when `context.env_url` looks like **production**. Stop and ask for a local, dev, or QA URL. Heuristic: hostname label `prod` or `production`, user said it is production/live customer, or a known production host. If unsure, ask — do not proceed with write/run.

### Production URL gate

Run this check as soon as `env_url` is known (Phase 0) and again before Phase 2 and Phase 3:

1. If it is production (or the user confirms it is), **stop**. Do not author, scaffold against that URL, or execute the suite.
2. Ask for a non-production URL. Do not advance `current_phase` while the URL is production.
3. After a replacement URL, re-run this gate.
