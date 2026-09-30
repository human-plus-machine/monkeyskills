# Contract-first

Load at the Contract step. This is the artifact heading order. Protocol is how
inputs are classified; [earn](earn.md) is how each extra box is judged.

**Contract-first:** lock FR, NFR, entities, and the API before drawing boxes.
The simple HLD meets the FRs. Deep dives close NFRs. The spine earns every
extra box.

Fill 1–5 at the Contract step; Council (Full HLD) before any boxes; 6 at
High-level design; 7 at Deep dive.

## Artifact heading order

1. **Functional requirements** — `Users/Clients should be able to…` Top 3–7
   features that change topology. Prioritize; a long list is a failure to
   focus.
2. **Non-functional requirements** — `The system should…` Quantified. Pick
   3–5: CAP, scale (read/write, burst), latency of a named operation, durability,
   tenancy/security, fault handling. Vague “low latency” is not an NFR.
3. **Core entities** — First draft only. Actors + **nouns** the API exchanges
   and stores persist. Ask: who acts? which resources satisfy the FRs?
   **Prune:** attributes of another entity; queues, counters, locks used only
   as admit machinery; services and Lambdas. Names are domain nouns
   (`Run`, not `RunRecordDto`). Iterate after HLD when state per request is
   known; then add fields.
4. **API** — Default **REST**. Plural resource names from entities
   (`/v1/clients/{id}/runs`). Current principal from auth, not the body.
   GraphQL or RPC only with a named reason. Real-time is extra, after the
   core API.
5. **Data flow** — Only when the system is a pipeline (many stages on one
   input). Numbered list or sequence diagram. Skip for a short request/reply.
   Full HLD then runs [council](council.md): candidates for this contract,
   one winner, HLD still empty.
6. **High-level design** — Boxes that satisfy the API, one endpoint at a time.
   Simple design that meets FRs first. Note caches/queues/shards as callouts;
   they wait for deep dives unless the number gate already earned them.
   When a request hits a store, write the **relevant** fields next to it.
   Talk state change from request to response.
7. **Deep dives** — Meet NFRs, edges, bottlenecks. earn.md four-statement on
   every kept component. Lead with the first bottleneck. The spine **earns**
   every cache, queue, shard, extra service.

## Capacity

Skip arithmetic that only concludes “it is large.” Compute when a number
would change a box (heap vs shard, slots vs cron density, working set vs
cache). That is the number gate plus [earn](earn.md).

## Token set

Entity, REST path, data-model table, and Names row share one token
(`Run` / `/runs` / `RUN#{run_id}` / `run_id`).
