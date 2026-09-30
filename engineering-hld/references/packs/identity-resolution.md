# Pack: Identity and Resolution

Load when the design matches, links, deduplicates, merges, splits, or serves
person/household/device/account identities.

## Topology-changing questions

Ask only if repository/prompt does not answer; these consume the pack’s maximum
two extra questions.

1. **What is the identity invariant and unit of resolution?**
   Recommend defining whether the output is a person, household, account, or
   device and whether false merges or false splits are costlier. Without this,
   thresholds and graph behavior are undefined.
2. **Must the system support merge reversal, split, deletion, and correction?**
   Recommend yes for mutable identifiers or regulated user data; this determines
   whether lineage/provenance is required.

## Required invariants

- Identifier normalization and namespace are explicit; identical strings from
  different namespaces are not silently equal.
- Match evidence is distinguishable from resolved-cluster membership.
- Deterministic and probabilistic edges retain rule/model version, confidence,
  source, and event time.
- Merge is idempotent and concurrent merges cannot lose members.
- Transitivity is an explicit business choice; pairwise matches do not
  automatically justify full-cluster transitive closure.
- Survivorship rules are deterministic, versioned, and replayable.
- Every output can explain which evidence and rule version produced it.
- Delete/correct/split propagates to derived clusters and serving indexes within
  a stated bound.

## Capacity and skew

Compute where applicable:

```text
candidate_pairs_per_record = candidates_after_blocking
pair_evaluations_per_s = input_records_per_s × candidate_pairs_per_record
edge_storage = edges_per_identity × identities × bytes_per_edge
largest_component_fraction = largest_component_members / all_members
rebuild_time = records_or_edges / measured_replay_rate
```

Measure identifier-frequency skew. Shared emails, IPs, phone placeholders, and
bad defaults can create supernodes and hot partitions. State caps/quarantine
rules only when a correctness requirement or measured distribution earns them.

## Failure probes

- false positive creates irreversible over-merge;
- false negative fragments one entity and duplicates downstream action;
- late/retracted evidence changes a prior cluster;
- concurrent merges race;
- high-degree identifier causes graph explosion;
- rule/model rollout creates incompatible cluster versions;
- source deletion leaves derived identity artifacts;
- replay produces different IDs or survivorship;
- serving index lags authoritative lineage;
- tenant or namespace collision links unrelated identities.

## Mechanism cautions

- A graph database is not earned merely because relationships exist. Derive
  traversal/update patterns and component size first.
- Global transitive closure is not earned by “identity graph”; bounded blocking,
  union-find, relational edge storage, or batch components may be simpler.
- A permanent cluster ID needs a stability contract. If membership changes,
  define aliases/tombstones or accept ID churn explicitly.
- Human review queues need volume, decision authority, privacy controls, and
  replay semantics; “manual fallback” alone is not a design.

## Observability and kill conditions

Track match rate by rule/source, cluster-size distribution, largest components,
merge/split/delete latency, replay determinism, serving lag, and sampled
precision/recall against labeled truth.

Candidate kill conditions should test cluster explosion, unacceptable
false-merge cost, delete propagation, replay divergence, and hotspot skew.
