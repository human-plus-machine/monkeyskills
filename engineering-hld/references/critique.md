# Critique

Load only on the Critique branch.

Use only **Blocker**, **Risk**, and **Nit**:

- **Blocker** — the design cannot be approved without resolution because it
  makes an unsupported correctness/scale claim, violates an invariant, or lacks
  a required safe path.
- **Risk** — plausible production failure or material cost/operability exposure
  with incomplete evidence.
- **Nit** — clarity or maintainability issue that does not invalidate the
  decision.

Valid finding types:

- invented or untraceable numbers;
- mechanism without an earning number/failure;
- missing or false bottleneck;
- absent rejected alternative or kill condition;
- incorrect/missing capacity arithmetic;
- hidden single point of failure;
- undefined consistency, ordering, idempotency, or recovery behavior;
- authentication/authorization gap;
- topology/data-flow contradiction;
- entity, API, or name-token mismatch;
- cloud product without a sourced provider;
- missing component deep dive;
- migration, rollback, or rebuild gap;
- unbounded resource, fan-out, retry, or backlog;
- pack-specific invariant failure;
- PII/retention gap when user data exists;
- tenant-isolation gap when multi-tenant.

Every finding cites evidence, impact, minimal remedy, and reversal evidence.
