# Pack: Storage and Consistency

Load for database selection, schema/index design, partitioning, replication,
materialized views, transactions, and consistency trade-offs.

## Topology-changing questions

1. **Which read/write invariants require coordination?**
   Recommend expressing each invariant and its scope (row, aggregate, tenant,
   global) before selecting a consistency model.
2. **What are the dominant access patterns and skew distribution?**
   Recommend query shapes with frequency, result size, latency, and hottest
   key/tenant; data size alone cannot choose a store or partition key.

## Required analysis

- Model entities, ownership, lifecycle, cardinality, and authoritative source.
- Enumerate read/write/query patterns and required indexes.
- State transaction and isolation requirements, including write conflicts.
- State consistency per operation: linearizable/strong, read-your-writes,
  monotonic, bounded-stale, or eventual.
- Define partition key, reshard/rebalance path, hotspot behavior, and
  cross-partition operations.
- Include index, replica, version, tombstone, compaction, and rebuild overhead.
- Define backup/restore and RPO/RTO only when durability/DR is in scope.

## Capacity formulas

```text
logical_storage = records × average_record_bytes
index_storage = index_entries × average_entry_bytes
write_amplification = physical_write_bytes / logical_write_bytes
working_set = active_rows × bytes_per_row_and_hot_indexes
hot_partition_rps = total_rps × hottest_partition_fraction
replication_bandwidth = logical_write_bytes_per_s × replica_transfer_factor
rebuild_seconds = records_or_bytes / measured_rebuild_rate
```

Use proven engine/instance limits from current documentation or benchmarks; do
not import folklore limits.

## Failure probes

- concurrent updates violate uniqueness or lost-update invariants;
- replica lag serves stale authorization/state;
- partition loss or network split changes write availability;
- hotspot overloads one shard while averages look healthy;
- index/materialized view falls behind or becomes inconsistent;
- online migration exceeds lock/log/disk envelope;
- tombstones/versions/compaction exhaust storage or I/O;
- restore succeeds technically but misses application consistency;
- resharding has no dual-read/write or rollback strategy.

## Mechanism cautions

- Prefer the existing operationally owned store when it satisfies derived
  properties.
- Sharding is earned by a proven single-node/resource boundary or isolation
  requirement, not row count alone.
- Denormalization/materialized views are earned by measured read-path cost and
  require freshness/rebuild semantics.
- Search engines are earned by query semantics or scale unsupported by the
  primary store; they are derived indexes, not default sources of truth.
- Distributed transactions/CQRS/event sourcing require explicit invariants that
  simpler transactions or an outbox cannot satisfy.

## Observability and kill conditions

Measure query latency by shape, rows scanned/returned, lock/conflict rate,
connection saturation, IOPS/CPU/memory, replica lag, partition skew, index
growth, compaction, storage growth, and restore/rebuild duration.

Kill conditions should test hotspot concentration, SLO breach at measured
capacity, stale-read correctness, migration duration, and recovery objectives.
