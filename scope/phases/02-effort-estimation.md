---
name: effort-estimation
description: Phase 2 - Effort Estimation & Resource Scoping. Sizes the feature in Epics and person-weeks against the MonkeyMode cadence (3-member team, 1-2 epics per 2-week sprint), breaks effort down by discipline (Frontend, Backend, DevOps, QA), and names the single most complex epic.
---

# Phase 2: Effort Estimation & Resource Scoping

## Purpose

Produce **Section 2** of the blueprint: a high-level sizing estimate that maps directly to the team's delivery cadence so Product and Engineering can plan sprints and resources. Estimates are **rough, ranged, and Epic-first** — this is a blueprint, not a commitment.

## The MonkeyMode Cadence Anchor (use this exactly)

- A **3-member team completes 1–2 Epics per 2-week sprint** running the MonkeyMode process.
- Size **in Epics first**, then derive person-weeks and sprints:
  - 1 Epic ≈ 1 sprint for a 3-person team at the conservative end; 2 Epics/sprint at the optimistic end.
  - person-weeks = (sprints × 2 weeks × team members). Example: 4 Epics ≈ 2–4 sprints ≈ 12–24 person-weeks for a 3-person team.
- **MonkeyMode acceleration:** Phase 4 runs up to 10 parallel `implementer` subagents for *independent* stories. Where an Epic decomposes into independent stories, compress its calendar time and say so. Where stories are sequential (shared schema, hard ordering), do not.
- Always present a **range**, never a single number.

## What to Produce

### 2.1 Overall Sizing

State the estimate in this shape:

```markdown
**Overall size:** ~{N}–{M} Epics  →  ~{S1}–{S2} sprints  →  ~{PW1}–{PW2} person-weeks (3-person team)

**Basis:** {1–2 sentences on what drives the range — story independence, new infra, integrations}
```

List the candidate Epics (the units @monkeyplan will formalize) with a T-shirt size and **owning org/team** each. Split across orgs when SiteMap shows multi-org scope — do not put another org's work under the local team's epics.

| # | Candidate Epic | Size (S/M/L) | Owning org / team | Notes (independence, new infra, integration) |
|---|----------------|--------------|-------------------|-----------------------------------------------|
| 1 | ... | ... | ... | ... |

> These are **candidate** Epics for @monkeyplan to formalize — `@scope` sizes them; `@monkeyplan` owns their creation in your issue tracker. This list feeds the Executive Summary, §3.5 per-org scopes, and optional tracker *stub* epics at Phase 5 (@monkeyplan still formalizes them).

### 2.2 Breakdown by Discipline

Estimate per engineering discipline, expressed against the 2-week cycle. Note which disciplines run in parallel vs. gate each other.

| Discipline | Rough effort | Runs in which sprint(s) | Notes |
|------------|--------------|--------------------------|-------|
| Frontend | {person-weeks} | {e.g. S1–S2} | UI components from Section 1.2; gated by API contracts? |
| Backend | {person-weeks} | ... | Core services, data model, contracts |
| DevOps / Infra | {person-weeks} | ... | New infra? Maps to `@monkeymode` Phase 1c (01c-design-operations) |
| QA | {person-weeks} | ... | Acceptance + regression; maps to `@monkeymode` Phase 5 (05-verification) / Phase 7 (07-acceptance) |

If a discipline is not needed (e.g. no frontend), say so explicitly with a one-line reason.

### 2.3 Most Complex Epic

Name the **single** Epic that will consume the most development time and explain why (integration depth, new infra, algorithmic complexity, cross-team coordination, data migration, etc.). This is the schedule risk — call out what would de-risk it (a spike, an early contract, a prototype). Record it in state under `blueprint.most_complex_epic`.

## Checkpoint

Present Section 2 and ask: *"Does this sizing and org/team tagging match capacity? I'll next interrogate dependencies and multi-org scopes (Section 3) using the SiteMap — Eng should validate ownership."* On confirm:

```json
{ "current_phase": "3", "phase_status": { "effort_estimation": "completed", "dependencies": "in_progress" },
  "blueprint": { "epic_count_estimate": "N-M", "person_weeks_estimate": "PW1-PW2", "most_complex_epic": "..." } }
```

## Definition of Done

- [ ] Overall size given as Epics → sprints → person-weeks, ranged, anchored to the 3-person/1–2-epic cadence
- [ ] Candidate Epic list with T-shirt sizes
- [ ] Per-discipline breakdown (Frontend, Backend, DevOps, QA) tied to the 2-week cycle
- [ ] Single most complex Epic named with rationale + de-risking suggestion
- [ ] MonkeyMode parallelism noted where story independence allows
- [ ] Section 2 written; state advanced
