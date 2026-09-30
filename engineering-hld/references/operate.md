# Operate

Load at Deep dive, after boxes are drawn.

## Failure model

Cover failures that cross the proposed boundaries:

- timeout, retry, duplicate, reordering, and partial success;
- process, node, zone, dependency, and control-plane loss as applicable;
- stale cache/index/materialized view;
- hot key or partition;
- poison message and unbounded backlog;
- schema/config rollout incompatibility;
- data corruption, accidental deletion, and rebuild;
- quota exhaustion and retry storm;
- security boundary failure.

For each material failure: detection, containment, recovery, user-visible
behavior, and owner. Explicitly name at least one accepted failure and why its
mitigation is not worth the complexity.

Retry includes timeout budget, idempotency, bounded attempts, backoff/jitter,
and overload behavior.

## Security and observability baseline

Security:

- authenticate at the trust boundary;
- authorize the resource/action, not merely the route;
- isolate tenants where applicable;
- minimize and classify sensitive data;
- encrypt in transit and at rest using existing platform controls;
- define retention, deletion, audit, and secret ownership when applicable.

Observability must test the design claims:

- service-level indicators mapped to stated SLOs;
- saturation for the predicted bottleneck;
- latency by dependency and operation;
- errors by stable reason, not message text;
- queue age/backlog, lag, skew, cache hit ratio, or rebuild progress as relevant;
- trace/correlation identity across asynchronous boundaries;
- alerts tied to user impact or exhaustion, with an owner and response.

## Decision and rejection record

Each decision states:

- chosen option;
- requirement and evidence;
- alternatives considered;
- why each alternative loses under current numbers;
- implementation/operational complexity introduced;
- rollout, rollback, and migration boundary;
- revisit trigger.

The **complexity tax** names what is deliberately not built now.

## Falsification

Every design ends with measurable kill conditions:

```text
Signal + threshold + observation window + consequence
```

Examples:

- “If one partition exceeds 25% of writes for 30 minutes at normal traffic,
  the chosen key is invalid; redesign partitioning.”
- “If the cache changes database p99 by less than 10% in the canary, remove it.”

Thresholds must be sourced or labeled assumptions. Also identify evidence that
would reverse each Critique Blocker/Risk.
