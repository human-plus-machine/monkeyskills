---
name: handoff
description: Phase 5 - Handoff to @monkeyplan or @monkeytriage with design import. State files MUST match downstream skill schemas.
---

# Phase 5: Handoff

## Purpose

Copy exploration artifacts into downstream workspaces using **contracts that match** `monkeymode/SKILL.md`, `monkeymode-lite/SKILL.md`, and `monkeyplan/phases/00-intake.md`.

## Offer handoff

**If this phase was entered because `@monkeytriage` Path B (or `@monkeymode` / `@monkeymode-lite`) detected a completed explore workspace:** skip this menu. Target is already `@monkeytriage`. Ask Full vs Lite only when `workflow_tier` is not already forced by the invocation (`lite` / `full` / `@monkeymode-lite` / `@monkeymode`). Then go to [Handoff Path A](#handoff-path-a-monkeymode).

Otherwise:

```
"Exploration complete. How would you like to continue?

1. @monkeytriage — Import design into .monkeymode/{feature}/ (Full or Lite) and continue past design
2. @monkeyplan — Copy technical design to .monkeyplan/{feature}/ for planning (Path E import)
3. Manual — leave artifacts in .explore/ only
4. More iteration — return to Phase 2"
```

Store choice in `handoff.target`.

---

## Handoff Path A: @monkeytriage

### A1. Create MonkeyMode workspace layout

```
.monkeymode/{feature-name}/
├── design/
│   ├── 1a-discovery.md
│   ├── 1b-contracts.md
│   └── 1c-operations.md
├── explore-reference/
│   ├── decision.md
│   ├── iteration-log.md
│   └── options.md
├── qa-log.md
└── state.json
```

### A2. Write design docs from explore Phase 4

| MonkeyMode file | Source |
|-----------|--------|
| `1a-discovery.md` | `design/design.md` + `components.md` + `data.md` summary + decision context |
| `1b-contracts.md` | `design/api.md` + `interactions.md` |
| `1c-operations.md` | Security, perf, observability, deployment from `design/design.md` |

### A3. Run stack detection (required)

Read `guides/monkeymode-stack-detection-handoff.md` and execute MonkeyMode Phase 1A Step 0 **before** finalizing `state.json`.

Append `## Codebase Conventions` to `1a-discovery.md` from Step 0.

### A4. Initialize MonkeyMode state

**Use the canonical template** — read `templates/monkeymode-handoff-state.json` and write `.monkeymode/{feature-name}/state.json` with:

- Replace `{feature-name}` and `{ISO8601 timestamp}`
- Fill `context.detected_stack` from Step A3 (not left null if detectable)
- `artifacts.design_docs` — **not** `artifacts.design`
- Include all top-level keys from the template: `stories`, `parallel_execution`, `rework_history`, `integration`, `acceptance`, `context.architectural_guidance`
- `phase_status`: `design_1a`, `design_1b`, `design_1c` → `completed`; `user_stories` → `not_started`
- `current_phase`: `"2"`
- **`context.workflow_tier`: `"full"`** (required — `@monkeytriage` Path A treats a missing tier as full, but Lite handoff must never omit this field)
- `context.explore_handoff`: `true`
- `context.explore_path`: `.explore/{feature-name}/`
- Do **not** add `phase_critique`

Copy or append explore `qa-log.md` into `.monkeymode/{feature-name}/qa-log.md` with a handoff header.

**Do not invent a shortened state shape.** If the JSON template is missing, copy field-for-field from `monkeymode/SKILL.md` State File Schema and still set `workflow_tier`, `explore_handoff`, and `explore_path`.

### A5. MonkeyMode Lite handoff (if user chooses Lite)

Read `templates/monkeymode-lite-handoff-state.json`:

- Merge explore design sections into `.monkeymode/{feature-name}/design.md`
- Run stack detection (A3); write `detected_stack` into lite state
- `current_phase`: `"code_spec"` (design already complete)
- `phase_status.design`: `"completed"`
- Include `stories` with `story-1-{feature-name}` per lite schema
- **`context.workflow_tier`: `"lite"`** (required — missing tier makes `@monkeytriage` Path A treat the run as Full, which then looks for `design/1a-discovery.md`)
- `context.explore_handoff`: `true`
- `context.explore_path`: `.explore/{feature-name}/`
- Do **not** add `phase_critique`

### A6. Announce

```
"Design and stack detection imported to .monkeymode/{feature-name}/.
Detected stack: {language} / {framework} {version}.
Invoke: @monkeytriage for {feature-name}
MonkeyMode should resume at User Stories (Full Phase 2) or Code Spec (Lite) — design interviews skipped."
```

---

## Handoff Path B: @monkeyplan

**Do not use Path C (MonkeyThink brief import).** Path C expects `.monkeyplan/{feature}/discovery-brief.md` written by `@monkeythink` and maps its discovery-brief sections.

### B1. Copy explore design for Path E

```
.monkeyplan/{feature-name}/
├── explore-design/
│   ├── design.md
│   ├── components.md
│   ├── interactions.md
│   ├── api.md
│   └── data.md
├── explore-reference/
│   ├── decision.md
│   ├── options.md
│   └── iteration-log.md
└── explore-handoff.json
```

Write `explore-handoff.json`:

```json
{
  "source": "@explore",
  "feature_name": "{feature-name}",
  "explore_path": ".explore/{feature-name}/",
  "design_root": ".monkeyplan/{feature-name}/explore-design/",
  "handed_off_at": "{ISO8601}"
}
```

**Do not** copy explore design to `discovery-brief.md` — that file is reserved for `@monkeythink` (Path C).

### B2. Announce

```
"Technical design copied to .monkeyplan/{feature-name}/explore-design/.
Invoke: @monkeyplan for {feature-name}
@monkeyplan will use Path E (Explore Design Import) — not Path C."
```

Update explore `handoff.plan_path` to `.monkeyplan/{feature-name}/`.

---

## Handoff Path C: Manual

Set `handoff.accepted: false`, `phase_status.handoff: "skipped"`.

---

## Complete explore session

```json
{
  "current_phase": "completed",
  "phase_status": { "handoff": "completed" },
  "handoff": {
    "accepted": true,
    "target": "monkeymode|monkeyplan",
    "monkeymode_path": ".monkeymode/{feature-name}/",
    "plan_path": ".monkeyplan/{feature-name}/"
  }
}
```

## POC cleanup (optional)

Ask whether to keep `pocs/{feature}/` for reference. Do not delete without consent.

## Never

- Write `artifacts.design` — MonkeyMode uses `artifacts.design_docs`
- Hand off to `@monkeyplan` via `discovery-brief.md` or claim Path C
- Skip stack detection on `@monkeytriage` handoff
- Omit `workflow_tier`, `detected_stack`, `parallel_execution`, `integration`, or `acceptance` from Full handoff state
- Omit `workflow_tier: "lite"` from Lite handoff state
- Start `@monkeytriage` implementation inside this skill
