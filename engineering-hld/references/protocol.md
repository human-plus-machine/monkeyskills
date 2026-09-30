# Architecture Decision Protocol

Load after recon, before Ground. Later steps load [earn](earn.md),
[operate](operate.md), [critique](critique.md), and [verify](verify.md).
FR, NFR, entities, API: [contract-first](contract-first.md).

## Evidence discipline

Classify every consequential input:

- **Measured** — telemetry or benchmark with source and time window.
- **Sourced** — requirement, ADR, code, configuration, or user statement.
- **Assumption** — allowed only in draft/assume/exploratory mode.
- **TBD** — unknown; it cannot justify a dependent mechanism.

Preserve provenance beside the value. A hypothesis stays Assumption or TBD
until a source and time window exist. Separate current, launch, and forecast
load.

When two authorities conflict, stop and report:

1. the two claims and exact sources;
2. the architecture decision affected;
3. the recommended resolution;
4. the one user decision required.

## Topology-changing inputs

Establish only requirements that can change topology:

- system boundary, actors, and excluded scope;
- peak/average demand and burst shape;
- payload or record size and growth;
- retention and deletion obligations;
- p50/p95/p99 latency and availability target where relevant;
- consistency class: strong, bounded staleness, read-your-writes, eventual;
- ordering, uniqueness, idempotency, and delivery requirements;
- tenancy, data sensitivity, residency, and trust boundaries;
- recovery objectives only when durability or disaster recovery is in scope;
- team/runtime constraints that affect operability.

Represent business correctness as invariants. Example: “A retried request
creates at most one charge.”

## Number gate

Required before mechanism choice:

- Full HLD: peak QPS or daily events, payload/record size, retention, p99
  latency SLO, consistency class.
- Single lever: the metric the lever changes, and the current measured or
  explicitly hypothesized bottleneck.
- Critique: artifact/repository numbers only; recompute; report omissions.

Grounded: a missing gated value is asked, then work stops. Draft: every
invented value is labeled Assumption.
