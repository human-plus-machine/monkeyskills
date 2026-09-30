---
name: system-design
description: Phase 1 - High-Level System Design. Proposes a conceptual architecture matching PRD scope, lists core backend/frontend components, describes data flow step-by-step, and recommends a data storage strategy with justification. Conceptual only — no file/function-level design.
---

# Phase 1: High-Level System Design

## Purpose

Produce **Section 1** of the blueprint: a conceptual architecture that a reader can reason about without seeing code. This is the "shape of the system," not its implementation. File- and function-level design is `@monkeymode` Phase 1 (design) and Phase 3 (code spec), not here.

## Inputs

- The PRD (`context.prd_path`)
- `context.detected_stack` (conform to it; if greenfield, propose and flag in Section 5)
- The SiteMap (informs which components map to which repos/teams)

## What to Produce

Write Section 1 of `blueprint.md` using the template. Cover four parts:

### 1.1 Conceptual Architecture

Select the architecture pattern that matches PRD scope, and **justify the choice against the PRD**, not as a default. Choose from (or combine) patterns such as:

| Pattern | Fits when |
|---------|-----------|
| Monolith / modular monolith | Single team, tight coupling acceptable, fast iteration |
| Microservices | Multiple owning teams (per SiteMap), independent scaling/deploy |
| Serverless / event-driven | Spiky load, async workflows, pay-per-use, glue between systems |
| Agentic AI / multi-agent | Reasoning loops, tool use, human-in-the-loop decisioning |
| Software factory / pipeline | Repeatable generation/transformation of artifacts |
| Batch / streaming data pipeline | High-volume ingest, ETL, analytics |

State the chosen pattern in one sentence, then 2–4 bullets of justification tied to specific PRD requirements. If the existing stack constrains the choice, say so.

### 1.2 Core Components

List the core **backend** and **frontend** components required. For each: name, one-line responsibility, and (via SiteMap) the likely **org / team / repo**. Keep it at the service/module level — not classes. Prefer SiteMap `provides`/`aliases` over the locally checked-out repo.

```markdown
**Backend**
| Component | Responsibility | Org | Owning team / repo (SiteMap) |
|-----------|----------------|-----|------------------------------|
| ... | ... | ... | ... |

**Frontend**
| Component | Responsibility | Org | Owning team / repo (SiteMap) |
|-----------|----------------|-----|------------------------------|
| ... | ... | ... | ... |
```

If Eng is present (`context.engineering_present`), confirm ownership claims before locking.

If the feature is non-UI (service/data only), say so explicitly and omit frontend.

### 1.3 Data Flow (Step-by-Step)

Describe the primary flow as a numbered, text-based sequence — trigger → components touched → data transformations → outputs. Include the main success path and note where it forks for the most important alternate/error path. A small Mermaid `sequenceDiagram` or `flowchart` is encouraged but the numbered text is required.

### 1.4 Data Storage Strategy

Recommend the storage approach with a brief justification per choice:

| Concern | Recommendation | Justification |
|---------|----------------|---------------|
| Primary store | Relational / Document / Key-value / Graph / ... | Why this shape fits the access pattern |
| Cache layer | Yes/No — which | Read-heavy? Latency target? |
| Search / analytics | If applicable | Query shape that the primary store handles poorly |
| Object/blob | If applicable | Large artifacts, media, exports |

Tie each to a PRD access pattern (read-mostly, write-heavy, transactional, eventual consistency tolerance). Do not over-provision — note where the existing stack already provides the capability.

## Checkpoint

Present Section 1 and ask: *"Does this architecture match your intent? Anything to adjust before I size the effort (Section 2)?"* On confirm, update state:

```json
{ "current_phase": "2", "phase_status": { "system_design": "completed", "effort_estimation": "in_progress" },
  "context": { "architecture_pattern": "<chosen pattern>" } }
```

## Definition of Done

- [ ] Architecture pattern chosen and justified against the PRD
- [ ] Backend + frontend components listed with SiteMap ownership
- [ ] Data flow described as numbered steps (diagram optional)
- [ ] Storage strategy recommended with per-choice justification
- [ ] No file/function-level detail (that is `@monkeymode`)
- [ ] Section 1 written to `blueprint.md`; state advanced
