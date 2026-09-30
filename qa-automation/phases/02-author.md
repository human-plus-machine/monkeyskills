# Phase 2 — Author

Goal: runnable test files in `context.test_root`, using locators confirmed against the live application.

Read `guides/locator-strategy.md` and `guides/browser-mcp.md` before writing any test.

Re-run the **Production URL gate** in `SKILL.md`. If `context.env_url` is production, stop — do not open the app or write tests.

## Step 1: Scaffold only if needed

When `context.runner_source` is `scaffolded`, set up the runner once per `guides/runner-detection.md`. When it is `existing`, add files to the existing structure and follow its conventions — do not restructure someone else's suite.

For brownfield Playwright, perform the guide's bounded inventory: configuration, one nearby module spec, its page object, and only its imported utilities. Do not scan the whole automation repo.

## Step 2: Establish the session

Follow `guides/browser-mcp.md` to open `context.env_url`.

| `context.auth_mode` | What to do |
|---|---|
| `none` | Navigate directly |
| `attached-browser` | The user signs in; attach to that session. Never type credentials. |
| `storage-state` | The user signs in once; save the authenticated session to a file for reuse |

Confirm the application is actually loaded — not a login screen, error page, or empty shell — before reading any element.

### Unattended runs

Authoring against an attached browser does not make the suite runnable in CI. Use `context.execution_auth` for deterministic runs:

- Environment-variable login (`env-login`) — reuse the approved login page/fixture that reads the credential variables recorded in `context.credential_vars` from `.env`, with guarded logout after each test. Ask the user to fill `.env`; never collect those values in chat. Do not replace this with storage state unless they asked to alter the framework.
- Existing project fixture — preserve it.
- Playwright storage state — use a setup project that signs in once and saves `storageState` to a git-ignored file, consumed by the other projects.
- Cypress — a session/login command cached across specs
- API suites — a token fixture acquired once per run

Credentials come from `.env` only. Never hardcode them, never ask the user to paste them in chat, and never commit `.env` or a session file. Write or update `.env.example` with the variable names from `context.credential_vars`. Before the first unattended run, confirm the user has created `.env`.

If the user asks to change the framework (reporter, folders, login), do not improvise: set `framework_alter_requested` and follow `guides/runner-detection.md` Step 5.

## Step 3: Observe each screen once

Read `guides/browser-mcp.md` Step 3b first — snapshot scope is what makes this phase fast or slow.

Group approved cases by unique screen. For each screen:

1. Navigate to the screen once.
2. Take **one** accessibility snapshot, scoped to the region the cases touch rather than the whole page.
3. Build a temporary screen map: control purpose → role/name/test id evidence. Cover **every** case on that screen in this single pass.
4. Reuse existing page-object locators when they still match the snapshot.
5. Choose locators for all new controls from this snapshot.
6. Take another snapshot only after a real state transition (new dialog, route, tab, iframe, or changed virtualized content), not for every field or click.

### Performance budget

Authoring is expected to cost roughly:

| Work | Budget |
|---|---|
| Snapshots per screen | 1, plus 1 per real state transition |
| Snapshots to confirm a locator already in the screen map | 0 |
| Repo files read before writing (brownfield) | the bounded inventory in Step 1 — not a repo-wide scan |
| Live suite runs during authoring | 0 — validate with type-check and `--list` |
| Full-page screenshots | 0 unless a case asserts on a visual |

If you are past that budget, stop and say what is driving it (unstable screen, missing accessible names, unclear case list). Do not silently keep re-reading the page.

When `context.browser_mcp` is `none`, do not write locators from assumption. Ask the user to record the flow (`npx playwright codegen {env_url}`) and paste the result, or to supply the test ids. State plainly that authoring is blocked until one of those arrives.

Mark any case that needed a last-resort CSS locator with `locator_risk: "fragile"`.

Before writing a new page-object method, answer:

1. Who calls it?
2. Can an existing method be reused or parameterized?
3. What stable operation or UI state change does it own?
4. What observable result does it wait for?

If those answers are weak, reuse, parameterize, or keep the action local instead of creating another wrapper.

## Step 4: Write the tests

Write the files for one screen in a single pass — page object first, then its specs — rather than one small edit per locator. Validate with type-check and `npx playwright test --list` before any live run.

One case from `plan.md` becomes one test. Keep the `QA-00N` id and the acceptance-criteria reference in the test title or a comment so the trace survives in the runner's own report.

Structure for maintainability from the first file:

- Put locators and page actions in a page object or helper module, not inline in every spec — a suite that grows past ~20 specs with inline locators becomes unmaintainable
- Reuse the project's existing fixtures, commands, and helpers when they exist
- Assert on user-visible outcomes, and use the runner's built-in waiting (`expect(...).toBeVisible()`) rather than fixed sleeps
- Keep each test independent: it creates or requests the data it needs and does not depend on another test having run first

Apply the test-data approach recorded in `context` during Phase 0. When a test creates data, it cleans up after itself or uses a unique identifier per run.

Follow the project's existing layout. Keep specs focused on lifecycle and business flow; page objects own stable UI operations. Do not add Allure dependencies or `allure-results` paths unless the user opted in.

## Step 5: Handle blocked cases

When a case cannot be authored because the element is not addressable (see the guide's escalation table), do not force it:

1. Set the case `status` to `blocked` with the reason.
2. Record the exact fix needed — usually an `aria-label` or `data-testid` on a named control.
3. Continue with the remaining cases.

Report blocked cases at the end of the phase. Do not write a test that is expected to fail.

## Step 6: Report and advance

Summarize: cases authored, cases blocked, files created, any fragile locators, and any testability fixes needed from developers.

Ask for confirmation to run Phase 3. **Only after an explicit yes:** set `phase_status.author` to `completed` and `current_phase` to `"3"`, then go to Phase 3. If they say wait or no, leave `current_phase` at `"2"`.

## Quality checklist

- [ ] Each screen was observed once, scoped to the region under test; additional snapshots only followed real state changes
- [ ] Authoring stayed within the Step 3 performance budget, or the reason was stated
- [ ] Every new locator was confirmed against that screen evidence or a user-supplied recording
- [ ] No banned locator patterns (see `guides/locator-strategy.md`)
- [ ] Locators live in page objects or helpers, not duplicated across specs
- [ ] Existing page methods were reused or parameterized before new methods were added
- [ ] Tests are independent and do not rely on execution order
- [ ] No credentials, tokens, or session files committed; `.env.example` lists names only
- [ ] Unattended authentication handled when the suite must run in CI; user was asked to fill `.env`
- [ ] Allure added only when `context.reporter` is `allure`
- [ ] Each test carries its `QA-00N` id and acceptance-criteria reference
- [ ] Blocked cases recorded with the specific fix required
