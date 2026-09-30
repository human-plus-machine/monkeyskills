---
name: lite-implementation
description: MonkeyMode Lite Phase 3 — Implementation. Orchestrator implements inline (no implementer subagents). TDD approach, one task at a time, follows existing codebase patterns.
---

# Lite Phase 3: Implementation

## Purpose

Implement the feature described in `code-spec.md` using TDD. The orchestrator writes code directly — no `implementer` subagents for lite. Work through tasks sequentially from the spec.

## Output

Production-ready source code and tests in `src/` (or the project's appropriate directory).

---

## Step 1: Load Context

Before writing any code:

1. **Read** `{workspace}/.monkeymode/{feature-name}/code-spec.md` — full task list, signatures, test cases
2. **Read** `{workspace}/.monkeymode/{feature-name}/design.md` — architecture approach, key decisions
3. **Load coding guidelines** from `{skill_dir}/monkeymode/guides/`:
   - Base language guide: `{LANGUAGE}-CODING-GUIDELINES.md`
   - Framework supplement (if applicable): `{LANGUAGE}-{FRAMEWORK}-SUPPLEMENT.md`
   - Platform supplement (if `platform_supplement_loaded == true`): `{PLATFORM}-PLATFORM-SUPPLEMENT.md`
4. **Read existing files** listed under `files_to_create` and `files_to_modify` in state.json — understand current patterns before writing

---

## Step 2: Implement Task by Task (TDD)

For each task in `code-spec.md`, in order:

1. **Write the test first** — using the test cases from the spec. Tests must fail before implementation.
2. **Write the implementation** — minimum code to make tests pass.
3. **Run tests** — confirm passing.
4. **Run linter** — confirm clean.
5. **Move to next task.**

### TDD rules

- Write tests before production code, always
- Each test case from the spec must become a real test
- Do not skip test cases marked as "Error case" or "Edge case"
- Match the test framework detected in `state.json.context.detected_stack.test_framework`

### Code quality rules

- Follow the coding guidelines loaded in Step 1
- Match existing naming conventions, import style, and file structure
- No hardcoded values that belong in config or constants
- No `console.log`, `print`, `System.out.println` debug statements
- No unused imports or dead code

---

## Step 3: Run Full Test Suite

After all tasks are complete:

1. Run the project's full test suite (not just the new tests)
2. Run the linter/type-checker
3. Confirm: no regressions, no new warnings

If tests fail for reasons outside the feature's scope, report them to the user and do not proceed to verification.

---

## Step 4: Update State

```json
{
  "current_phase": "verification",
  "phase_status": {
    "implementation": "completed"
  },
  "stories": {
    "story-1-{feature-name}": {
      "status": "implementation_complete",
      "files_to_create": ["src/path/to/new-file.ext"],
      "files_to_modify": ["src/path/to/existing-file.ext"],
      "last_updated": "ISO8601 timestamp"
    }
  }
}
```

---

## Scope Overflow Detection

While implementing, if you discover that the feature requires:
- A second independent story
- A new service, database, or public API not in the spec
- A platform supplement that isn't loaded

**Stop implementation.** Tell the user:

> "While implementing, I found this feature requires [reason] which exceeds MonkeyMode Lite's scope. Consider starting a new full run: `@monkeymode for {feature-name}-v2`."

Do not continue implementing beyond the spec.

---

## Definition of Done

- [ ] All tasks from `code-spec.md` implemented
- [ ] Tests written first (TDD) for every test case in the spec
- [ ] Full test suite passes with no regressions
- [ ] Linter/type-checker clean
- [ ] No debug code, dead imports, or hardcoded values
- [ ] `state.json` updated: `implementation: completed`, story status `implementation_complete`
- [ ] Advance to Phase 4 (Verification) — no user checkpoint needed here, auto-advance after all tests pass

Critique is optional — only if the user asks; see `{skill_dir}/monkeymode/guides/PHASE-CRITIQUE-LOOP.md`.
