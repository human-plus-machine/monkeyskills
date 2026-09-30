# Pack: Serving and Low-Latency APIs

Load for synchronous request/response services, low-latency reads/writes, public
or internal APIs, and online serving paths.

## Topology-changing questions

1. **Which operation and percentile define success?**
   Recommend a per-operation p99 SLO with a measurement window; an aggregate
   service latency hides the path that drives topology.
2. **Can writes acknowledge before downstream effects complete?**
   Recommend synchronous acknowledgment only through the authoritative state
   change; move side effects async only when the business invariant allows it.

## Required analysis

- Derive end-to-end latency budget across network, compute, storage, and
  dependencies. Do not allocate invented sub-budgets in grounded mode.
- Separate read/write QPS, payloads, fan-out, connection concurrency, and burst
  duration.
- Define timeout ownership and ensure nested timeouts fit the caller budget.
- Define idempotency and duplicate behavior before recommending retries.
- State pagination, filtering, consistency, rate-limit, and error contracts.
- Distinguish availability from successful-but-stale or degraded responses.

## Capacity formulas

```text
concurrent_requests ≈ request_rps × average_latency_seconds
downstream_rps = inbound_rps × calls_per_request × retry_amplification
egress_bytes_per_s = response_rps × average_response_bytes
connection_demand = concurrent_requests × connections_per_request_path
```

Use measured cache hit rate and hit/miss latency before claiming a latency gain:

```text
expected_latency = hit_rate × hit_latency + (1 - hit_rate) × miss_latency
```

## Failure probes

- dependency slowdown consumes threads/connections before outright failure;
- retry amplification turns partial degradation into overload;
- cache stampede, stale authorization, or invalidation failure;
- one tenant/key exhausts shared capacity;
- partial write succeeds but response is lost;
- incompatible client/server rollout;
- rate limiter or gateway becomes the bottleneck;
- degraded mode violates correctness while returning 2xx.

## Mechanism cautions

- Cache only with a quantified working set, expected hit rate, freshness rule,
  invalidation owner, and fallback behavior.
- Queueing is not a latency fix for a synchronous invariant.
- A new service boundary must earn independent scaling, isolation, ownership, or
  release value greater than added network/failure/operations cost.
- Multi-region active-active requires a write-conflict and data-residency model,
  not only an availability target.

## Observability and kill conditions

Measure latency by operation and dependency, saturation, inflight requests,
timeouts, retry amplification, rate-limit rejects, cache hit/miss latency,
tenant/key skew, and error reasons.

Kill conditions should test latency benefit, dependency saturation, stale-result
rate, hotspot concentration, and rollback safety.
