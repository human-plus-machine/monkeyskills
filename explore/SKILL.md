---
name: explore
description: Explore — Spike, POC, Decide, Design. Engineering throwaway POCs before formal requirements — not your IDE's built-in Explore/codebase-search agent, and not @monkeythink (product discovery). Run runnable POCs under pocs/, iterate, lock a direction, capture technical design, hand off to @monkeyplan (Path E) or @monkeytriage. Use when the user wants to spike, prototype in-repo, or proof-of-concept an approach. Invoke with @explore for [feature].
author: MonkeyMode Contributors
---

# Explore — Spike, POC, Decide, Design

## Intent

This skill owns the **exploration phase** that happens before structured planning (`@monkeyplan`) or MonkeyMode implementation. It matches a learn-by-building workflow: explore options → build runnable POCs → iterate → lock a direction → capture a full technical design → hand off downstream.

**User invokes:** `@explore for [feature]`

This is the **explore skill** (spike / POC). It is **not** your IDE's built-in explore agent or `/explore` codebase search. Product-problem exploration and discovery briefs belong to `@monkeythink`.

**Agent guides through:**
1. **Phase 0: Framing** — Problem, constraints, 2–4 candidate approaches to spike *(conversational)*
2. **Phase 1: Spike / POC** — Build one or more **throwaway, runnable** POCs under `pocs/{feature}/` *(optional `@prototype` for UI-only spikes)*
3. **Phase 2: Iteration** — Run POCs, refine, log learnings; loop until the user is ready to decide *(open-ended)*
4. **Phase 3: Decision** — Lock chosen direction; archive rejected POCs with rationale
5. **Phase 4: Design capture** — Structured design doc: components, interactions, APIs, data model
6. **Phase 5: Handoff** — use `phases/05-handoff.md`; MonkeyMode state from `templates/monkeymode-handoff-state.json` or `monkeymode-lite-handoff-state.json`; stack detection per `guides/monkeymode-stack-detection-handoff.md`; `@monkeyplan` via Path E (not Path C, which is reserved for the `@monkeythink` discovery brief)

**Pipeline position:**

```
@explore  →  @monkeyplan (optional)  →  @monkeytriage
@explore  →  @monkeytriage (design import, skip MonkeyMode Phase 1)
```

**Not for:** production implementation, bug fixes, or features with an approved design already in place — use `@monkeytriage` or `@monkeymode-lite` directly.

## Workspace Setup

### On First Invocation

When `@explore` is invoked, **ALWAYS**:

1. **Extract feature name** from the user's request (convert to kebab-case), or ask during Phase 0
2. **Check for state file:** Read `{workspace}/.explore/{feature-name}/state.json`
3. **If state file doesn't exist:**
   - Create `.explore/{feature-name}/` directory in workspace
   - Create initial `state.json` with `current_phase: "0"`
   - Start Phase 0 (Framing)
4. **If state file exists:**
   - Read current phase and resume from there
   - Load context (feature name, options, POCs, decision, artifacts)

### Initial Preferences Setup

**After Phase 0 completes, before Phase 1, ask:**

#### Q&A Logging (Always On)

Q&A logging is **always enabled** — do **not** ask the user. Create and maintain `qa-log.md` automatically. Set `context.save_qa_log` to `true` in state.

#### POC location

Ask the user:
```
"Where should throwaway POC code live?

1. pocs/{feature}/ in this workspace (recommended — clear separation from production code)
2. A git branch (prototype/{feature}) — I'll note the branch name in state
3. Other — specify a path or convention"
```

Store as `context.poc_location` (`"workspace"` / `"branch"` / `"custom"`). Default `"workspace"`.

#### UI spikes

Ask only if any candidate approach has a significant UI surface:
```
"For UI exploration, would you like to use @prototype (standalone HTML variants) in addition to code POCs?

1. Yes — use @prototype for UI variants when we spike UI-facing options
2. No — all spikes as runnable code in the repo/branch"
```

Store as `context.prototype_skill_enabled`.

### State File Schema

The agent MUST create and maintain `{workspace}/.explore/{feature-name}/state.json`:

```json
{
  "feature_name": "string (kebab-case)",
  "current_phase": "0",
  "phase_status": {
    "framing": "not_started|in_progress|completed",
    "spike": "not_started|in_progress|completed",
    "iteration": "not_started|in_progress|completed",
    "decision": "not_started|in_progress|completed",
    "design_capture": "not_started|in_progress|completed",
    "handoff": "not_started|in_progress|completed|skipped"
  },
  "framing": {
    "problem": null,
    "constraints": [],
    "success_signal": null,
    "candidate_approaches": []
  },
  "pocs": [
    {
      "name": "queue-retry",
      "path": "pocs/order-sync/queue-retry/",
      "status": "active|rejected|archived",
      "question": "Can async retry with a dead-letter queue meet latency targets?",
      "run_command": "npm run dev",
      "verdict": null
    }
  ],
  "decision": {
    "chosen": null,
    "rationale": null,
    "rejected": [],
    "open_questions": []
  },
  "artifacts": {
    "options": ".explore/{feature-name}/options.md",
    "iteration_log": ".explore/{feature-name}/iteration-log.md",
    "decision": ".explore/{feature-name}/decision.md",
    "design": ".explore/{feature-name}/design/design.md",
    "design_components": ".explore/{feature-name}/design/components.md",
    "design_api": ".explore/{feature-name}/design/api.md",
    "design_data": ".explore/{feature-name}/design/data.md",
    "design_interactions": ".explore/{feature-name}/design/interactions.md",
    "qa_log": ".explore/{feature-name}/qa-log.md",
    "pocs_root": "pocs/{feature-name}/"
  },
  "context": {
    "save_qa_log": true,
    "poc_location": "workspace|branch|custom",
    "poc_branch": null,
    "prototype_skill_enabled": false
  },
  "handoff": {
    "target": null,
    "accepted": false,
    "plan_path": null,
    "monkeymode_path": null
  },
  "last_updated": "ISO8601 timestamp"
}
```

### Workspace Artifact Structure

```
{workspace}/
├── pocs/
│   └── {feature-name}/
│       ├── {variant-a}/          # Throwaway POC — NOT production code
│       └── {variant-b}/
├── prototypes/                   # Optional — from @prototype (Phase 1 UI spikes)
│   └── {feature-name}/
└── .explore/
    └── {feature-name}/
        ├── state.json
        ├── qa-log.md
        ├── options.md            # Phase 0
        ├── iteration-log.md      # Phase 2
        ├── decision.md           # Phase 3
        └── design/               # Phase 4
            ├── design.md         # Overview + index
            ├── components.md
            ├── interactions.md
            ├── api.md
            └── data.md
```

## Phase Flow & State Management

### Phase Detection Logic

| `current_phase` | `phase_status` key | Phase Guide |
|-----------------|-------------------|-------------|
| `"0"` | `framing` | `phases/00-framing.md` |
| `"1"` | `spike` | `phases/01-spike.md` |
| `"2"` | `iteration` | `phases/02-iteration.md` |
| `"3"` | `decision` | `phases/03-decision.md` |
| `"4"` | `design_capture` | `phases/04-design-capture.md` |
| `"5"` | `handoff` | `phases/05-handoff.md` |
| `"completed"` | — | Feature exploration complete |

### Phase Transitions

**CRITICAL: Never auto-advance phases without user confirmation**, except:
- **Phase 0 → 1:** After framing and preferences, proceed to spike when user confirms options to build
- **Phase 1 → 2:** Automatic when at least one POC is runnable — start iteration loop

After completing work in other phases:
1. Save artifacts to workspace
2. Update `state.json`
3. **Ask user:** "Phase [N] complete. Ready to move to Phase [N+1]?"
4. If yes → update `current_phase`, start next phase

**Phase 2 is special:** The user may loop in Phase 2 many times (run POC → learn → refine). Only advance to Phase 3 when the user explicitly says they are ready to decide (e.g. "I've made up my mind", "ready to lock direction").

### Optional `@prototype` Integration

When `context.prototype_skill_enabled` is `true` and a spike is UI-only:
- Do **not** build HTML inline
- Invoke `@prototype for {feature-name}` seeded from the option description and framing
- Record paths under `prototypes/{feature-name}/` in state

## Phase Reference Guides

- **Phase 0:** `phases/00-framing.md`
- **Phase 1:** `phases/01-spike.md`
- **Phase 2:** `phases/02-iteration.md`
- **Phase 3:** `phases/03-decision.md`
- **Phase 4:** `phases/04-design-capture.md`
- **Phase 5:** `phases/05-handoff.md`
- **Agent persona:** `guides/explore-agent-instructions.md`
- **Templates:** `templates/options-template.md`, `decision-template.md`, `design-template.md`, `iteration-log-template.md`, `monkeymode-handoff-state.json`, `monkeymode-lite-handoff-state.json`
- **MonkeyMode stack detection at handoff:** `guides/monkeymode-stack-detection-handoff.md`
- **Handoff contract (checkpoint shapes):** `examples/handoff-contract.md`

## Resuming Work

If user invokes `@explore` without a feature name, list projects under `.explore/` with `current_phase` from each `state.json`.

## Agent Instructions Summary

### On Every Invocation

1. Extract feature name (or list existing projects)
2. Read `{workspace}/.explore/{feature-name}/state.json`
3. Load `guides/explore-agent-instructions.md`
4. Load the phase guide for `current_phase`
5. Load workspace artifacts for continuity
6. Execute phase methodology
7. Append Q&A to `qa-log.md`
8. Update `state.json`
9. Ask before phase transitions (except 0→1 when confirmed, 1→2 when POC runnable)

### Never Do

- ❌ Treat POC code as production-ready or merge to main without `@monkeytriage`
- ❌ Skip Phase 3 (Decision) before Phase 4 (Design capture)
- ❌ Auto-advance from Phase 2 while user is still iterating
- ❌ Import from `pocs/` into production source paths
- ❌ Hand off to `@monkeyplan` via Path C (the `@monkeythink` discovery brief handoff) — use Path E and `explore-design/`
- ❌ Write MonkeyMode `artifacts.design` — use `artifacts.design_docs` per `monkeymode/SKILL.md`
- ❌ Skip `detected_stack` population on `@monkeytriage` handoff
- ❌ Skip handoff offer after Phase 4
- ❌ Generate design from thin framing — Phase 0 must be complete
- ❌ Add tests, abstractions, or polish to POCs unless required to answer the spike question

- ✅ Keep POCs throwaway — name and path must signal disposability
- ✅ One runnable command per POC documented in state
- ✅ Log every iteration round in `iteration-log.md`
- ✅ Record verdict per POC when learned
- ✅ Split design into components, interactions, API, data in Phase 4
- ✅ Offer `@monkeyplan` and `@monkeytriage` handoff in Phase 5
- ✅ Set `context.explore_handoff: true` on MonkeyMode state when handing off design

## Quality Standards

- **Framing:** 2–4 concrete candidate approaches, each with a falsifiable spike question
- **POCs:** Runnable, minimal, throwaway; verdict captured when question is answered
- **Iteration log:** Dated entries — what was tried, observed, next action
- **Decision:** Chosen approach + rejected options with rationale
- **Design:** Complete enough for `@monkeytriage` Phase 2 (user stories) without re-discovery
- **Tone:** Fast, experimental, honest — like a senior engineer pairing on spikes
