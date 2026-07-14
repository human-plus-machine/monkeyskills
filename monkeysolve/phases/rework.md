---
name: rework
description: Structured rework when verification fails repeatedly, or when requirements change mid-flight after a phase has already completed.
---

# Rework

## When to Load This Guide

- `solve-verifier` failed 3 rework cycles in Phase 3 without reaching `pass`
- The user says "change", "rework", "redo", "fix", "revise" about a **completed** phase
- New requirements surface that contradict a decision already recorded in `plan.md`

## Step R1: Trace to the Origin Phase

Don't patch the symptom — find where the gap actually originated:

- **The plan was wrong or incomplete** (missed a case, a spike would have caught a false assumption, an unknown wasn't surfaced) → the gap is in Phase 1
- **The plan was right but the implementation diverged without a good reason** → the gap is in Phase 2
- **The implementation matches the plan but the verification method itself was wrong** (e.g. the generated tests didn't actually exercise the real behavior) → the gap is in Phase 3's method resolution, not the code

Read `unknowns.md` and `implementation-notes.md` — the answer is usually already logged there, since both phases are required to log deviations rather than hide them.

## Step R2: Present the History

Before making any change, show the user the full attempt history so the decision to rework isn't made blind:

```
"'{problem-name}' has failed verification 3 times:

Attempt 1: {summary of what failed}
Attempt 2: {summary}
Attempt 3: {summary}

Root cause looks like: {your trace from Step R1}

This needs {a plan revision (Phase 1) | a different implementation approach (Phase 2) |
a different verification method (Phase 3)}.

How do you want to proceed?"
```

## Step R3: Revise and Resume

- **Plan-level fix:** update `plan.md` directly (don't create a new one), log the change in `unknowns.md` with what triggered it, reset `phase_status.implement` and `phase_status.verify` to `not_started`, resume at Phase 2.
- **Implementation-level fix:** spawn `solve-implementer` again with the full failure history in its prompt, not just the latest verifier report — so it doesn't repeat a prior attempt.
- **Verification-method fix:** re-run Step V0's discovery/ask sequence, but this time make clear the previous method was wrong so the user isn't asked the identical question — explain what was tried and why it didn't work.

Record the rework in `state.json`'s `rework_history`:

```json
{
  "rework_history": [
    {
      "triggered_at": "ISO8601 timestamp",
      "origin_phase": "design|implement|verify",
      "reason": "string",
      "resolution": "string"
    }
  ]
}
```

## Never Do

- ❌ Fix a verification failure by weakening the verification method to make it pass
- ❌ Silently re-scope the plan to match what got built, without telling the user
- ❌ Loop rework more than 3 times per phase without stopping to ask the user directly
