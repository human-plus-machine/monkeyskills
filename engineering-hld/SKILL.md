---
name: engineering-hld
description: >-
  Contract-first engineering HLD — lock API, council picks a candidate, spine
  earns each extra box. Invoke with @engineering-hld.
version: 1.0.0
author: MonkeyMode Contributors
disable-model-invocation: true
---

# Engineering HLD

**User invokes:** `@engineering-hld` / `/engineering-hld`

Deliver a working HLD **contract-first**
([sequence](references/contract-first.md)). **Council** proposes candidates
for that contract; the **spine** (numbers → bottleneck → earned mechanism →
failure → falsification) is how every extra box is judged.

Ends at `design.md` (with Mermaid topology; optional diagram exports) under `<module>/docs/architecture/`.
Working files live in `{workspace}/.engineering-hld/{slug}/`. MonkeyMode, `@scope`,
`@monkeyplan`, PRD, issue trackers, IaC, and implementation stay on their own skills.

## How this skill differs

| Skill | What it does |
|---|---|
| `@scope` | Ownership, estimates, sign-off — not a judged mechanism spine |
| `@monkeyplan` | Product / UX / epics |
| `@design-context` | Architecture context bus → `.design-context/` (read-if-present). Does not earn caches/queues |
| `@engineering-hld` (this skill) | Contract-first HLD; council then Earn |

## On first invocation

1. Extract a kebab-case **slug** from the topic, module, or system name. Ask
   once if missing.
2. Create `{workspace}/.engineering-hld/{slug}/` if it does not exist.
3. If `ledger.md` exists, read it and resume; do not rebuild facts already
   recorded.
4. After Recon, **write** `ledger.md` (every store, contract, auth, job, SLO,
   or `absent: {name}`) **before** Questions. Update it when recon facts
   change. Council reads this file; do not keep the ledger only in chat.

## Branches

Infer one; ask once only when ambiguous:

- **Full HLD** — complete system or major capability.
- **Single lever** — one mechanism (cache, partition, queue, index, extraction).
- **Critique** — test a proposal, document, diagram, or PR.

## Steps

1. **Recon.** Workspace topology, stores, contracts, auth, tenancy, ADRs,
   SLOs, traffic, naming, cloud, operability. Brownfield extends that topology
   unless a number or named failure earns replacement.
   **Done when:** `ledger.md` lists every store, contract, auth, job, and SLO
   found, or `absent: {name}` for each missing class, the file is on disk
   under `.engineering-hld/{slug}/`, and no planned question restates a
   ledger fact.

2. **Load judgment.** Read [protocol](references/protocol.md).
   **Done when:** evidence classes and the **number gate** are in context.

3. **Authority.** On conflict with code, ADRs, or documented constraints, stop
   and report per the protocol conflict procedure.
   **Done when:** no conflict remains, or the user has chosen.

4. **Ground.** Default **grounded**. `draft` / `assume` / `exploratory` allows
   labeled Assumptions. Apply the number gate.
   **Done when:** mode and grounding are set, every gated input is classified,
   and grounded mode has the gated values or has asked and stopped.

5. **Questions.** At most three core questions, one at a time, each with a
   recommended answer. A loaded pack may add two (five total). Ask only what
   can change topology.
   **Done when:** remaining unknowns are TBD/blockers; count ≤3 (+2 if pack);
   no question restates the ledger.

6. **Load packs.** Load at most two:
   [identity](references/packs/identity-resolution.md),
   [serving](references/packs/serving-api.md),
   [pipelines](references/packs/data-pipeline-databricks.md),
   [eventing](references/packs/eventing-delivery.md),
   [storage](references/packs/storage-consistency.md).
   Critique also reads [critique](references/critique.md).
   **Done when:** every pack matches the domain; Critique has critique.md loaded.

7. **Contract.** Follow [contract-first](references/contract-first.md).
   Critique: recompute the artifact’s numbers; fill Findings from critique.md.
   **Done when:** Full HLD/Single lever — FR, NFR, entities, and API tables
   filled, every FR has an API row, data flow is a sequence or an omit line,
   HLD boxes still empty. Critique — Findings table started; numbers recomputed.

8. **Council.** Full HLD: read [council](references/council.md) and dispatch.
   Single lever and Critique skip.
   **Done when:** Full HLD — council.md’s Done when. Other branches — skipped.

9. **Earn.** Read [earn](references/earn.md). Formulas with units and
   substitutions. A `TBD` term cannot earn a dependent mechanism. Headroom is
   Sourced, Assumption, or TBD. Earned-mechanism test on every cache, queue,
   shard, index, extra service, stream processor, CQRS split, and
   multi-region topology. Start from the council winner (Full HLD).
   **Done when:** the system-level first bottleneck is named with a confirming
   metric, and every kept mechanism has earning evidence.

10. **High-level design.** Boxes that satisfy the API, endpoint by endpoint.
    Schema fields that matter sit next to the store. Call out unevaluated
    caches/queues; they land in deep dives unless already earned.
    **Done when:** every FR has a path on the diagram; no unevaluated
    cache/queue is drawn as a required box; Mermaid matches the API.

11. **Deep dive.** Read [operate](references/operate.md). Apply earn.md’s
    four-statement bottleneck to every kept component (Full HLD), the chosen
    lever, or each Critique Blocker/Risk.
    **Done when:** the deep-dives table has one row per kept component.

When step 11 is done, read [close](references/close.md) and finish its last
**Done when**.

## Examples

One Full HLD example:

| Kind | Path | Use |
|---|---|---|
| **Greenfield** | [`examples/greenfield-full-hld.md`](examples/greenfield-full-hld.md) | Shape template. Copy no numbers. |
