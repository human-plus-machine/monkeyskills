# Phase 3 — Run

Goal: an executed suite and an honest report. A case is `pass`, `fail`, or `blocked` — never a guess.

Re-run the **Production URL gate** in `SKILL.md`. If `context.env_url` is production, stop — do not execute the suite.

## Step 1: Run the suite

Use the project's own command. Do not invent one.

| Runner | Typical command |
|---|---|
| Playwright | `npx playwright test` |
| Cypress | `npx cypress run` |
| pytest | `pytest` (or `uv run pytest` / `poetry run pytest`) |

Read the project's `package.json` scripts or build config first and prefer an existing script (for example `npm run test:e2e`).

Where the project has a type-check script, run it and then list tests (`npx playwright test --list`) before opening a browser. These fast checks catch import, path, and data-schema errors without paying for a live UI run.

Before the live run, confirm `.env` exists at the test root and that `context.credential_vars` are defined there. If `.env` is missing, stop and ask the user to create it from `.env.example` — do not prompt them to paste secrets in chat.

Enable failure evidence when the runner supports it — Playwright: trace on first retry, screenshot on failure.

Use the reporter recorded in `context.reporter`:

- `standard` (default) — Playwright HTML report (`playwright-report/`) plus list and JSON. Point the user at `npx playwright show-report`.
- `allure` — generate Allure only if it was opted in and the project already has that reporter. Do not install Allure during a run.

Run the whole planned scope. When `context.scope` is `both`, run smoke first and report it separately.

## Step 2: Classify every failure

A red test is not automatically a bug. For each failure, gather the screenshot, trace, and error, then classify:

| Classification | Signal | Reported as |
|---|---|---|
| Application defect | App reached the right screen and behaved wrongly | `fail` |
| Locator problem | Element exists but was not matched | repair once (Step 3) |
| Environment problem | App unreachable, 5xx on every case, login wall | `blocked` — environment |
| Data problem | Required data missing or already consumed | `blocked` — data |
| Flake | Passes on retry with no code change | `pass`, flagged flaky |

Never relabel an application defect as a locator problem to get the suite green.

## Step 3: Repair locators once

For a locator problem: re-snapshot the failing screen, pick a higher-priority locator per `guides/locator-strategy.md`, update the page object, and re-run that case.

**One repair attempt per case per run.** If it fails again, set the case to `blocked` with the evidence path and the fix needed. Do not loop.

## Step 4: Flake policy

When a case passes only on retry, mark it `pass` and flag it flaky in the report with the suspected cause (timing, animation, shared data).

Do not paper over flake with fixed sleeps or by raising global timeouts. Record it and let the team decide. Repeated flake in the same case is a candidate for quarantine, and that decision belongs to the user, not the skill.

## Step 5: Write the report

Write `.qa-automation/{feature}/run-report.md` using `templates/run-report.md`.

Update `state.cases[].status` and `state.last_run` with counts and the report path.

## Step 6: Report to the user

```
"Phase 3 — Run complete for {feature}:

  Passed:  {N}
  Failed:  {N}   (suspected application defects)
  Blocked: {N}   (could not be tested — reason per case)
  Flaky:   {N}

Report: .qa-automation/{feature}/run-report.md

{One line per failed and blocked case with its reason.}"
```

State the blocked count explicitly. A suite with blocked cases is not a passing suite.

Ask whether to run Phase 4 (share results in your issue tracker) or stop here. Stopping is a valid end state.

**Only after that answer:**

- stop here → set `phase_status.run` to `completed` and `current_phase` to `"completed"`
- continue to Phase 4 → set `phase_status.run` to `completed` and `current_phase` to `"4"`, then go to Phase 4

## Quality checklist

- [ ] The project's own test command was used
- [ ] Type-check and test discovery passed before the live run (when the project has them)
- [ ] `.env` was present; secrets were not requested in chat
- [ ] Report used `context.reporter` (`standard` HTML or opted-in Allure)
- [ ] Every failure classified before reporting
- [ ] At most one locator repair per case
- [ ] Blocked cases reported as blocked, never as passed
- [ ] Flaky cases flagged with a suspected cause
- [ ] Evidence path recorded for each failure
- [ ] `state.last_run` updated
