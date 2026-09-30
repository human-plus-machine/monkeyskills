---
name: design-context-intake
description: Phase 0 - Intake. Locate and ingest the richest available requirement artefact plus architectural inputs (@document-codebase docs, optional project guardrail documents, local stack/platform signals). Record every fallback as a degradation note.
---

# Phase 0: Intake

## Purpose

Assemble everything the design-context skill needs before any analysis: the requirement (what to build) and architectural inputs (what the existing system already looks like). design-context is read-only — this phase only reads, it never writes outside `.design-context/{feature-name}/`.

## Output

A populated `inputs` block in `state.json` and an internal intake summary that Phase 1 consumes. No `design-context.md` is written yet.

## Core Principle: Richest Input Wins, Degrade Loudly

Always prefer the richest available input. When a richer input is missing, fall back to the next and **record the fallback as a degradation note** in `state.json.degradation_notes`. Never silently proceed as if a missing input were present.

## Step 1: Locate the Requirement Artefact

Search in priority order and stop at the first match:

| Priority | Location | `type` |
|---|---|---|
| 1 | `.monkeyplan/{feature}/` (`prt.md`, epic breakdown, DESIGN.md) | `monkeyplan` |
| 2 | `.monkeythink/{feature}/discovery-brief.md` (problem framing only — coarser than a PRT) | `monkeythink` |
| 3 | `.monkeymode/{feature}/prt.md` (copied by a prior handoff) | `monkeymode` |
| 4 | A path the user supplies when asked | `other` |
| 5 | None found | `none` |

Resolution rules:

- The feature name and slug may differ. Match on kebab-case similarity, then confirm with the user if ambiguous.
- `@monkeyplan` is preferred because its epic breakdown and user stories are richer than a raw requirements doc — they already decompose the work, which sharpens the semantic axis.
- If only a lower-priority artefact is found, record: `"requirement artefact: using {type} ({path}); richer {higher-type} not found — requirement summary may be coarser."`
- If `type` is `none`, ask the user for a path. If they have none, design-context cannot produce a meaningful artefact — stop and tell the user to run `@monkeyplan` first (or supply a requirements artefact).

Read the full artefact. Extract the requirement summary, in-scope / out-of-scope, and any explicit non-functional requirements (scale, compliance, latency, data residency).

## Step 2: Locate the Semantic Input (`@document-codebase`)

Check for `docs/codebase/` and read the documents most relevant to the semantic axis:

| Doc | What design-context extracts |
|---|---|
| `architecture.md` | System components, integration points, data stores, deployment topology |
| `component-inventory.md` | Module → path → role (the affected-components candidate set) |
| `dependencies.md` | Internal dependency graph (who depends on what — local consumer hints) |
| `api-documentation.md` | Existing contracts (endpoints, internal interfaces, data models) for the contract-delta baseline |

Rules:

- **Consume, do not re-scan.** If these docs are present, treat them as the local Semantic Layer. Do not perform a fresh full-codebase walk.
- **Staleness check.** Compare the docs' last-modified time against recent repository activity (e.g. `git log -1 --format=%cd` against the source tree). If the docs predate substantial recent commits, set `inputs.document_codebase.stale = true` and record: `"@document-codebase docs may be stale (last generated {date}, repo changed since) — semantic axis may miss recent components."`
- **Absent docs.** If `docs/codebase/` is missing, set `present = false` and record: `"@document-codebase docs absent — semantic axis falls back to a live local scan; consider running @document-codebase first."` Phase 1 will then perform a lightweight live scan (reusing MonkeyMode Phase 1A Step 0 logic) rather than a full inventory.

## Step 3: Locate the Guardrail Input (optional project guardrail documents)

Check for optional project guardrail documents (architecture principles, compliance constraints): a path the user points to, an `ARCHITECTURE.md` / equivalent, or `docs/guardrails/` if present. Read whichever exist (typical names below):

| Doc | What design-context extracts |
|---|---|
| `anti-patterns.md` | Explicit anti-patterns — carried into the artefact as hard architectural guardrails |
| `interaction-principles.md` | Interaction / UX rules that constrain design |
| `architecture-summary.md` | Product-level architecture invariants |

Rules:

- Carry anti-patterns and invariants **verbatim** into the intake summary — they become guardrails in the artefact and propagate to every downstream consumer.
- If no guardrail documents are found, set `present = false` and record: `"guardrail documents absent — no product guardrails available; downstream consumers will not receive invariants/anti-patterns from this axis."` Do not invent guardrails.

## Step 4: Detect Local Stack and Platform Signals

These feed the tech and platform axes and are resolved from the local repo (never degraded for tech).

**Tech signals** — reuse the MonkeyMode Phase 1A Step 0 detection table (config file → language / framework / version / build tool / test framework). Detect the cloud provider for IaC projects from `required_providers` and resource prefixes.

**Platform signals** — detect a platform from any of:
- a matching platform supplement present in `{skill_dir}/monkeymode/guides/`,
- a top-level `PLATFORM.md` declaring the platform,
- a `platform:` key in a top-level `monkeymode.config.yaml`,
- explicit user assertion.

If none are present, platform is `null` (the steady state for non-platform projects) — this is **not** a degradation, just an informational note.

## Step 5: Record Intake State

Update `state.json`:

```json
{
  "current_phase": "0",
  "phase_status": { "intake": "completed" },
  "inputs": {
    "requirement_artefact": { "path": ".monkeyplan/user-role-selector/", "type": "monkeyplan", "ingested": true },
    "document_codebase": { "path": "docs/codebase/", "present": true, "stale": false },
    "guardrails": { "path": "docs/guardrails/", "present": true }
  },
  "degradation_notes": [
    "..."
  ],
  "last_updated": "<ISO8601>"
}
```

Present a short intake summary to the user:

```
## Intake Summary — {feature-name}

**Requirement artefact:** {type} at {path}
**Semantic input (@document-codebase):** present | absent | present-but-stale
**Guardrails (optional guardrail documents):** present | absent
**Detected stack:** {language} / {framework} {version} ({build_tool})
**Platform signal:** {platform | none}

**Degradation notes so far:**
- {note}

Ready to move to Phase 1 (Three-Axis Impact Analysis)?
```

## Definition of Done

Phase 0 is complete when:
- [ ] The requirement artefact is located (or the user confirmed there is none and the session stopped).
- [ ] `@document-codebase` presence and staleness are recorded.
- [ ] Guardrail-document presence is recorded and any anti-patterns/invariants captured.
- [ ] Local stack and platform signals are detected.
- [ ] `inputs` and `degradation_notes` are written to `state.json`.
- [ ] The user approves moving to Phase 1.
