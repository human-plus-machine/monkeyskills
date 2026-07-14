---
name: finish
description: Phase 4 - Finish. Fable's post-implementation steps - a stakeholder-ready explainer and an understanding-check quiz - then the commit/push/PR workflow, reusing the same safety rules as the commit skill.
---

# Phase 4: Finish

## Purpose

Two things happen before code ships: someone other than the implementer needs to understand what changed (the **explainer**), and the person shipping it should be able to confirm they actually understand the edge cases (the **quiz**) — Fable's "Pitches and Explainers" and "Quizzes" post-implementation steps. Then the change ships as a PR.

## Step F1: Generate the Explainer

Build `.monkeysolve/{problem-name}/explainer.md` from `plan.md`, `implementation-notes.md`, and `git diff --stat` (or the equivalent in the worktree if `execution_mode` was `worktree`):

```markdown
# {problem-name}

## Summary
{1-3 sentences, plain language — what changed and why, from plan.md's Problem section}

## Changes
{bullet list, one per meaningful change — derived from files created/modified and the plan's
Work Breakdown, not a raw file list}

## Deviations from the Original Plan
{pull from implementation-notes.md — omit this section entirely if there were none}

## Verification
{method used, result — pulled from verify-report.md}
```

This is short by design — it's meant to be read in 30 seconds. Present it to the user.

## Step F2: Generate the Quiz

Build `.monkeysolve/{problem-name}/quiz.md` — a short understanding-check, not a test of the code. 3-6 questions that probe the edge cases and decisions actually made, so the person shipping this can confirm they'd catch a wrong answer, not just skim and approve:

```markdown
# Understanding Check: {problem-name}

Q: {a question about a real edge case or decision from the implementation — e.g.
"What happens if X is called with an empty list?"}
A: {the actual answer, from the code}

Q: {a question about a deviation from the plan, if any}
A: ...

Q: {a question about the chosen approach vs. an alternative that was considered/rejected}
A: ...
```

Draw questions from `implementation-notes.md`'s deviations and `plan.md`'s "Decisions Most Likely to Change" — those are exactly the spots where a reviewer's mental model is most likely to be wrong. Present the questions to the user without the answers first, let them attempt an answer if they want, then reveal — but don't block on this, it's a sanity aid, not a gate.

## Step F3: Ship It

Reuse the exact rules from the [`commit`](../../commit-skill/SKILL.md) skill rather than reimplementing them — branch protection, `feat/`/`bugs/` prefix, commit message conventions, push behavior, and the "never auto-create a PR" rule all apply unchanged. The only MonkeySolve-specific differences:

1. **Branch already exists if `execution_mode` was `branch` or `worktree`** (created in Phase 2) — don't create a second one. If `execution_mode` was `in-place` and the current branch is `main`/`develop`/`master`, create `{prefix}/{problem-name}` now, same prefix rule as `commit`.
2. **Working directory is `worktree_path`, if set** — every git command in this step runs there, not in the main checkout.
3. **Commit message and PR body source from MonkeySolve artifacts** instead of MonkeyMode's design docs:
   - Commit message: `feat({problem-name}): {short description}` or `fix({problem-name}): {short description}` (prefix matches the branch prefix)
   - PR body: use `explainer.md`'s content directly as the Summary/Changes sections, plus a "Verification" section from `verify-report.md` and a link to `quiz.md`
4. Show the user what will be committed and ask for confirmation, same as `commit`'s Step 3.
5. Push the branch and provide the PR link automatically after a successful commit — same as `commit`'s Step 4.
6. **Never auto-create the PR.** Only run `gh pr create` if the user explicitly says so, exactly as `commit`'s Step 5 requires — this holds even in an autonomous end-to-end run (see the exception note in `SKILL.md`'s Phase Transitions section).

**If `execution_mode` was `worktree`:** after push, tell the user the worktree still exists at `worktree_path` and ask whether to remove it now (`git worktree remove {path}`) or leave it until the PR merges. Never remove it without asking — it may still be in use.

## Step F4: Mark Complete

Update `state.json`: `current_phase: "completed"`, `phase_status.finish: "completed"`.

```
"MonkeySolve complete for '{problem-name}'.

Pushed to origin/{branch}. Open a PR into the default branch: [Create PR →]({pr-url})

Artifacts:
- Plan: .monkeysolve/{problem-name}/plan.md
- Implementation notes: .monkeysolve/{problem-name}/implementation-notes.md
- Verification: .monkeysolve/{problem-name}/verify-report.md
- Explainer: .monkeysolve/{problem-name}/explainer.md"
```

## Definition of Done

Phase 4 is complete when:
- [ ] `explainer.md` generated and shown to the user
- [ ] `quiz.md` generated and offered to the user
- [ ] Changes committed on a topic branch (never `main`/`develop`/`master`) and pushed
- [ ] PR link provided; PR only actually created if the user explicitly asked
- [ ] `state.json` `current_phase` set to `"completed"`
