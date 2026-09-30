# Phase 1 — Review

## Purpose

Walk each applicable dimension in order. Skip a dimension only when phase 0 marked it inapplicable. Prefer hot-path findings. Do not collect opportunistic nits that phase 2 will drop.

## Skip when

Never skip this phase. Skip individual dimensions only per the phase 0 receipt.

## Exit when

Exit after collecting findings (or confirming none) for every applicable dimension.

## Dimensions

### 1 — Algorithmic Complexity

Examine loops, recursion, and data structure operations for hidden cost.

**What to look for:**

- **Quadratic or worse loops.** Nested iterations over the same or related collections — `O(n * m)` where a lookup structure (`Map`, `Set`, dictionary, index) would yield `O(n)`. Quote the lines. State the current complexity and the achievable complexity.
- **Repeated linear searches.** `Array.find()`, `Array.includes()`, `list.index()`, or `filter` inside a loop over the same collection. Each hit is `O(n)` making the outer loop `O(n^2)`.
- **Unbounded recursion without memoization.** Recursive calls that recompute the same subproblems. State the overlap and the expected blowup.
- **Sort inside a loop.** Sorting a collection on every iteration when a single pre-sort or a heap would suffice.
- **String concatenation in a loop.** Building a string with `+=` inside a loop in languages where strings are immutable (Java, Python, C#, Go). Each concatenation copies the entire string — `O(n^2)` total.

**How to report:**

For each finding, state: current Big-O, achievable Big-O, the data size assumption from phase 0, and the concrete fix. If `n` is bounded and small, **do not collect the finding**.

### 2 — Database & Data Access

Examine how the target reads and writes data.

**What to look for:**

- **N+1 query patterns.** A query inside a loop — one query to fetch a list, then one query per item to fetch related data. Name the parent query and the child query. Prescribe eager loading, a batch query, a JOIN, or a dataloader.
- **Missing pagination / unbounded result sets.** A query that returns all rows with no `LIMIT`, no cursor, no page size. State the risk: memory pressure + transfer time scale linearly with table growth.
- **SELECT * when only a subset of columns is needed.** Especially on wide tables or tables with large text/blob columns. On a table that clearly has a handful of columns, omit or keep as LOW.
- **Writes inside a loop without batching.** Individual `INSERT` or `UPDATE` statements in a loop instead of a bulk/batch operation.
- **Missing index signals.** A `WHERE` clause or `ORDER BY` on a column. If the schema is **in the provided target**, you may cite a missing index as a finding. If the schema is **not** in scope, record it as an assumption only (`index: unverified`) — never HIGH or CRITICAL, and do not spend a report slot on it unless nothing stronger exists.
- **Connection/session churn.** Opening and closing a database connection or ORM session per operation inside a loop instead of reusing a single connection or using a connection pool.
- **Lazy-loading traps.** ORM relationships configured as lazy-load that are accessed in a loop, producing N+1 behavior hidden behind property access syntax.

### 3 — Memory & Allocation

Examine allocation patterns for waste and leak risk.

**What to look for:**

- **Unbounded in-memory collections.** Lists, maps, or caches that grow with input size and are never bounded, evicted, or garbage-collected. State the growth rate and the consequence (OOM under sustained load). If `@monkeycleaner` Phase 2 would also flag the same map as multi-instance state, report growth/OOM only — do not restate that design smell.
- **Large object allocation in hot paths.** Creating large temporary objects (buffers, copies of collections, serialized strings) per request or per iteration when a reusable/pooled object would suffice.
- **Holding references to completed work.** Event listeners, subscriptions, callbacks, or closures that capture large scopes and are never unregistered — classic memory leak pattern in event-driven systems.
- **Full materialization of lazy sequences.** Calling `.toList()`, `list()`, `collect()`, or equivalent on a stream/generator/iterator when the consumer only needs sequential access. Especially on sequences backed by large result sets.
- **Redundant copies.** Deep cloning an object when a shallow reference or immutable view would suffice. Copying a byte array for read-only use.

### 4 — Caching & Memoization

Examine whether repeated expensive work is being re-computed.

**What to look for:**

- **Repeated identical calls.** The same function is called with the same arguments multiple times in the same request/cycle — pure computation or deterministic I/O that could be memoized.
- **Cache-miss by design.** A cache keyed in a way that guarantees low hit rates (e.g., keying on the full request body when only two fields determine the result).
- **Cache without TTL or eviction.** An in-memory cache that grows indefinitely. Cross-reference with Dimension 3 (Memory). Report growth/OOM only; `@monkeycleaner` Phase 2 may also flag the same `_cache = {}` as multi-instance state.
- **Stale-while-revalidate opportunities.** An expensive read that blocks when a slightly stale cached value would be acceptable. Treat as LOW opportunistic; omit if you already have 10 stronger findings.
- **Per-request config/metadata re-reads.** Reading configuration files, feature flags, or metadata from disk or a remote service on every request when the data changes infrequently.

### 5 — Network & I/O

Examine external calls for round-trip waste and serialization cost.

**What to look for:**

- **Sequential independent calls.** Multiple HTTP/RPC/SDK calls that do not depend on each other's results but are issued sequentially. Prescribe parallelization (`Promise.all`, `asyncio.gather`, `CompletableFuture`, parallel streams).
- **Chatty APIs.** Making N small requests when a single batch endpoint exists (e.g., calling `getUser(id)` in a loop instead of `getUsers(ids)`).
- **Over-fetching then filtering.** Pulling a full response payload from an API or service, then discarding most of it client-side. If the API supports field selection or filtering parameters, prescribe using them.
- **Synchronous I/O blocking the event loop.** In async/event-driven runtimes (Node.js, Python asyncio, Vert.x), calling a blocking I/O function that stalls the event loop. Name the blocking call and the async alternative.
- **Large payload serialization.** Serializing or deserializing large objects (JSON, XML, Protobuf) on every request when partial updates or streaming would reduce cost.
- **Missing timeouts on external calls.** HTTP, gRPC, or SDK calls without explicit timeouts — a slow downstream service becomes a thread/connection leak upstream.

Do **not** flag missing retries or backoff. That is reliability (`@monkeycleaner`), not this review.

### 6 — Rendering & Frontend (if applicable)

Skip this dimension entirely if phase 0 marked Rendering inapplicable.

**What to look for:**

- **Excessive re-renders.** Components re-rendering on every state change when they depend only on a subset of state. Flag missing React `memo`, `useMemo`, or `useCallback` only with evidence of a hot-path re-render (parent state churn hitting a heavy child, or a repeated render of an expensive subtree). Without that evidence, treat as LOW opportunistic; omit if you already have stronger findings. Do not flag them as a default on Compiler-era React.
- **Angular change detection.** Default `ChangeDetectionStrategy` when `OnPush` would suffice; missing `trackBy` (or `@for` `track`) on `*ngFor` / `@for` over unbounded lists; ignoring signals / `computed` when the component already uses the signals API; leftover `ChangeDetectorRef.detectChanges()` / `markForCheck()` in a tight loop.
- **Layout thrashing.** Reading a layout property (e.g., `offsetHeight`) then writing a style in a loop — forces the browser to recalculate layout on every iteration.
- **Unoptimized list rendering.** Rendering large lists without virtualization (no `react-window`, `virtual-scroll`, CDK virtual scroll, or equivalent). State the threshold: lists over ~100 items benefit from virtualization.
- **Bundle bloat signals.** Importing an entire library for a single utility (`import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`). Dynamic import / code-splitting for routes or heavy components. Treat as LOW opportunistic; omit if you already have stronger findings.
- **Render-blocking resources.** Synchronous `<script>` tags in `<head>`, undeferred CSS for below-the-fold content, large synchronous font loads.

### 7 — Concurrency & Pools (if applicable)

Skip this dimension entirely if phase 0 marked Concurrency inapplicable.

**What to look for:**

- **Thread / connection / pool exhaustion.** Unbounded `new Thread`, `Executor` / `Task` creation per request, or a pool sized to 1 (or default) on a hot path. Name the pool and the growth rate.
- **Lock held across I/O.** `synchronized`, `lock`, `mutex`, or `asyncio.Lock` wrapping network or disk calls — other waiters stall for the round trip.
- **Single-threaded CPU on an async runtime.** CPU-heavy work on the Node.js / asyncio event loop with no worker / process offload.
- **Unbounded fan-out.** `Promise.all` / `CompletableFuture` over an unbounded collection with no concurrency limiter — connection or thread storm.

## Language-specific patterns

Apply only to the language(s) present in the target, inside the dimensions above.

### Java / Kotlin / JVM

- `synchronized` blocks holding I/O calls — threads blocked waiting for locks during network calls.
- `Stream.collect()` on large parallel streams with a non-thread-safe collector.
- Autoboxing in hot loops (`int` → `Integer` churn on every iteration).
- `String.format()` or string concatenation with `+` in tight loops — use `StringBuilder`.

### Python

- Global Interpreter Lock (GIL) — CPU-bound work in threads gains no parallelism. Flag `threading.Thread` for CPU work; prescribe `multiprocessing` or `concurrent.futures.ProcessPoolExecutor`.
- `json.dumps` / `json.loads` on large payloads per request — consider `orjson` or `msgpack`.
- Regex compilation inside a function that is called repeatedly — compile once at module level.

### JavaScript / TypeScript (Node.js)

- `JSON.parse` / `JSON.stringify` on large objects in hot paths — consider streaming parsers.
- `Array.reduce` building a new object per iteration instead of mutating an accumulator.
- `await` inside `for...of` when iterations are independent — use `Promise.all` with a concurrency cap if `n` is unbounded.

### Go

- Goroutine leaks — goroutines spawned without a `context.Done()` check or without any termination condition.
- `append` to a slice in a hot loop without pre-allocating capacity — causes repeated re-allocation and copy.
- `defer` inside a loop — deferred calls accumulate until the function returns, not until the loop iteration ends.

### C# / .NET

- `Task.Result` or `.Wait()` on async tasks — synchronously blocking an async operation, risking thread-pool starvation.
- LINQ `.ToList()` materializing large queries when `IEnumerable` streaming would suffice.
- `string.Concat` in a loop — use `StringBuilder`.

### SQL (raw queries or ORM-generated)

- Correlated subqueries that execute once per outer row — rewrite as a JOIN or CTE.
- `ORDER BY` on non-indexed columns in large result sets — only when the schema is in scope; otherwise `index: unverified`.
- `LIKE '%search%'` with a leading wildcard — cannot use a B-tree index; prescribe full-text search if applicable.

Then go to phase 2.
