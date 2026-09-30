---
name: scope-edge-cases
description: Phase 4 - Scope Clarification & Edge Cases. Lists 3-5 critical edge cases, scaling limitations, or security constraints not addressed in the PRD, and formulates precise technical questions the engineering team must ask the Product Manager to resolve them. Mirrors the questions to open-questions.md for sharing.
---

# Phase 4: Scope Clarification & Edge Cases

## Purpose

Produce **Section 4** of the blueprint: the gaps. Every PRD leaves implicit assumptions; this phase makes them explicit and converts each into a **precise, decision-shaped question for the PM**. The output doubles as the Eng+PM agenda for the scope review.

## What to Produce

### 4.1 Critical Edge Cases, Scaling Limits & Security Constraints

List **3–5** items the PRD does not explicitly address. Draw from these lenses:

- **Edge / boundary conditions** — empty states, zero/negative values, max sizes, concurrent edits, partial failures, idempotency, retries.
- **Scaling limits** — peak load vs. stated target, hot partitions, N+1 patterns, pagination, rate limits, cost at scale.
- **Security / privacy / compliance** — authn/authz boundaries, PII handling, data residency, audit/logging, secrets, least privilege, tenant isolation.
- **Operational** — failure modes, observability gaps, rollback, data migration/backfill, feature-flagging.

For each, state the gap and **why it matters** (the consequence if left unresolved).

```markdown
| # | Gap | Lens | Why it matters (consequence) |
|---|-----|------|------------------------------|
| 1 | ... | edge / scaling / security / ops | ... |
```

Prefer high-impact, non-obvious gaps. Do not pad to 5 with trivia — 3 sharp items beat 5 weak ones.

### 4.2 Precise Questions for the Product Manager

For each gap, write a question the PM can actually answer — specific, bounded, and tied to a decision. Avoid open-ended "have you considered…". Each question should make the trade-off visible.

```markdown
| # | Question for PM | Decision it unblocks | Default if no answer |
|---|-----------------|----------------------|----------------------|
| 1 | "At launch, what is the expected peak concurrent users — <1k, 1k–10k, or >10k? This decides whether we need a cache layer in Phase 1 or can defer it." | caching strategy / Section 1.4 | assume <1k, defer cache |
```

The **default if no answer** column lets engineering proceed on a stated assumption (which also feeds Section 5.1 assumptions) rather than blocking.

### 4.3 Mirror to `open-questions.md`

Write the Section 4.2 questions to `{workspace}/.scope/{feature-name}/open-questions.md` (respect `context.artifact_store` if different) as a clean checklist for Eng/PM. Keep it in sync with the blueprint.

If `context.prototype_status` is `none` or `declined`, include at least one question on whether to pause for `@prototype` before locking multi-org epics. If any §3 owners are `UNKNOWN`, include ownership questions here.

## Checkpoint

Present Section 4 and ask: *"These are the questions for your PM — also in open-questions.md. Adjust before safeguards and the Scope sign-off (Section 5)?"* On confirm:

```json
{ "current_phase": "5", "phase_status": { "scope_edge_cases": "completed", "safeguards_handoff": "in_progress" } }
```

## Definition of Done

- [ ] 3–5 critical gaps listed (edge/scaling/security/ops) with consequences
- [ ] One precise, decision-shaped PM question per gap, each with a default-if-unanswered
- [ ] `open-questions.md` written and in sync with Section 4.2
- [ ] Section 4 written; state advanced
