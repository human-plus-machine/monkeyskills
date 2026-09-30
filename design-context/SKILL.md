---
name: design-context
description: design-context - a standalone, read-only skill at the requirement-to-build boundary (after @monkeyplan, before @monkeymode). It reads a requirement artefact plus the local repo, @document-codebase docs, and optional project guardrail documents (read-if-present), maps the requirement onto three axes (tech, platform, cloud-framework) plus a degraded semantic axis, and emits a design-context.md artefact. design-context.md is a shared, read-if-present architectural context bus: any skill may read it, nothing hard-depends on it. Use when preparing architectural context before @monkeymode design, deciding multi-cloud / pillar targets for Phase 1C (IaC design), or whenever a requirement needs to be mapped onto the existing system before code is written. Invoke with @design-context for [feature].
author: MonkeyMode Contributors
---

# design-context — Architectural Context Bus

## Intent

This skill applies the principle "read the existing system before writing code". It sits at the **requirement-to-build boundary** — after `@monkeyplan` (or another requirement artefact) has produced a requirements artefact, and before `@monkeymode` begins design. It is **read-only**: it never modifies code, MonkeyMode state, or any other skill's artifacts. Its single output is a `design-context.md` artefact that maps the requirement onto the existing system.

`design-context.md` is a **shared, read-if-present architectural context bus**, following a read-if-present artefact model (like the optional guardrail documents): *any skill may read it; nothing hard-depends on it.* When present, downstream skills (`@monkeymode`, `@monkeymode-lite`, `@commit`) pre-seed their own decisions from it instead of re-deriving them. When absent, every consumer degrades gracefully to its existing behaviour.

**User invokes:** `@design-context for [feature]`

**The agent guides through three phases:**

1. **Phase 0: Intake** — Locate and ingest the richest available requirement artefact (`@monkeyplan` preferred), plus architectural inputs: `@document-codebase` docs (local semantic map), and optional project guardrail documents (architecture principles, compliance constraints) that the user points to, or that live under `docs/guardrails/` if present (invariants and anti-patterns).
2. **Phase 1: Three-Axis Impact Analysis** — Map the requirement onto the tech axis, platform axis, and cloud-framework axis; resolve the semantic axis as far as the local repo allows (degraded in v1); recommend an integration style.
3. **Phase 2: Emit design-context** — Write `.design-context/{feature}/design-context.md` (human-readable markdown plus one fenced JSON block that is the machine-readable source of truth), with explicit degradation notes for any axis that could not be fully resolved.

## How This Skill Differs From Related Skills

| Skill | What it does |
|---|---|
| `@monkeythink` | Explores problem framing and solution directions (pre-requirements — too early to feed design-context) |
| `@monkeyplan` | Produces and reviews the requirements artefact (the preferred requirement **input**) |
| Project guardrail documents (optional) | Describe architecture principles, compliance constraints, and anti-patterns (a read-if-present guardrail **input** to design-context) |
| `@document-codebase` | Documents an existing codebase: architecture, components, dependencies (a semantic **input** to design-context) |
| `design-context` (this skill) | Maps a requirement onto the existing system across three axes; emits the `design-context.md` context bus |
| `@monkeymode` / `@monkeymode-lite` | Designs, builds, verifies, and integrates the feature, including inlined IaC generation in Phase 1C (the primary **consumer** of `design-context.md`) |

Run `@design-context` once per feature, after requirements are stable and before `@monkeymode`. Re-run it when the requirement materially changes.

## The Three Axes (plus the semantic axis)

design-context maps every requirement onto three resolvable axes and one degraded axis:

| Axis | Question it answers | v1 source | Degrades to |
|---|---|---|---|
| **Tech** | What language / framework / version is this, and which framework supplement applies? | Local config files (reuses MonkeyMode Phase 1A Step 0 detection) | Never degraded locally |
| **Platform** | What platform (e.g. shared vs per-unit components, if the platform distinguishes them), which platform supplement applies, which invariants are in play, what platform discovery questions are pre-answered? | Local platform signals + guardrail invariants (if present) | "platform unknown" note |
| **Cloud-framework** | What `clouds[]` are targeted, what pillar profile applies, which per-resource Well-Architected / framework checks (REL-5, SEC-3, ...) are relevant? | Requirement artefact + local IaC | "cloud target unknown" note |
| **Semantic** *(degraded in v1)* | Which components are affected, what is the contract delta, who are the downstream consumers? | `@document-codebase` inventory, scoped to the local repo only | Cross-repo consumers flagged "unknown" |

A future version may resolve the semantic axis fully via a cross-repo service catalog or dependency graph. In **v1** it is explicitly degraded and the degradation is recorded verbatim in the artefact.

## Workspace Setup

### On First Invocation

When `@design-context` is invoked, **ALWAYS**:

1. **Extract feature name** from the user's request (convert to kebab-case).
2. **Check for state file:** Read `{workspace}/.design-context/{feature-name}/state.json`.
3. **If state file does not exist:**
   - Create the `.design-context/{feature-name}/` directory in the workspace.
   - Create an initial `state.json` with `current_phase: "0"`.
   - Locate input artefacts (see [Accepted Inputs](#accepted-inputs)).
   - Start Phase 0 (Intake).
4. **If state file exists:**
   - Read `current_phase` and resume from there.
   - Announce: "Resuming design-context for '{feature-name}'. Currently in Phase {N}."

### Accepted Inputs

Before doing any analysis, locate whichever of these are present. design-context reads them; it never writes to them.

| Input | Where to look | Axis it feeds |
|---|---|---|
| **Requirement artefact** (richest wins) | `.monkeyplan/{feature}/` (preferred), then `.monkeythink/{feature}/discovery-brief.md`, then `.monkeymode/{feature}/prt.md`, then a user-supplied path | All axes (the requirement summary + scope) |
| **`@document-codebase` docs** | `docs/codebase/` (`architecture.md`, `component-inventory.md`, `dependencies.md`, `api-documentation.md`) | Semantic axis (local, degraded Semantic Layer) |
| **Project guardrails** (optional) | Guardrail documents the user points to, or `docs/guardrails/` if present (e.g. `anti-patterns.md`, `interaction-principles.md`, `architecture-summary.md`) | Platform + cross-cutting guardrails |
| **Local stack signals** | Workspace config files (`package.json`, `pom.xml`, `pyproject.toml`, `*.csproj`, `*.tf`, etc.) | Tech + cloud-framework axes |
| **Local platform signals** | `PLATFORM.md`, `monkeymode.config.yaml` (`platform:` key) | Platform axis |

If a higher-value input is missing, fall back to the next and **record the fallback as a degradation note** — never silently proceed as if the richest input were present.

### State File

Maintain `{workspace}/.design-context/{feature-name}/state.json`:

```json
{
  "feature_name": "string (kebab-case)",
  "current_phase": "0",
  "phase_status": {
    "intake": "not_started|in_progress|completed",
    "axis_analysis": "not_started|in_progress|completed",
    "emit_design_context": "not_started|in_progress|completed"
  },
  "inputs": {
    "requirement_artefact": { "path": null, "type": "monkeyplan|monkeythink|monkeymode|other|none", "ingested": false },
    "document_codebase": { "path": "docs/codebase/", "present": false, "stale": null },
    "guardrails": { "path": null, "present": false }
  },
  "axes": {
    "tech": "not_resolved|resolved|degraded",
    "platform": "not_resolved|resolved|degraded",
    "cloud_framework": "not_resolved|resolved|degraded",
    "semantic": "not_resolved|resolved|degraded"
  },
  "artifacts": {
    "design_context": ".design-context/{feature-name}/design-context.md"
  },
  "degradation_notes": [],
  "version": "v1",
  "last_updated": "ISO8601 timestamp"
}
```

### Workspace Artifact Structure

All generated files go in the **user's workspace** in a skill-neutral namespace (NOT in the skills directory, NOT under `.monkeymode/`):

```
{workspace}/
└── .design-context/
    └── {feature-name}/
        ├── state.json              # State tracking (agent creates this)
        └── design-context.md       # The shared context bus (Phase 2 output)
```

> **Why `.design-context/` and not `.monkeymode/`?** Keeping the bus MonkeyMode-independent is exactly what lets `@commit` and any future skill read it without reaching into another skill's workspace. It follows the same skill-neutral workspace-namespace convention as other read-if-present artefacts.

## Phase Flow & State Management

### Phase Detection Logic

| `current_phase` | `phase_status` key | Phase Guide |
|---|---|---|
| `"0"` | `intake` | `phases/00-intake.md` |
| `"1"` | `axis_analysis` | `phases/01-axis-analysis.md` |
| `"2"` | `emit_design_context` | `phases/02-emit-design-context.md` |
| `"completed"` | — | design-context emitted |

```
1. Extract feature name from the user's request (convert to kebab-case)
2. Read {workspace}/.design-context/{feature-name}/state.json
3. If file doesn't exist:
   → Create .design-context/{feature-name}/ directory
   → Create state.json with current_phase: "0"
   → Start Phase 0 (Intake)
4. If file exists:
   → Read current_phase field (see mapping table above)
   → If "completed": announce the artefact is ready, offer to re-run an axis or refresh
   → Otherwise: resume from that phase, load inputs for continuity
```

### Phase Transitions

**Never auto-advance phases. Always ask the user for confirmation.**

After completing work in a phase:
1. Save the artefact / state to workspace.
2. Update `state.json` with completed status.
3. Ask: "Phase [N] complete. Ready to move to Phase [N+1]?"
4. Only advance when the user confirms.

Approval is per-phase, never cumulative.

## Phase Reference Guides

Read these files from the skills directory for detailed methodology before executing each phase:

- **Phase 0 (Intake):** Read `phases/00-intake.md` — locate and ingest the requirement artefact and architectural inputs; populate `inputs` and record fallbacks.
- **Phase 1 (Three-Axis Impact Analysis):** Read `phases/01-axis-analysis.md` — resolve tech / platform / cloud-framework axes, degrade the semantic axis, recommend an integration style.
- **Phase 2 (Emit design-context):** Read `phases/02-emit-design-context.md` — assemble the artefact from `templates/design-context-template.md`; the fenced JSON block is the source of truth and MUST NOT diverge from the surrounding markdown.

## The design-context.md Artefact (the Shared Context Bus)

Written to `.design-context/{feature-name}/design-context.md`. The file is **markdown for humans, with exactly one fenced ` ```json ` block that is the machine-readable source of truth.** Consumers parse the JSON block for deterministic ingestion; the markdown around it is for review. The two MUST NOT diverge.

The artefact carries:

- **Requirement summary** — distilled from the requirement artefact.
- **Affected components** — component → files → role (degraded to local repo in v1).
- **Contract delta** — per contract: change type (add / modify / remove), breaking (yes / no), known consumers.
- **Tech axis** — `detected_stack` (language / framework / version / build tool / test framework) + framework supplement name or `none`.
- **Platform axis** — platform value, classification, supplement-loaded flag, invariants in play, pre-answered platform discovery questions.
- **Cloud-framework axis** — `clouds[]`, pillar profile, per-resource framework check list.
- **Domain routing** — domains touched, and whether each change is to the source of truth or a derived view (best-effort in v1).
- **Integration-style recommendation** — event-driven vs synchronous, via the fan-out heuristic, with rationale.
- **Guardrails** — invariants and anti-patterns carried in from the project guardrail documents (if present).
- **Degradation notes** — which axes are degraded and why (e.g. "cross-repo consumers unknown: no Semantic Layer in v1").

See `templates/design-context-template.md` for the full schema and the canonical JSON keys.

## Cross-Skill Context Bus — Producer / Consumer Map

`design-context.md` spans the build-to-clearance arc, not just MonkeyMode.

**Producers (feed `@design-context`):**

- `@document-codebase` — its inventory is a degraded local Semantic Layer (highest-value input synergy).
- Project guardrail documents (optional, e.g. `docs/guardrails/`) — invariants + anti-patterns as guardrails (read-if-present).
- `@monkeyplan` — the requirements input (its PRT and epic breakdown are richer than a raw requirements doc).

**First-class consumer (v1):**

- `@monkeymode` / `@monkeymode-lite` — Phase 1A Step 0.5 pre-seeds `state.json.context` (skips re-deriving `detected_stack` / platform / `clouds`; feeds the contract delta into Phase 1B contract design). The cloud-framework axis (`clouds[]`, pillar profile, per-resource checks, domain routing) drives **Phase 1C** IaC design — infrastructure generation is inlined into MonkeyMode, not a separate skill. The pillar profile and compliance signals inform MonkeyMode verification and the external CI/CD quality gate.

**Secondary consumers:**

- `@commit` — enrich PR descriptions with the contract delta + capability map + downstream-consumer list.

## Resuming Work

If the user invokes `@design-context` in a workspace with existing state:

1. Extract feature name from the request.
2. Read `state.json`.
3. Announce: "Resuming design-context for '{feature-name}'. Currently in Phase {N}."
4. Load inputs and continue from the current phase.

If the user does not specify a feature name, list available features by scanning `.design-context/`:

```
Found existing design-context projects in this workspace:
1. user-role-selector (Phase 1: Axis Analysis)
2. csv-import (completed — design-context.md ready)

Which feature would you like to continue with, or start a new one?
```

## Agent Instructions Summary

### On Every Invocation

1. Extract feature name (or list available if not specified).
2. Read `.design-context/{feature-name}/state.json`.
3. Determine phase (or start at 0).
4. Load the phase guide from `phases/`.
5. Load inputs (requirement artefact, `@document-codebase` docs, optional guardrail documents).
6. Execute the phase methodology.
7. Write artefacts to `.design-context/{feature-name}/`.
8. Update `state.json`.
9. Ask for confirmation before advancing.

### Never Do

- ❌ Modify code, MonkeyMode state, or any other skill's artifacts — design-context is strictly read-only except for its own `.design-context/{feature}/` namespace.
- ❌ Write the artefact anywhere other than `.design-context/{feature-name}/` (never under `.monkeymode/`).
- ❌ Let the markdown and the fenced JSON block diverge — the JSON block is the single source of truth.
- ❌ Claim an axis is resolved when its input was missing — always emit a degradation note.
- ❌ Auto-advance phases without user confirmation.
- ❌ Invent `clouds[]`, pillar profiles, or contract consumers the inputs do not support — mark them unknown and degrade.
- ❌ Re-scan the full codebase when `@document-codebase` docs are present and fresh — consume them.
- ❌ Re-ask requirement questions already answered by the requirement artefact.

### Always Do

- ✅ Extract feature name first; check `state.json` before doing anything.
- ✅ Ingest the richest available requirement artefact (`@monkeyplan` > `@monkeythink` discovery brief > `.monkeymode/{feature}/prt.md` > user-supplied), and record fallbacks as degradation notes.
- ✅ Consume `@document-codebase` docs as the local semantic map; signal staleness if the docs predate recent commits.
- ✅ Carry the guardrail invariants + anti-patterns into the artefact as hard guardrails (when present).
- ✅ Resolve the tech, platform, and cloud-framework axes from local evidence; degrade the semantic axis explicitly in v1.
- ✅ Emit markdown + exactly one fenced JSON block; keep them in sync.
- ✅ Record every degradation verbatim so downstream consumers see the gap.
- ✅ Update `state.json` and `last_updated` after significant actions.
- ✅ Treat `design-context.md` as read-if-present downstream — its absence must never break a consumer.

## What This Skill Does NOT Do

- Does not write code, design docs, infrastructure, or tests — those belong to `@monkeymode` (which inlines IaC generation in Phase 1C) and the external CI/CD quality gate.
- Does not modify the requirement artefact or any producer's workspace.
- Does not perform cross-repo resolution in v1.
- Does not replace MonkeyMode Phase 1A discovery — it pre-seeds it. MonkeyMode still owns the design.
- Does not enforce anything — it decides and records; consumers enforce.
