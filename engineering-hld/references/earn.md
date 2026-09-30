# Earn

Load at the Earn step, after the contract is filled and Full HLD has a
council winner. Capacity math only when a number would change a box.

## Capacity envelope

Show formulas with units and substituted values. Use only relevant formulas.

```text
average_rps = events_per_day / 86,400 s/day
peak_rps = average_rps × observed_or_assumed_peak_factor
ingress_bytes_per_s = peak_rps × average_payload_bytes
raw_storage_bytes = events_per_day × stored_bytes_per_event × retention_days
replicated_storage_bytes = raw_storage_bytes × replication_factor
read_ops_per_s = request_rps × reads_per_request
write_ops_per_s = request_rps × writes_per_request
fanout_ops_per_s = source_events_per_s × average_fanout
working_set_bytes = active_keys × bytes_per_active_value
required_partitions = ceil(peak_work_units_per_s / proven_partition_capacity)
rebuild_seconds = records_to_rebuild / measured_processing_records_per_s
```

Rules:

- Peak and replication factors are Sourced, Measured, Assumption, or TBD.
- Required headroom is a sourced or unresolved input, stated separately.
- Distinguish logical data size from indexes, versions, replicas, and temporary
  rebuild space.
- Check skew: average throughput is invalid when a tenant, key, or partition can
  dominate load.
- Include downstream amplification, retries, and fan-out when they materially
  affect capacity.
- Reject false precision. Inputs with one significant digit do not support a
  five-digit result.

## First bottleneck

Walk the critical path and identify the first resource or invariant expected to
fail: CPU, memory, connection pool, IOPS, bandwidth, partition throughput,
lock/contention, queue age, downstream quota, cardinality, or coordination.

For each claimed bottleneck state:

1. evidence or explicit hypothesis;
2. saturation mechanism;
3. user-visible failure;
4. measurement that confirms or falsifies it.

Prove the upstream path can reach a stage before optimizing that stage.

**Deep dive.** After the system-level first bottleneck, apply the same four
statements to every kept component (Full HLD), the chosen lever (Single lever),
or each Blocker/Risk component (Critique). A component that is not first still
records why: surplus evidence, or downstream of an unproven upstream stage.

## Earned-mechanism test

For every proposed component or architectural mechanism, record:

```text
Mechanism:
Requirement served:
Earning evidence: sourced/assumed number OR named failure mode
Simpler alternative:
Why simpler alternative fails:
Operational owner:
Removal or rollback path:
```

Record that block for every kept extra box. Absent earning evidence means the
mechanism is not kept.

Choose required properties before products:

1. access pattern and query shape;
2. consistency, ordering, and durability;
3. throughput, latency, data size, and skew;
4. failure/recovery behavior;
5. team-operability constraints;
6. then a technology already operated by the team when it satisfies 1–5.

**Cloud map.** Provider is Sourced from recon or the user. Map each earned
component onto one platform service that team already operates. A new managed
service, extra region, or second cloud is a mechanism and must pass this test.
Logical HLD may leave Cloud map TBD. A product name in the high-level design
requires a sourced provider. Record the map in `design.md`.

**Names.** Reuse workspace orthography for services, tables, and attributes.
If recon finds none, apply `{domain}-{capability}` services,
`{bounded_context}_{entity}` tables, `{entity}_{attribute}` columns, matching
existing snake/camel/kebab. The same token appears in entities, APIs, data
model, and cloud map.
