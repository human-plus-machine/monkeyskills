---
name: lite-verification
description: MonkeyMode Lite Phase 4 — Verification. Orchestrator-driven checklist verification against acceptance criteria and code-spec. Spawns verifier subagent only for larger changes (3+ source files).
---

# Lite Phase 4: Verification

## Purpose

Confirm the implementation matches every acceptance criterion and test case in `code-spec.md`. For lite features, the orchestrator runs verification inline using a checklist. Spawn an `verifier` subagent only when the change touches 3 or more source files.

## Output

Verification result: **pass** or **fail with actionable items**.

---

## Step 1: Determine Verification Mode

Count the source files modified or created (from `state.json.stories.story-1-{feature}.files_to_create` + `files_to_modify`).

| File count | Mode |
|------------|------|
| ≤ 2 files | Inline checklist (orchestrator) |
| ≥ 3 files | Spawn `verifier` subagent |

---

## Mode A: Inline Checklist

Work through each item. Mark pass ✅ or fail ❌ with a one-line note.

### Acceptance Criteria
For each criterion in `design.md`:
- [ ] Is there a test that directly validates this criterion?
- [ ] Does the test pass?
- [ ] Does the implementation produce the expected behavior?

### Code Spec Tasks
For each task in `code-spec.md`:
- [ ] All signatures match the spec (method names, parameters, return types)
- [ ] All test cases from the spec are implemented as real tests
- [ ] Edge cases and error cases are covered

### Code Quality
- [ ] No debug statements (`console.log`, `print`, etc.)
- [ ] No unused imports
- [ ] No hardcoded values that belong in config
- [ ] Follows existing naming and style conventions
- [ ] No obvious performance issues (N+1 queries, unbounded loops)

### Tests
- [ ] Full test suite passes
- [ ] New tests are independent (no test order dependencies)
- [ ] Test names describe the scenario clearly

### Scope
- [ ] Implementation matches the "Out of Scope" exclusions in `design.md` (nothing extra was built)

---

## Mode B: verifier Subagent

Spawn one `verifier` subagent via your tool's subagent mechanism (e.g. the Task / subagent tool with `subagent_type: "verifier"`). Provide:

- Code spec path: `.monkeymode/{feature-name}/code-spec.md`
- Design doc path: `.monkeymode/{feature-name}/design.md`
- Files created: (list from state.json)
- Files modified: (list from state.json)
- Story context: single story, lite mode

Collect the structured report. Triage per the checklist above.

---

## Step 2: Handle Results

### Pass

```json
{
  "current_phase": "completed",
  "phase_status": {
    "verification": "completed"
  },
  "stories": {
    "story-1-{feature-name}": {
      "status": "verified",
      "verification": {
        "result": "pass",
        "verified_at": "ISO8601 timestamp"
      }
    }
  }
}
```

Announce to user: "Verification passed. The feature is complete; optionally sync artifacts to your issue tracker."

### Fail

For each failing item:
1. Fix it directly (inline, no rework subagent needed for lite)
2. Re-run the affected tests
3. Re-run the checklist item

If after two fix attempts a failing item cannot be resolved:

> "Verification item [{criterion}] could not be resolved. This may indicate the feature design needs revisiting. Consider starting a `@monkeymode` run to handle this properly."

---

Critique is optional — only if the user asks; see `{skill_dir}/monkeymode/guides/PHASE-CRITIQUE-LOOP.md`.

---

## User Checkpoint

After verification completes (pass or after fixes), present the summary:

```
Verification: PASS

✅ All 3 acceptance criteria validated
✅ All 5 test cases passing
✅ Full test suite clean
✅ No linting issues

Feature "{feature-name}" passed verification.
```

Ask: "Verification complete. Ready to mark it completed? Any changes needed first?"

---

## Definition of Done

- [ ] Every acceptance criterion has a passing test
- [ ] Every test case in `code-spec.md` is implemented and passing
- [ ] Full test suite passes with no regressions
- [ ] Linter/type-checker clean
- [ ] `state.json` updated: `verification: completed`, story `status: verified`, `current_phase: completed`
- [ ] User notified of result
