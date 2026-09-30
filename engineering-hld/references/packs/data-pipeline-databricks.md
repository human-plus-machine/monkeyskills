# Pack: Data Pipelines and Databricks

Load for batch/stream ingestion, ETL/ELT, lakehouse jobs, Databricks workflows,
backfills, and derived datasets.

## Topology-changing questions

1. **What freshness deadline and replay window must the pipeline meet?**
   Recommend defining both normal completion/freshness and maximum backfill
   duration; they determine batch/stream choice and retained source data.
2. **What is the authoritative replay source?**
   Recommend an immutable or versioned input with schema and processing-version
   provenance. Without it, correction and deterministic recovery are impossible.

## Required invariants

- Define delivery semantics at each boundary; “exactly once” must identify the
  exact effect and deduplication key.
- Transformation output is reproducible from retained input, code/config/model
  version, and reference-data snapshot—or the non-reproducibility is accepted.
- Late, duplicate, malformed, and out-of-order records have explicit behavior.
- Schema evolution defines producer/consumer compatibility and quarantine.
- Backfill and incremental processing cannot silently double-apply effects.
- Partition replacement/merge is atomic at the consumer-visible boundary.

## Capacity formulas

```text
daily_input_bytes = daily_records × average_input_bytes
required_processing_records_per_s = records_in_deadline / deadline_seconds
shuffle_bytes ≈ input_bytes × measured_shuffle_amplification
backfill_seconds = retained_records / measured_backfill_records_per_s
small_file_count = output_bytes / average_file_bytes
stream_lag_growth_per_s = ingress_records_per_s - processing_records_per_s
```

Do not estimate cluster count or cost without measured workload characteristics,
runtime/instance facts, and utilization. Data volume alone does not predict
shuffle, skew, or compute time.

## Failure probes

- driver/executor loss after partial output;
- checkpoint loss or incompatible query change;
- poison record stalls a micro-batch;
- skewed key creates one straggler partition;
- source retention expires before recovery/backfill;
- schema drift corrupts or drops columns;
- concurrent backfill and incremental job overwrite each other;
- downstream reads partially published data;
- runaway retries or autoscaling increases cost without progress;
- reference data changes make replay non-deterministic.

## Mechanism cautions

- Streaming is earned by freshness and continuous-arrival requirements, not
  prestige. Batch is preferred when it meets the deadline.
- Medallion layers are not mandatory; each persisted layer must earn replay,
  governance, reuse, or performance value.
- Partitioning must follow pruning and skew evidence. High-cardinality
  partition columns can create file/path explosion.
- Cache/persist only reused, expensive intermediate computation that fits the
  executor memory envelope.

## Observability and kill conditions

Measure freshness, completion time, throughput, input/output counts, rejected
records, lag, skew/stragglers, spill, shuffle, file counts/sizes, retries,
backfill ETA, and cost per successful data unit.

Kill conditions should test deadline breach, lag growth, replay divergence,
partition skew, small-file growth, and cost without throughput improvement.
