---
name: design-context-axis-analysis
description: Phase 1 - Three-Axis Impact Analysis. Map the requirement onto the tech, platform, and cloud-framework axes; resolve the semantic axis as far as the local repo allows (degraded in v1); recommend an integration style via the fan-out heuristic.
---

# Phase 1: Three-Axis Impact Analysis

## Purpose

Map the requirement onto the existing system. This is the analytical core of the design-context skill: it produces the decisions that downstream skills would otherwise each re-derive (often inconsistently).

## Output

A fully resolved (or explicitly degraded) value for each axis, held in working memory and recorded in `state.json.axes`. Phase 2 serialises these into `design-context.md`.

## Principle: Decide Once, Enforce Downstream

design-context **decides**; consumers **enforce**. Resolve each axis to a concrete, machine-readable value. Where the inputs cannot support a confident decision, mark the axis `degraded` and record why — do not guess.

---

## Axis 1: Tech

**Question:** What language / framework / version is this, and which framework supplement applies?

**Method:**
1. Take the `detected_stack` from Phase 0 (config-file detection).
2. Resolve which framework supplement MonkeyMode would load (Java + Spring Boot → `JAVA-SPRING-BOOT-SUPPLEMENT.md`, Python + FastAPI → `PYTHON-FASTAPI-SUPPLEMENT.md`, Terraform + AWS → `TERRAFORM-AWS-SUPPLEMENT.md`, etc.). If no supplement exists for the detected framework, set `framework_supplement: "none"`.
3. This axis is resolved from local evidence and is **never degraded locally** — if config files exist, the stack is knowable. If the repo has no config files yet (greenfield), record the stack as proposed-from-requirement and mark the axis `degraded` with: `"tech axis: greenfield repo, stack inferred from requirement not from config files."`

**Output keys:** `tech_axis.detected_stack`, `tech_axis.framework_supplement`.

---

## Axis 2: Platform

**Question:** What platform, which platform supplement, which invariants, and which platform discovery questions are pre-answered?

**Method:**
1. Take the platform signal from Phase 0.
2. If a platform is detected, classify it (e.g. shared vs per-unit components, if the platform defines such a split) using the requirement and any guardrail architecture invariants (if present).
3. Determine whether the matching MonkeyMode platform supplement exists (`<PLATFORM>-PLATFORM-SUPPLEMENT.md`). Set `platform_supplement_loaded` accordingly. This mirrors the MonkeyMode degrade-with-warning policy: a platform value with a missing supplement is recorded but flagged.
4. List the platform **invariants in play** for this requirement (egress rules, topic conventions, identity layering, data-residency) drawn from the supplement and from the project guardrail documents (if present).
5. **Pre-answer the platform discovery questions** that MonkeyMode Phase 1A would otherwise ask, wherever the supplement's normative tables (registries, region tables, environment tables) or the requirement already answer them. Record each as a `{question, answer, source}` triple.

**Degradation:**
- `platform == null` → not a degradation; record `platform_axis.platform: "none"`.
- `platform != null` but supplement missing → mark axis `degraded`, record: `"platform '{X}' detected but supplement missing — invariants not enforced; platform discovery questions not pre-answered."`

**Output keys:** `platform_axis.platform`, `platform_axis.classification`, `platform_axis.supplement_loaded`, `platform_axis.invariants`, `platform_axis.pre_answered_questions`.

---

## Axis 3: Cloud-Framework

**Question:** What `clouds[]` are targeted, what pillar profile applies, and which per-resource framework checks are relevant?

**Method:**
1. Determine target clouds from: the requirement artefact (explicit cloud mentions), local IaC providers (`aws`, `gcp`, `azure`), and guardrail deployment invariants (if present). Produce `clouds[]` (may be one or many). If none can be determined, mark degraded.
2. Derive a **pillar profile** — which Well-Architected / cloud-framework pillars matter most for this requirement (e.g. high-availability SLA → Reliability emphasis; PII → Security + compliance emphasis). Express as a ranked or weighted list of pillars.
3. Select the **per-resource framework checks** relevant to the resource types the requirement implies. If the workspace has architecture-review checklists (e.g. AWS Well-Architected or GCP Architecture Framework), reuse them and carry their Question IDs verbatim (REL-5, SEC-3, ...). Only include checks for resource types actually in play.
4. Note **isolation indicators** if any apply (multi-tenant SaaS, 99.99%+ SLA, geographic distribution, large user base, tiered customers) — these flag that MonkeyMode **Phase 1C** (IaC design) should evaluate an isolated-deployment-unit (e.g. per-tenant or per-region) layout.

**Degradation:**
- No determinable cloud → mark axis `degraded`, record: `"cloud target unknown — clouds[] empty; MonkeyMode Phase 1C must resolve cloud target before provisioning."`

**Output keys:** `cloud_framework_axis.clouds`, `cloud_framework_axis.pillar_profile`, `cloud_framework_axis.framework_checks`, `cloud_framework_axis.isolation_indicators`.

---

## Axis 4 (degraded in v1): Semantic

**Question:** Which components are affected, what is the contract delta, and who are the downstream consumers?

**Method (v1 — local repo only):**
1. **Affected components** — from the `@document-codebase` `component-inventory.md` (or a lightweight live scan if absent), identify the modules the requirement touches. For each: `component → files → role`.
2. **Contract delta** — from `api-documentation.md` plus the requirement, enumerate each contract change: `{ contract, change_type: add|modify|remove, breaking: yes|no, known_consumers: [...] }`. `known_consumers` is **scoped to the local repo** in v1 (derived from `dependencies.md`).
3. **Domain routing (best-effort)** — list the domains the requirement touches; for each, classify whether the change is to the **source of truth** (authoritative data/owner) or a **derived view** (read model / projection). Mark low-confidence routing explicitly.

**Mandatory v1 degradation:**
- Always record: `"semantic axis degraded (v1): cross-repo downstream consumers unknown — no Semantic Layer. known_consumers reflects the local repo only. If a service catalog or dependency-graph tool is available, use it to resolve cross-repo consumers; otherwise infer from the repo and mark them as unverified."`
- Any contract marked `breaking: yes` MUST also carry a note that cross-repo consumer impact is unverified in v1.

**Output keys:** `semantic_axis.affected_components`, `semantic_axis.contract_delta`, `semantic_axis.domain_routing` (each entry's `kind` is `source_of_truth|derived_view`).

---

## Integration-Style Recommendation

**Question:** Should this be event-driven or synchronous?

**Method (fan-out heuristic):**
1. Count the distinct downstream dependents the requirement creates or touches (from the semantic axis, local scope in v1).
2. Apply the heuristic: a **hub** with **fan-out > 5 dependents** strongly favours an **event-driven** style (publish once, many consumers, no synchronous coupling); low fan-out with strong consistency needs favours **synchronous**.
3. Cross-check against platform invariants (e.g. a platform may mandate an event backbone) and guardrail anti-patterns (e.g. "no synchronous calls between isolated deployment units").
4. Recommend a style with explicit rationale. If the fan-out count is unknown (degraded semantic axis), recommend conservatively and flag the assumption.

> **Threshold note:** This skill's rule is **fan-out > 5** for the event-driven recommendation. The threshold is recorded in the artefact so consumers apply one consistent number.

**Output keys:** `integration_style.recommendation` (`event-driven|synchronous|mixed`), `integration_style.fan_out`, `integration_style.threshold`, `integration_style.rationale`.

---

## Guardrails (carried from optional project guardrail documents)

Carry the invariants and anti-patterns captured in Phase 0 into a dedicated guardrails set. These are not derived here — they are propagated verbatim so every downstream consumer (especially the MonkeyMode code-spec and verification phases) sees the same constraints.

**Output keys:** `guardrails.invariants`, `guardrails.anti_patterns`.

---

## Record Axis State

Update `state.json.axes` with `resolved` / `degraded` per axis, append any new degradation notes, and present a summary:

```
## Three-Axis Analysis — {feature-name}

| Axis | Status | Headline |
|---|---|---|
| Tech | resolved | {language}/{framework} → {supplement} |
| Platform | resolved/degraded | {platform} ({classification}); {n} invariants; {m} questions pre-answered |
| Cloud-framework | resolved/degraded | clouds={clouds}; pillars={top pillars}; {k} checks |
| Semantic | degraded (v1) | {n} components, {m} contract changes ({b} breaking); cross-repo consumers unknown |

**Integration style:** {recommendation} (fan-out {n}, threshold 5) — {one-line rationale}
**Guardrails carried:** {n} invariants, {m} anti-patterns

Ready to move to Phase 2 (Emit design-context)?
```

## Definition of Done

Phase 1 is complete when:
- [ ] Each axis is marked `resolved` or `degraded` with a recorded reason for any degradation.
- [ ] The semantic axis carries the mandatory v1 cross-repo degradation note.
- [ ] An integration style is recommended with rationale and the standardised threshold.
- [ ] Guardrails from the project guardrail documents (if any) are carried forward.
- [ ] `state.json.axes` is updated and the user approves moving to Phase 2.
