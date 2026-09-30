# Phase 0 — Scope

## Purpose

Resolve the review target, which dimensions apply, typical data size `n`, hot vs cold path, and any external assumptions.

## Skip when

Never on a fresh invocation.

## Exit when

Exit after recording the target paths, skipped dimensions, `n`, path class, and named external assumptions.

## Steps

1. Identify the target the user provided — a file, a diff, a module, or a service boundary. If none is provided, ask once. Do not default to the whole repository.
2. Stay inside that target. Do not open unrelated directories "to be thorough."
3. Classify the path:
   - **Hot** (default) — HTTP/RPC handler, request pipeline, scheduled job, queue consumer, or anything that runs per user/event.
   - **Cold** — run-once CLI, one-shot migration, test helper, or codegen. Do not treat cold-path cost as CRITICAL unless the user says this *is* the hot path.
4. If typical collection or table size is not obvious from the target, ask **once**: "What's typical collection/table size (`n`)?" If they decline or do not know, record `n: unknown` and treat hot-path collections as unbounded for severity. Do not block the review.
5. Mark dimensions to skip when they are entirely inapplicable:
   - skip **Database** when the target has no data access
   - skip **Caching** when there is no repeated work, cache, or memoization
   - skip **Network** when there are no outbound HTTP/RPC/SDK/file-remote calls
   - skip **Rendering** when the target is backend-only
   - skip **Concurrency** when there are no threads, locks, pools, async workers, or parallel streams
6. If the target's performance depends on something outside the target (a downstream service, a database schema, a queue), name it and state the assumption. Do not chase it.
7. Announce one scope receipt:
   - target paths
   - path class (hot / cold)
   - `n` (stated, unknown, or inferred and bounded)
   - skipped dimensions (if any)
   - external assumptions (if any)
8. If the user asked to "project to 10x" or "what happens at scale", record `scale projection: 10x` for phase 2. If `n` is unknown, state the 10× baseline you assumed.

Then go to phase 1.
