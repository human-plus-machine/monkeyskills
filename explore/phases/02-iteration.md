---
name: iteration
description: Phase 2 - Iteration. Run POCs, refine, log learnings until user is ready to decide.
---

# Phase 2: Iteration

## Purpose

Support the back-and-forth loop: run POCs, change them, learn, repeat — until the user is ready to lock a direction.

This phase has **no fixed length**. Stay here as long as needed.

## Iteration Loop

```
Run POC → observe → log → refine POC or add new spike → repeat
```

### On each user message in Phase 2

1. Read `iteration-log.md` and `state.json` `pocs[]`
2. Interpret user input as: new learning, request to change POC, request for new variant, or readiness to decide
3. Act accordingly
4. Append to `iteration-log.md` using `templates/iteration-log-template.md`

### Log entry format (every significant round)

```markdown
## {ISO8601 date} — Iteration {n}

**What we did:** ...
**What we observed:** ...
**Impact on options:** supports / weakens / kills {option}
**Next:** ...
```

### Allowed actions in Phase 2

- Modify existing POC code (still throwaway rules)
- Add a new POC for a forked idea (`state.pocs[]` + new folder)
- Invoke `@prototype` for new UI variant (if enabled)
- Run spikes to verify library/API facts (document evidence in log)
- Mark POC `verdict` in state when question is answered

### Exit criteria (user-driven only)

Advance to Phase 3 only when the user explicitly indicates readiness:
- "I've decided", "ready to lock direction", "let's write the design", "I'm done exploring"

If ambiguous, ask:
```
"Still iterating, or ready to lock a direction and move to decision + design capture?"
```

## Never

- Push user to decide early
- Write full `design/api.md` etc. — only spike notes in iteration log
- Merge POC code to main application paths

## Transition to Phase 3

On user confirmation:
```json
{
  "current_phase": "3",
  "phase_status": { "iteration": "completed", "decision": "in_progress" }
}
```

Load `phases/03-decision.md`.
