---
name: verify
description: Phase 3 - Verify. Resolves this repo's verification method (remembered, discovered, or asked - defaulting to generate-then-refine minimal tests), then spawns a solve-verifier subagent to check the implementation against the plan, with a rework loop for failures.
---

# Phase 3: Verify

## Purpose

Confirm the implementation actually does what `plan.md` says, using **this repo's own way of verifying that** — not a generic checklist. The first time MonkeySolve runs in a repo, it figures out how that repo verifies changes and remembers it, so every later run (any problem, any session) skips straight to running it.

## Step V0: Resolve the Verification Method

Check in this order — stop at the first one that resolves it:

### 1. Repo memory

Read `.monkeysolve/verify.md` at the repo root (not per-problem — this is shared across every MonkeySolve run in this repo).

If it exists: **use it as-is.** Do not re-ask, do not re-discover. Tell the user once: *"Using this repo's remembered verification method from `.monkeysolve/verify.md`."* Set `verify.method_source: "repo-memory"` in state.

If the plan touched an area the file doesn't cover (e.g. it documents a Python test command but this change is Terraform), treat that gap the same as "not found" for that area only — fall through to step 2 for the uncovered part, then merge the result into `verify.md` rather than overwriting it.

### 2. Discover from the repo

If no memory file, look for existing, already-documented standards before asking anyone — **follow other standards if found:**

- Test runner: `package.json` `scripts.test`, `pyproject.toml`/`pytest.ini`/`setup.cfg` `[tool.pytest]`, `Makefile` test target, `go test` via `*_test.go` presence, `Gemfile` + `spec/`, `Cargo.toml` + `tests/`
- Lint/typecheck: `.eslintrc*`, `ruff`/`mypy` config, `.golangci.yml`, `rubocop.yml`, `tsconfig.json` `strict`
- CI: `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile` — the commands CI actually runs are strong evidence of the real verification method
- Docs: `CONTRIBUTING.md`, `README.md` "Testing" or "Development" sections

If you find a **single, unambiguous** command (or small set): propose it, don't just assume it.

```
"This repo doesn't have a remembered verification method yet (.monkeysolve/verify.md).
I found {command} as the test command via {source} — for example {evidence}.

Use this as the verification method for this repo? (yes / something else)"
```

If discovery is ambiguous (multiple candidate frameworks, no clear CI command) or finds nothing, fall through to step 3.

### 3. Ask the user

```
"I couldn't find a documented verification method for this repo. How should I verify changes?

1. Generate a minimal set of tests for the changed behavior, run them, then keep refining
   implementation or tests until they pass and the plan's acceptance criteria are demonstrably
   met. (recommended default if nothing else applies)
2. Run a specific command you give me (e.g. `pytest tests/foo`, `npm test`, a manual check)
3. Something else — tell me"
```

If the user doesn't specify and simply confirms the default, use option 1 as the resolved method.

### Persist the Result

Once resolved (from any of the three sources), write or update `.monkeysolve/verify.md` at the repo root using the template in `templates/verify-memory-template.md`. This is what makes future runs skip Step V0 entirely — do this even if the method came from repo memory and only needed a gap filled in. **Re-read the file immediately before writing** — if another MonkeySolve run in this repo changed it since Step V0 started, merge your update in (e.g. add the new area's command alongside the existing ones) rather than overwriting the whole file.

Set in `state.json`:
```json
{
  "verify": {
    "method_source": "repo-memory|discovered|user-specified|default-generated-tests",
    "command": "the resolved command, or null if the method is 'generate minimal tests'",
    "rework_attempts": 0
  }
}
```

## Step V1: Spawn solve-verifier

Use the Task tool, `subagent_type: "solve-verifier"`. **Do NOT pass a `model` parameter.**

**Prompt template:**

```
## Problem

{problem_name}

## Plan (the spec to verify against)

{paste the FULL contents of plan.md}

## Implementation Notes

{paste the FULL contents of implementation-notes.md — deviations the implementer logged}

## Working Directory

{worktree_path if execution_mode is "worktree", otherwise the repo root}

## Verification Method

{paste the resolved method from .monkeysolve/verify.md — the exact command(s) to run, or,
if method_source is "default-generated-tests", the instruction to generate and refine tests
(see the solve-verifier subagent's own instructions for how it does this)}

## Files Changed

**Created:** {list}
**Modified:** {list}
```

The verifier is **read-only except when the resolved method is "generate minimal tests"** — in that case it may write test files (see the subagent file for the exact boundary).

**If the verifier's report surfaces a genuinely new unknown** — not "this is a bug," but "the plan didn't actually say what correct behavior is here" — append it to `unknowns.md` before triaging, and surface it to the user alongside the verification result rather than letting the rework loop guess at an answer nobody gave.

## Step V2: Triage

```
IF overall_status == "pass":
  -> Mark verified, proceed to Phase 4

IF overall_status == "pass-with-warnings":
  -> Present warnings to user
  -> If user proceeds: mark verified
  -> If user wants fixes: rework loop

IF overall_status == "fail":
  -> Rework loop
```

## Step V3: Rework Loop

```
WHILE status != "pass" AND rework_attempts < 3:
  1. Spawn solve-implementer again with the verifier's report and the file boundaries
  2. Re-spawn solve-verifier
  3. Increment verify.rework_attempts in state.json
```

If 3 attempts are exhausted without a pass, stop and load `phases/rework.md` — present the full attempt history to the user rather than looping silently.

## Step V4: Report and Advance

```
"Phase 3 — Verification complete:

Method: {method_source} ({command, or "generated 6 tests, all passing"})
Status: PASS (all 4 acceptance criteria met, 0 rework cycles)

Ready to proceed to Phase 4 (Finish)?"
```

Save `.monkeysolve/{problem-name}/verify-report.md` with the verifier's full structured output. Update `state.json`: `phase_status.verify: "completed"`.

## Definition of Done

Phase 3 is complete when:
- [ ] Verification method resolved (from memory, discovery, or the user) and `.monkeysolve/verify.md` written/updated
- [ ] `solve-verifier` returned `pass` or `pass-with-warnings` (accepted by user)
- [ ] `verify-report.md` saved
- [ ] User approves moving to Phase 4
