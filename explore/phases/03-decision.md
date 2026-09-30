---
name: decision
description: Phase 3 - Decision. Lock chosen direction and document rejected options.
---

# Phase 3: Decision

## Purpose

Make the exploration outcome explicit: what was chosen, what was rejected, and why — before writing the full design.

## Steps

### 1. Synthesize from iteration log

Read:
- `options.md`
- `iteration-log.md`
- `state.json` `pocs[]` verdicts

Summarize for the user:
- Options still viable
- Options killed by evidence
- Remaining uncertainties

### 2. Confirm decision

```
"Based on the POCs, here's what I understand:
- Chosen: {approach}
- Rejected: {list} because {evidence}
- Open questions: {list}

Is this the direction you want to design for?"
```

Refine until user confirms.

### 3. Archive rejected POCs

Update `state.pocs[].status` to `rejected` or `archived` for non-chosen variants. Add note in each rejected POC README: `Status: rejected — see decision.md`.

### 4. Write decision.md

Use `templates/decision-template.md`. Populate:
- `decision.chosen`, `decision.rationale`, `decision.rejected`, `decision.open_questions`

### 5. Update state

```json
{
  "phase_status": { "decision": "completed" },
  "decision": { ... }
}
```

## Exit

Ask: "Decision locked. Ready to capture the full technical design (components, APIs, data, interactions)?"

On yes → `current_phase: "4"`, load `phases/04-design-capture.md`.
