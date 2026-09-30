---
name: dependencies
description: Phase 3 - Dependency Interrogation + multi-org scopes. Registry-first ownership, impacted-team identification for PMs, per-org epic split, cross-org blockers. Never ranks repos by AI documentation density.
---

# Phase 3: Dependency Interrogation & Multi-Org Scope

## Purpose

Produce **Section 3** — highest product value. Surface every system, **org**, and team the feature touches **before** @monkeyplan breaks work into Epics, so Product can start inter-team / inter-org resourcing early.

This phase is **Eng + Product** together. Eng validates repo/team claims against the SiteMap; Product confirms which orgs must be in the planning conversation.

## Inputs

- Section 1 components
- Section 2 candidate epics (retag/split here if ownership was incomplete)
- SiteMap registry (`context.sitemap_source`, `orgs_in_scope`)
- PRD + prototype (named integrations, workflows)
- `references/discovery-rules.md`

## Discovery rules (mandatory)

1. **Registry first.** Resolve owners via SiteMap `orgs` → `teams` → `repos[].provides` → `capabilities` → `aliases`. Exact PRD wording is **not** required (e.g. PRD "bill split" may map to a billing alias).
2. **No AI-doc bias.** Never prefer a repo because it has `CLAUDE.md`, `AGENTS.md`, `.windsurfrules`, `.cursor/rules`, or denser docs.
3. **Multi-org default.** If ≥2 orgs are in `context.orgs_in_scope`, produce **§3.5 Per-org scopes** — do not collapse into one org.
4. **UNKNOWN > guess.** Missing owner → `UNKNOWN — confirm with PM/Eng` + §4 question.
5. **Impacted teams for PMs.** Always emit §3.4 so a PM who does not know repo ownership still sees who must join planning.

## What to Produce

### 3.1 Internal Dependencies

Existing services, DBs, or internal APIs to **consume or modify**. Map each via SiteMap.

| Dependency | Type | Consume or Modify? | Org | Owning team | Repo | Match basis | Notes |
|------------|------|--------------------|-----|-------------|------|-------------|-------|
| ... | service / DB / API | ... | ... | ... or `UNKNOWN` | ... | provides / alias / catalog / user | ... |

- Distinguish **consume** vs **modify** (modifications need cross-team scheduling).
- **Match basis** column: record *how* ownership was resolved (so bias and terminology misses are auditable).

### 3.2 External Dependencies

| Dependency | Category | Why needed | Integration risk | Contract/SLA known? |
|------------|----------|------------|------------------|---------------------|
| ... | SaaS / payments / compliance / public API | ... | ... | yes/no |

Flag procurement / legal / security / data-residency lead times.

### 3.3 Blocking Dependencies

| Blocker | Blocks which Epic(s) | Org / team / vendor | Unblock condition | Earliest parallelizable work |
|---------|----------------------|---------------------|-------------------|------------------------------|
| ... | ... | ... | ... | ... |

For each blocker, identify what work **can** proceed in parallel so the blocked team isn't fully idle. Record blockers in `state.blueprint.blocking_dependencies`.

### 3.4 Impacted Teams (for PMs)

**Required.** A PM-facing rollup — even when Eng already knows the graph.

| Org | Team | Why involved | Repos | Must join planning? | Confidence |
|-----|------|--------------|-------|---------------------|------------|
| Platform | ... | ... | ... | yes/no | high/med/low |
| Web | ... | ... | ... | yes/no | ... |
| Billing | ... | ... | ... | yes/no | ... |

Rules:
- Include every org in `context.orgs_in_scope` plus any newly discovered via aliases.
- `Must join planning? = yes` when the team **modifies** a system or owns a **blocking** dependency.
- Copy confirmed rows into `context.impacted_teams`.

### 3.5 Per-Org / Per-Team Scopes (multi-org)

When ≥2 orgs are in scope (or user requests a split), produce a **scope slice per org**:

```markdown
#### {Org name} — Scope slice
- **Outcome this org delivers:** ...
- **Candidate epics (from §2.1, filtered/split):** ...
- **Repos owned here:** ...
- **Depends on (other orgs):** ...
- **Needs from Product:** ...
```

Also write a short cross-org summary:

| From org | To org | Dependency | Blocking? |
|----------|--------|------------|-----------|
| Web | Billing | billing event contract | yes |
| Platform | Web | UI surface for data object | no |

Store slices in `state.blueprint.per_org_scopes`.

If only one org is confirmed, write a single slice and note *"single-org scope — re-run discovery if additional orgs appear."*

### 3.6 Dependency Map (optional diagram)

Mermaid `flowchart` with **org swimlanes** when multi-org; mark blocking edges.

## Checkpoint

```
"Section 3 ready — impacted teams and per-org scopes are the review focus.

Have I:
  • Named the right orgs (not just the local checkout)?
  • Avoided collapsing work into one team's repos?
  • Flagged UNKNOWN owners correctly?

Confirm ownership where marked UNKNOWN. Next: edge cases + PM questions (§4)."
```

On confirm:

```json
{
  "current_phase": "4",
  "phase_status": { "dependencies": "completed", "scope_edge_cases": "in_progress" },
  "blueprint": { "blocking_dependencies": ["..."], "per_org_scopes": ["..."] },
  "context": { "impacted_teams": ["..."] }
}
```

## Definition of Done

- [ ] Internal deps mapped with org + team + match basis (or UNKNOWN + §4 question)
- [ ] Consume vs modify distinguished
- [ ] External deps with risk / procurement flags
- [ ] Blocking deps with unblock conditions + parallel work
- [ ] **§3.4 Impacted teams** filled for PMs
- [ ] **§3.5 Per-org scopes** when ≥2 orgs (or single-org note)
- [ ] No ownership inferred from AI-doc density
- [ ] State updated; section written
