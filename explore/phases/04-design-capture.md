---
name: design-capture
description: Phase 4 - Design capture. Structured technical design from exploration outcomes.
---

# Phase 4: Design Capture

## Purpose

Produce the design document you would write after exploration — components, interactions, APIs, database — structured for `@monkeytriage` consumption.

## Prerequisites

- Phase 3 `decision.md` complete
- User confirmed chosen direction

## Steps

### 1. Load sources

- `decision.md`, `options.md`, `iteration-log.md`
- POC READMEs and any `@prototype` HTML paths
- Relevant production codebase context (existing services, patterns)

### 2. Generate design artifacts

Write under `.explore/{feature-name}/design/`:

| File | Content |
|------|---------|
| `design.md` | Overview, context, chosen approach, links to sections, open questions |
| `components.md` | Services/modules, responsibilities, ownership, dependencies |
| `interactions.md` | Sequence flows, sync/async, failure handling, idempotency |
| `api.md` | Endpoints/events/contracts, request/response shapes, errors |
| `data.md` | Entities, schema, migrations, retention, consistency |

Use `templates/design-template.md` as the master outline; split content across files as above.

### 3. Map POC learnings

Include a **Evidence from exploration** section in `design.md`:
- Which POC proved what
- Pointers to `pocs/` paths or prototype branches (not production code)

### 4. MonkeyMode alignment preview

Ensure design sections can map to:
- `1a-discovery.md` ← components + high-level architecture + data overview
- `1b-contracts.md` ← api.md + interaction contracts
- `1c-operations.md` ← security, perf, observability, deployment notes in design.md

### 5. Review with user

Present summary; ask for gaps:
```
"Design captured. Review:
- Components: ...
- Key APIs: ...
- Data: ...

Anything missing before handoff to @monkeytriage?"
```

Refine until user approves.

### 6. Update state

```json
{
  "current_phase": "4",
  "phase_status": { "design_capture": "completed" },
  "artifacts": { ... paths ... }
}
```

## Exit

Ask: "Phase 4 complete. Ready to move to Phase 5 (handoff to @monkeytriage or @monkeyplan)?"

If yes → set `current_phase: "5"`, load `phases/05-handoff.md`. Do **not** auto-advance.
