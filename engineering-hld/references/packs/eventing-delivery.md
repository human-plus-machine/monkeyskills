# Pack: Eventing and Delivery

Load for queues, logs, pub/sub, webhooks, asynchronous workers, CDC, and
event-driven workflows.

## Topology-changing questions

1. **What delivery, ordering, and duplication semantics does the business
   effect require?** Recommend at-least-once transport plus idempotent effects
   unless a stricter invariant is proven and affordable.
2. **What maximum queue age and loss window are acceptable?** Recommend explicit
   age-based freshness and durability requirements; queue length alone cannot
   determine capacity or recovery.

## Required invariants

- Producer acknowledgment has a precise durability boundary.
- Event identity, schema/version, partition key, event time, and correlation
  identity are defined.
- Consumer effects specify idempotency/deduplication scope and retention.
- Ordering scope is explicit: global, partition/key, aggregate, or none.
- Retry, delay, dead-letter/quarantine, replay, and poison-event ownership are
  defined.
- Schema evolution and consumer compatibility are testable.
- If database state and event publication must agree, define the atomicity
  mechanism or accepted inconsistency.

## Capacity formulas

```text
ingress_bytes_per_s = events_per_s × average_event_bytes
consumer_work_per_s = events_per_s × average_fanout × work_per_delivery
lag_growth_per_s = ingress_events_per_s - processing_events_per_s
recovery_seconds = backlog_events / (processing_events_per_s - ingress_events_per_s)
dedupe_storage = unique_events_in_window × bytes_per_dedupe_entry
```

Capacity must include retry amplification, fan-out, burst duration, retention,
largest message, and partition-key skew.

## Failure probes

- producer times out after durable append and retries;
- database commit succeeds but publication fails, or the reverse;
- consumer crashes after side effect but before acknowledgment;
- poison event creates infinite retries or partition blockage;
- hot key serializes one partition;
- slow consumer exceeds retention;
- replay repeats an irreversible external effect;
- schema rollout breaks lagging consumers;
- dead-letter queue becomes permanent unowned storage;
- webhook receiver is slow, unavailable, or malicious.

## Mechanism cautions

- A queue/log is earned by temporal decoupling, burst absorption, replay, or
  fan-out—not merely “microservices.”
- “Exactly once” is invalid unless the specific end effect and failure boundary
  are proven.
- A transactional outbox is earned only when state/event atomicity is required;
  it also needs relay lag, cleanup, ordering, and duplicate semantics.
- More partitions increase throughput only when workload parallelizes and key
  ordering/skew permit it.

## Observability and kill conditions

Measure oldest-event age, backlog, ingress/process rates, retry amplification,
redelivery, poison/quarantine counts, partition skew, publish latency, consumer
errors, and end-to-end business-effect latency.

Kill conditions should test sustained lag growth, replay safety, duplicate
effect rate, hot-partition concentration, and retention exhaustion.
