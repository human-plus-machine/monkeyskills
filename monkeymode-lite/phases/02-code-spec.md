---
name: lite-code-spec
description: MonkeyMode Lite Phase 2 — Code Spec. Produces a single code-spec.md written directly by the orchestrator (no code-spec-writer subagent). Covers tasks, signatures, and test cases for the single lite story.
---

# Lite Phase 2: Code Spec

## Purpose

Produce a `code-spec.md` that gives the implementer (Phase 3) everything needed to write production-quality code without guessing:
- Exact tasks in order
- Function/method signatures
- Test cases for each task

This is the orchestrator-written equivalent of Full Phase 3's per-story spec. The orchestrator writes it directly — do **not** spawn an `code-spec-writer` subagent for a lite feature.

## Output

`{workspace}/.monkeymode/{feature-name}/code-spec.md`

---

## Step 1: Read Context

Before writing, read:
- `{workspace}/.monkeymode/{feature-name}/design.md` — acceptance criteria, files to touch, key decisions
- `state.json` — `detected_stack` for language/framework
- All files listed under "Files to Touch" in `design.md`

---

## Step 2: Write `code-spec.md`

Use the following structure:

```markdown
# Code Spec: {Feature Name}

## Context
- **Design doc:** `.monkeymode/{feature-name}/design.md`
- **Language/Framework:** {language} / {framework}
- **Test framework:** {test_framework}

## Acceptance Criteria
[Copy from design.md]

## Out of Scope
[Copy from design.md]

## Tasks

### Task 1: {Task Name}
**Files:** `src/path/to/file.ext`
**Type:** create | modify

**What to build:**
[Clear description of what this task produces]

**Signatures:**
```{language}
// function/class/method signatures here
```

**Test cases:**
| Scenario | Input | Expected |
|----------|-------|----------|
| Happy path | ... | ... |
| Edge case | ... | ... |
| Error case | ... | ... |

---

### Task 2: {Task Name}
[repeat structure]

---

## Implementation Notes
[Any cross-task concerns: shared utilities, import order, DB transaction scope, etc.]

## Definition of Done
- [ ] All tasks implemented
- [ ] All test cases pass
- [ ] Linter/type-checker clean
- [ ] No debug statements or dead code
```

---

Critique is optional — only if the user asks; see `{skill_dir}/monkeymode/guides/PHASE-CRITIQUE-LOOP.md`.

---

## Step 3: Update State

After writing `code-spec.md`, add the single story to `state.json` and advance phase:

```json
{
  "current_phase": "implementation",
  "phase_status": {
    "code_spec": "completed"
  },
  "artifacts": {
    "code_spec": ".monkeymode/{feature-name}/code-spec.md"
  },
  "stories": {
    "story-1-{feature-name}": {
      "title": "{Feature Name}",
      "status": "code_spec",
      "code_spec_path": ".monkeymode/{feature-name}/code-spec.md",
      "files_to_create": [],
      "files_to_modify": [],
      "verification": {
        "result": "pending",
        "rework_attempts": 0
      },
      "last_updated": "ISO8601 timestamp"
    }
  }
}
```

Populate `files_to_create` and `files_to_modify` from the Tasks section.

---

## User Checkpoint

Present a summary of the spec (task list, file count, test case count) and ask: "Code spec ready. Proceed to Phase 3 (Implementation)?"

Wait for confirmation before advancing.

---

## Definition of Done

- [ ] `code-spec.md` saved to `.monkeymode/{feature-name}/`
- [ ] Every acceptance criterion has at least one test case
- [ ] Every task has concrete signatures (not pseudo-code)
- [ ] `state.json` updated: `code_spec: completed`, story added, `current_phase: implementation`
- [ ] User confirmed to proceed
