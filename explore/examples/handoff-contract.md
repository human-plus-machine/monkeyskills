# Explore handoff contract (checkpoint shapes)

This is the expected workspace layout after a successful `@explore` → `@monkeytriage` / `@monkeyplan` handoff. Agents must produce this shape; do not invent a shorter `state.json`.

Live templates: `templates/monkeymode-handoff-state.json`, `templates/monkeymode-lite-handoff-state.json`.

## Explore complete (before downstream invoke)

```
.explore/{feature}/
  state.json          # current_phase: "5" or "completed"; design_capture: completed
  design/design.md    # required — not design.md at the feature root
  design/components.md
  design/interactions.md
  design/api.md
  design/data.md
  decision.md
```

## After Handoff Path A — MonkeyMode

`.monkeymode/{feature}/state.json` is a copy of `templates/monkeymode-handoff-state.json` with placeholders replaced:

| Field | Value |
|-------|--------|
| `current_phase` | `"2"` |
| `context.workflow_tier` | `"full"` |
| `context.explore_handoff` | `true` |
| `artifacts.design_docs` | `1a` / `1b` / `1c` paths (not `artifacts.design`) |
| `context.detected_stack` | filled by Phase 1A Step 0 when detectable |

`@monkeytriage for {feature}` then hits **Path A** (state exists) and must not rewrite a blank `1a` state.

## After Handoff Path A — MonkeyMode Lite

`.monkeymode/{feature}/state.json` is a copy of `templates/monkeymode-lite-handoff-state.json`:

| Field | Value |
|-------|--------|
| `current_phase` | `"code_spec"` |
| `context.workflow_tier` | `"lite"` (required) |
| `context.explore_handoff` | `true` |
| artifacts | `design.md` (not `design/1a-discovery.md`) |

## After Handoff Path B — MonkeyPlan Path E

```
.monkeyplan/{feature}/
  explore-handoff.json
  explore-design/design.md
  explore-design/components.md
  …
```

Do **not** write `discovery-brief.md`. `@monkeyplan` Path C is the `@monkeythink` discovery brief only (`.monkeyplan/{feature}/discovery-brief.md`).

## Router Path B (invoke `@monkeytriage` before Explore Phase 5 finished writing `.monkeymode` state)

If `.explore/{feature}/design/design.md` is complete and `.monkeymode/{feature}/state.json` is missing, `@monkeytriage` must run explore `phases/05-handoff.md` Path A **before** creating a blank MonkeyMode state.
