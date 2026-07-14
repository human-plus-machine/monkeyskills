---
name: implement
description: Phase 2 - Implement. Resolves where the work happens (in-place, a topic branch, or an isolated git worktree), then spawns a solve-implementer subagent to build the approved plan, tracking every deviation in implementation-notes.md.
---

# Phase 2: Implement

## Purpose

Build exactly what `plan.md` describes, in the location the user wants (current branch, a topic branch, or an isolated worktree), and **surface deviations instead of silently absorbing them** — Fable's "Implementation Notes" idea: when reality forces a pivot away from the plan, write down what changed and why rather than letting the plan quietly go stale.

## Step I0: Resolve Execution Mode

Ask once per problem, unless `.monkeysolve/config.json` already has a `default_execution_mode` (see below):

```
"Where should I do this work?

1. In-place, on the current branch (fastest — default)
2. A new topic branch (feat/... or bugs/..., same convention as @commit)
3. An isolated git worktree — a new branch checked out in a separate directory, so your
   current working tree is untouched. Good for running this autonomously in the background.

Which do you want?"
```

If the user picks 2 or 3, also ask: *"Use this as the default for future MonkeySolve runs in this repo?"* — if yes, write `{"default_execution_mode": "branch"|"worktree"}` to `.monkeysolve/config.json` at the repo root (create the file if it doesn't exist; this is repo-shared, not per-problem). **Re-read the file first** if it already exists — merge your key in rather than overwriting the whole file, since another MonkeySolve run elsewhere in this repo may have written it since you last read it.

If `.monkeysolve/config.json` already sets a default, use it without asking — mention it once: *"Using this repo's default execution mode: {mode}."*

**Setting up the mode:**

- **in-place:** nothing to do, work happens on the current branch.
- **branch:** determine the branch prefix using the same `feat/`/`bugs/` decision rule as the [`commit`](../../commit-skill/SKILL.md) skill (new behavior → `feat/`, defect fix → `bugs/`). If the current branch is `main`/`develop`/`master`, create `{prefix}/{problem-name}` with `git checkout -b`. Record `branch_name` in `state.json`.
- **worktree:** same prefix rule for the branch name, then:
  ```
  git worktree add ../{repo-name}-{problem-name} -b {prefix}/{problem-name}
  ```
  Record `worktree_path` (absolute path) and `branch_name` in `state.json`. **From this point on, every subagent prompt and every command the orchestrator runs for this problem must operate with that worktree as the working directory** — pass it explicitly, don't assume cwd.

## Step I1: Spawn the solve-implementer Subagent

MonkeySolve is scoped to a single problem, so this is always **one** `solve-implementer` subagent that builds the whole plan — there is no batching or parallel work-unit split here. (If `plan.md`'s Work Breakdown genuinely turns out to need independent parallel streams, that's a signal this problem has grown into a multi-story feature — use `@monkeymode` for that instead of growing this phase to match.)

Use the Task tool, `subagent_type: "solve-implementer"`. **Do NOT pass a `model` parameter** — subagents inherit the parent's model. Never use `model: "fast"`.

**Prompt template (self-contained — the subagent has no conversation history):**

```
## Problem

{problem_name}

## Plan

{paste the FULL contents of plan.md}

## Working Directory

{worktree_path if execution_mode is "worktree", otherwise the repo root — state explicitly}

## Files to Read on Startup

- {paths to reference files cited in plan.md's References section}
- {any existing test files for the area being touched, so conventions are matched}

## File Boundaries

You may ONLY create or modify these files:
- Files to create: {from plan.md's Work Breakdown}
- Files to modify: {from plan.md's Work Breakdown}

Do NOT modify state.json.
Do NOT commit any changes.

## Decisions Most Likely to Change

{paste the plan's "Decisions Most Likely to Change" section — this is what the subagent
checks against before pivoting away from the plan; see "Conservative Pivoting" below}
```

## Conservative Pivoting

When something in the codebase contradicts the plan (an assumption was wrong, a referenced pattern doesn't actually fit), the subagent should not silently improvise and it should not stop and escalate for every minor wrinkle either. The rule:

1. **Check the plan's "Decisions Most Likely to Change" list.** If this decision was already flagged as uncertain, the subagent has the mandate to pivot — implement the better approach and log it.
2. **If the decision was presented with confidence** (not flagged as uncertain) and it's now clearly wrong, the subagent should still pivot rather than force a bad fit — but log it more prominently, since it means the plan itself had a gap the design phase missed.
3. **Either way, log every deviation** in `implementation-notes.md` (see Step I2) — never make invisible rework. This is what lets Phase 3 verify against what was actually built, and what lets a human catch a plan-level gap before it reaches Phase 4.
4. **If the deviation changes what "done" means** (an acceptance criterion in the plan is no longer achievable as written, or scope grew), stop and ask the user rather than deciding alone.
5. **If the deviation reveals a genuinely new unknown** — not just "the plan was wrong about this file" but "we don't actually know what the right behavior is here" — append it to `unknowns.md` (don't just bury it in `implementation-notes.md`) and flag it in your report to the orchestrator, so it's visible before Phase 4 rather than discovered later.

## Step I2: Collect Implementation Notes

The `solve-implementer` subagent returns its deviation log in its structured report (see the subagent's own file for the exact format). The orchestrator writes it to `.monkeysolve/{problem-name}/implementation-notes.md`:

```markdown
# Implementation Notes: {problem-name}

## Deviations from Plan

### {file or area}: {short title}
**Plan said:** {what plan.md described}
**Built instead:** {what was actually done}
**Why:** {the contradiction that forced the pivot}
**Flagged in plan as uncertain:** yes | no
```

If there were zero deviations, the file states that plainly: "No deviations from plan.md."

If the subagent's report includes anything under "New unknowns surfaced," append each one to `unknowns.md` now — this is what makes the promise in `phases/01-design.md` ("kept even after the plan is approved") actually true, instead of a log nothing ever writes to after Phase 1.

## Step I3: Reconcile

After the subagent completes:

1. Update `state.json` — mark `phase_status.implement: "completed"` or, on failure, leave it `in_progress` and log the error; only the orchestrator writes state
2. Report to the user: files created/modified, deviations count, any new unknowns logged
3. **Ask user before proceeding to Phase 3.**

## Handling Failures

If the subagent fails or reports `partial` or `blocked`:
1. Log the error/blocked reason in `state.json`
2. Do not retry automatically — present to the user and ask whether to retry, revise the plan, or stop
3. If retrying, include the failure context in the retry prompt so the subagent can learn from it

## Definition of Done

Phase 2 is complete when:
- [ ] Execution mode resolved (and persisted to `.monkeysolve/config.json` if the user opted in)
- [ ] The implementation is `completed` or the user has explicitly accepted a partial/blocked state
- [ ] `implementation-notes.md` exists (even if it just says "no deviations")
- [ ] Any newly surfaced unknowns are appended to `unknowns.md`
- [ ] `state.json` updated by the orchestrator, not by the subagent
- [ ] User approves moving to Phase 3
