# Consuming `design-context.md` (the Read-If-Present Contract)

This guide is the single normative reference for how **any** skill consumes the `@design-context` context bus. `@monkeymode`, `@monkeymode-lite`, and `@commit` all follow it. It exists so the contract is defined once and every consumer behaves identically.

## The Core Contract

> `design-context.md` is **read-if-present**. Its presence pre-seeds a consumer's decisions; its absence changes nothing. No consumer may hard-depend on it, fail because it is missing, or block waiting for it.

## Where to Look

```
{workspace}/.design-context/{feature-name}/design-context.md
```

- `{feature-name}` is the kebab-case feature the consumer is already working on. Match on the consumer's own feature/slug.
- If the consumer's feature name and design-context's differ, match on kebab-case similarity; if still ambiguous, treat as absent (do not guess).

## How to Read It

1. **Locate the file.** If it does not exist → **degrade**: proceed with the consumer's existing behaviour exactly as before the bus existed.
2. **Parse the single fenced ` ```json ` block.** That block is the source of truth — do not parse values out of the surrounding markdown.
3. **If the JSON block is missing or fails to parse → degrade** (treat as absent). A malformed block is worse than no artefact; never half-trust it.
4. **Honour `degradation_notes`.** For any axis listed as degraded, do **not** treat the corresponding values as authoritative — re-derive them as the consumer normally would, and surface the degradation note to the user verbatim.
5. **Pre-seed, then verify.** Use bus values as the starting point, not gospel. A consumer may still confirm or refine a value with the user; it must never silently contradict the bus without saying so.

## What Each Consumer Reads

| Consumer | Keys it reads | What it pre-seeds |
|---|---|---|
| `@monkeymode` (Phase 1A) | `tech_axis`, `platform_axis`, `cloud_framework_axis.clouds`, `semantic_axis.contract_delta`, `degradation_notes` | Phase 1A `detected_stack` / platform / clouds; Phase 1B contract design |
| `@monkeymode-lite` (Phase 1 design) | `semantic_axis.affected_components`, `semantic_axis.contract_delta`, `degradation_notes` | Design inputs: which components change and the contract delta |
| `@monkeymode` (Phase 1C — inlined IaC) | `cloud_framework_axis` (clouds, pillar_profile, framework_checks, isolation_indicators), `semantic_axis.domain_routing` | Cloud target, pillar emphasis, per-resource checks, cross-cloud routing, isolated-deployment-unit evaluation |
| `@monkeymode` (verification) + external CI/CD | `cloud_framework_axis.pillar_profile`, `platform_axis`, `requirement` (compliance signals) | Scan emphasis and compliance enforcement run by MonkeyMode verification and the external CI/CD gate |
| `@commit` | `semantic_axis.contract_delta`, `semantic_axis.affected_components`, `cloud_framework_axis.clouds` | Contract delta + capability map in PR text |

## Degradation Examples

- **Bus absent** → consumer behaves exactly as it did before `@design-context` existed. No warning needed (this is the steady state for features that skipped design-context).
- **Bus present, semantic axis degraded** (v1 default) → consumer trusts tech / platform / cloud-framework values but re-derives cross-repo consumer impact itself, and surfaces the "cross-repo consumers unknown" note.
- **Bus present, cloud-framework axis degraded** → MonkeyMode Phase 1C resolves the cloud target itself rather than trusting an empty `clouds[]`.

## What Consumers Must Never Do

- ❌ Block, error, or warn merely because the bus is absent.
- ❌ Trust a degraded axis as if it were resolved.
- ❌ Parse values from the markdown narrative instead of the JSON block.
- ❌ Write to `.design-context/` — only `@design-context` produces the bus.
- ❌ Silently override a bus value without telling the user.
