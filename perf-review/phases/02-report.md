# Phase 2 — Report

## Purpose

Classify every finding, drop noise, and emit the report. No prose preamble.

## Skip when

Never.

## Exit when

Exit after emitting the report (or `Pass.`).

## Severity

Every finding gets a severity. Use this rubric:

- **CRITICAL** — Will cause outage, OOM, or timeout under **normal production load on a hot path**. Fix before shipping. Example: N+1 query on a table with 100K+ rows; unbounded in-memory cache in a long-lived process. Never CRITICAL on a cold path.
- **HIGH** — Measurable latency/resource impact under expected load on a hot path. Fix in the current PR/sprint. Example: quadratic loop on a collection that grows with user input; synchronous blocking call on an async event loop.
- **MEDIUM** — Performance cost exists but is tolerable at current scale. Fix before the next scaling milestone. Example: missing pagination on a table that is currently small (`n` known and modest).
- **LOW** — Real but small hot-path cost, or future-proofing that is not a 5-element enum loop. Example: one extra copy of a large payload; `SELECT *` on a moderately wide table. Opportunistic items (stale-while-revalidate, bundle split) are LOW or omitted.

If the data size is bounded and small (e.g., a loop over an enum with 5 values), **omit it**. Do not emit LOW. If phase 0 recorded `scale projection: 10x` and 10× `n` is no longer small, you may surface it in the projection section only.

Unverified index guesses (`index: unverified`) are not HIGH or CRITICAL. Prefer omitting them when stronger findings exist.

## Cap and order

Emit at most **10** findings. Rank by severity (CRITICAL → LOW), then by hot-path impact. Drop the rest.

Omit a dimension that has no remaining findings after the cap.

## Output format

Section headings matching the dimensions that still have findings. Bullets only. Quote the exact lines. No prose preamble.

```
**Algorithmic Complexity**
- `service/UserMatcher.java:45-62` — Nested loop: for each `user` (n), iterates `permissions` (m) with `list.contains()`. Current: O(n*m). Fix: convert `permissions` to a `HashSet` before the outer loop → O(n+m). [HIGH]
- `utils/deduplicate.py:12` — `sorted(items)` called inside a while-loop that modifies `items`. Re-sorts on every iteration. Fix: use `heapq` or sort once and maintain order. [MEDIUM]

**Database**
- `api/OrderController.ts:88-95` — N+1: fetches orders (1 query), then `getCustomer(order.customerId)` per order (n queries). Fix: batch-fetch customers with `WHERE id IN (...)` or use a dataloader. [CRITICAL]
- `repo/ProductRepo.java:34` — `findAll()` with no pagination. Table grows with catalog. Fix: add `Pageable` parameter and return `Page<Product>`. [MEDIUM]

**Memory**
- `cache/SessionCache.go:22` — `sessions` map grows per active user, never evicted. Fix: add TTL-based eviction or use an LRU cache with a size cap. [HIGH]

**Caching**
- `service/PricingService.cs:55-60` — `GetExchangeRate(currency)` called 3 times in the same request with the same argument. Fix: compute once and store in a local variable. [MEDIUM]

**Network**
- `client/NotificationSender.py:30-40` — Sends HTTP POST per recipient sequentially. Fix: batch into a single request or parallelize with `asyncio.gather`. [HIGH]
- `client/ApiClient.java:78` — No timeout on `httpClient.send()`. A slow downstream blocks the caller indefinitely. Fix: set `connectTimeout` and `readTimeout`. [MEDIUM]

**Rendering**
- `components/DataTable.tsx:12` — Renders 5,000 rows without virtualization. Fix: use `react-window` or `@tanstack/virtual`. [HIGH]

**Concurrency**
- `worker/InvoiceProcessor.java:40-55` — `synchronized` around `httpClient.send()`. Other threads wait on the network round trip. Fix: lock only the map update, or use a concurrent structure. [HIGH]
```

If the target has no performance issues across all dimensions: output `Pass.` and one sentence on what makes it efficient.

## Projection mode (optional)

If phase 0 recorded `scale projection: 10x`, re-evaluate kept findings at 10× the stated or assumed `n`. Upgrade severities where the 10× projection crosses a threshold:

- A **MEDIUM** finding at current scale may become **CRITICAL** at 10x if it causes OOM or timeout on a hot path.
- A finding omitted for small `n` may appear here if 10× `n` is no longer small.

Append a `**Scale Projection (10x)**` section with the upgraded findings, the `n` baseline used, and their rationale.
