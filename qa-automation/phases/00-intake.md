# Phase 0 — Intake

Goal: know what to test, where it runs, how to sign in, and which framework to write in — before any test is written.

## Step 1: Discover existing context (silent)

Check these paths and note what exists. Read them only to avoid asking questions the user already answered elsewhere.

| Source | Use for |
|---|---|
| `.monkeymode/{feature}/stories/2b-acceptance.md` | Acceptance checks; `human-ui` items are automation candidates |
| `.monkeymode/{feature}/stories/user_stories.md` | Given/When/Then acceptance criteria |
| `.monkeymode/{feature}/design/1b-contracts.md` | API contracts and critical user journeys |
| `.scope/{feature}/blueprint.md` | Affected repos and components |
| Existing issue in your tracker (read-only, via whatever CLI or MCP is available) | Acceptance criteria on the ticket |

Record every source found in `context.ac_sources`. Never modify these files.

If none exist, the user supplies the criteria directly in Phase 1.

## Step 2: Detect the runner and framework profile

Follow `guides/runner-detection.md`. Write `context.runner`, `context.runner_source`, `context.framework_profile`, and `context.test_root`.

Do not ask the user which framework to use when the project already has one — state what was detected and move on.

When the repo already has a Playwright suite, set `framework_profile: "project-native"` and preserve its conventions. For greenfield, set `generic`.

## Step 3: Probe the browser MCP

Follow `guides/browser-mcp.md` Step 1. Write `context.browser_mcp`.

Use whichever of Playwright MCP or Chrome DevTools MCP is actually registered (the user must have configured it). Announce the result in one line, for example:

- `"Chrome DevTools MCP is available — I'll use it to confirm locators against the live page."`
- `"Playwright MCP is available — I'll use it to confirm locators against the live page."`

Do not stop the phase when no MCP is found. Phase 2 handles the fallback.

## Step 4: Ask the user

Ask these as **one** batched question. Skip any item already answered by Step 1–3.

1. **Environment URL** — where is the running app? (local, dev, QA only). After the answer, apply the **Production URL gate** in `SKILL.md`. If it looks like production, stop: do not plan write/run work, do not open the live app, do not advance the phase. Ask for a non-production URL.
2. **Authoring sign-in** — how can the skill observe the app? (`auth_mode`)
   - no login needed (`none`)
   - user will sign in to their own browser and the skill attaches (`attached-browser`)
   - user will sign in once; save a git-ignored storage-state file for authoring reuse (`storage-state`)
3. **Test execution sign-in** — reuse the existing project fixture, environment-variable login, storage state, or none?
4. **Scope** — smoke (critical path only), regression (all acceptance criteria), or both.
5. **Surface** — UI, API, or both.
6. **Environment and module** — which environment (local, dev, QA) and which module or area of the app the suite targets.
7. **Test location** — commit tests into the application repo, or a separate test repo? Note who owns that repo.
8. **Test data** — is seed data available, does the suite create its own, and is there a reset or cleanup step?
9. **Reporter** — Allure is **optional**. Default is the standard Playwright HTML + list + JSON reports. Ask:
   ```
   Reports: I'll use Playwright's standard HTML report unless you want Allure
   as well. Reply "Allure" to add it; otherwise we stay with the standard report.
   ```
   Write `context.reporter` as `allure` only on that explicit answer; otherwise `standard`.
10. **Login credentials (`.env`)** — never ask the user to paste a username or password in chat. State the variable names they must set in an uncommitted `.env` at the test root, for example:
    ```
    Put login values in .env (never paste them here). I'll add .env.example
    with empty placeholders. Typical names:
      APP_USERNAME=
      APP_PASSWORD=
    Tell me when .env is ready. Do not commit .env.
    ```
    Record the names in `context.credential_vars` and `context.env_file` (default `.env`). Adapt names if the brownfield repo already uses different ones.

Write all answers to `context`.

Keep authoring access separate from deterministic test login:

- `auth_mode` records how the skill observes the app while authoring.
- `execution_auth` records how generated tests sign in (`env-login`, `storage-state`, or an existing project fixture).

When the project already has a login page object or fixture that reads credentials from `.env`, reuse it (`env-login`), with guarded logout after each test. Do not introduce storage state unless the brownfield repo already uses it or the user explicitly approves a change.

## Step 5: Migration question (only when relevant)

Ask this **only** when the project already has a non-Playwright UI runner:

```
"This project uses {runner}. I'll write new tests in {runner} by default.
If you want to move to Playwright instead, say so now — that is a separate,
staged migration and I will keep the existing suite until you sign off."
```

Set `context.migration_requested`. When `true`, follow the migration section of `guides/runner-detection.md`. Never start a migration without this explicit answer.

## Step 5b: Framework update / alter (only on request)

When a runner already exists, state what was detected and keep it. Do **not** restructure, rename folders, swap reporters, or change login/credential handling on your own.

If the user needs to update or alter the framework (new folder layout, Allure on/off, `.env` login, page-object split, config change), ask:

```
I will keep the current framework as-is. If you want me to alter it
(folder layout, reporter, login/.env, helpers), say
what to change. I will list the exact files first and wait for approval.
```

Set `context.framework_alter_requested`. When `true`, follow the framework-alter section of `guides/runner-detection.md`. Never apply framework edits without that explicit answer and an approved file list.

## Step 6: Confirm and advance

Present a short summary: feature, environment URL, authoring auth, execution auth, `.env` variable names (not values), reporter (`standard` or `allure`), runner (detected or to be scaffolded), framework profile, environment/module when applicable, test location, scope, surface, and browser MCP.

Ask for confirmation. **Only after an explicit yes:** set `phase_status.intake` to `completed` and `current_phase` to `"1"`, then go to Phase 1. If they say wait or no, leave `current_phase` at `"0"`.

If the production URL gate failed, do not present this as ready to advance.

## Quality checklist

- [ ] `context.env_url` is set and passed the production URL gate (not production)
- [ ] `context.runner` and `context.test_root` are set
- [ ] `context.framework_profile` is set
- [ ] `context.auth_mode` is set
- [ ] `context.execution_auth` is set
- [ ] `context.reporter` is `standard` or `allure` (Allure only if the user opted in)
- [ ] `context.credential_vars` lists `.env` names; user was not asked to paste secrets in chat
- [ ] Environment and module are recorded when applicable
- [ ] `context.test_location` is set with a known owner
- [ ] Test data and cleanup approach recorded
- [ ] `context.browser_mcp` recorded
- [ ] Existing acceptance-criteria sources listed in `context.ac_sources`
