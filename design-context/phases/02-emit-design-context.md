---
name: design-context-emit
description: Phase 2 - Emit design-context. Assemble the design-context.md artefact from the template - human-readable markdown plus exactly one fenced JSON block that is the machine-readable source of truth. The markdown and JSON must not diverge.
---

# Phase 2: Emit design-context

## Purpose

Serialise the three-axis analysis into the shared context bus: `.design-context/{feature-name}/design-context.md`. This is the only artefact design-context produces and the only thing downstream consumers read.

## Output

`.design-context/{feature-name}/design-context.md` — markdown for humans, with exactly **one** fenced ` ```json ` block that is the source of truth.

## The Source-of-Truth Contract

This is the single most important rule of the phase:

> The fenced JSON block is the machine-readable source of truth. Every consumer parses **that block** for deterministic ingestion. The surrounding markdown is for human review. **They MUST NOT diverge.** When you write the artefact, fill the JSON block first, then render the human-readable sections from the same values.

- There is exactly **one** ` ```json ` block in the file.
- Every markdown section mirrors a JSON key (the section order matches the key order).
- If you update one, update the other in the same edit.
- Consumers that find no JSON block, or a JSON block that fails to parse, MUST treat the artefact as absent and degrade to their own behaviour — so a malformed block is worse than no artefact. Validate the JSON parses before finishing.

## Step 1: Load the Template

Read `templates/design-context-template.md`. It defines both the markdown section order and the canonical JSON schema. Do not invent new top-level keys; if the analysis produced something the schema does not cover, add it under an existing section or note it in `degradation_notes`.

## Step 2: Assemble the JSON Block

Populate the JSON from the Phase 1 axis values. Canonical shape:

```json
{
  "feature_name": "user-role-selector",
  "version": "v1",
  "generated_at": "<ISO8601>",
  "requirement": {
    "summary": "...",
    "in_scope": ["..."],
    "out_of_scope": ["..."],
    "source_artefact": { "type": "monkeyplan|monkeythink|monkeymode|other", "path": "..." }
  },
  "tech_axis": {
    "detected_stack": {
      "language": "java|python|typescript|csharp|hcl|null",
      "framework": "spring-boot|fastapi|angular|...|null",
      "framework_version": "string|null",
      "build_tool": "gradle|maven|uv|npm|...|null",
      "test_framework": "junit|pytest|jest|...|null"
    },
    "framework_supplement": "JAVA-SPRING-BOOT-SUPPLEMENT.md|none"
  },
  "platform_axis": {
    "platform": "<name>|none|null",
    "classification": "shared|per-unit|null",
    "supplement_loaded": false,
    "invariants": ["..."],
    "pre_answered_questions": [
      { "question": "...", "answer": "...", "source": "supplement|requirement|guardrails" }
    ]
  },
  "cloud_framework_axis": {
    "clouds": ["aws"],
    "pillar_profile": [ { "pillar": "Reliability", "emphasis": "high" } ],
    "framework_checks": [ { "id": "REL-5", "applies_to": "compute", "principle": "..." } ],
    "isolation_indicators": ["multi-tenant SaaS"]
  },
  "semantic_axis": {
    "scope": "local-repo-only",
    "affected_components": [
      { "component": "...", "files": ["..."], "role": "..." }
    ],
    "contract_delta": [
      { "contract": "...", "change_type": "add|modify|remove", "breaking": false, "known_consumers": ["..."] }
    ],
    "domain_routing": [
      { "domain": "...", "kind": "source_of_truth|derived_view", "confidence": "high|medium|low" }
    ]
  },
  "integration_style": {
    "recommendation": "event-driven|synchronous|mixed",
    "fan_out": 0,
    "threshold": 5,
    "rationale": "..."
  },
  "guardrails": {
    "invariants": ["..."],
    "anti_patterns": ["..."]
  },
  "degradation_notes": [
    "semantic axis degraded (v1): cross-repo downstream consumers unknown — if a service catalog or dependency-graph tool is available, use it; otherwise inferred from the repo and unverified."
  ]
}
```

Rules:
- Use `null` (not omission) for genuinely unknown scalar values; use `[]` for empty lists.
- `degradation_notes` must contain every note accumulated across Phases 0 and 1, verbatim.
- `threshold` records the fan-out threshold actually used (standardised to 5).

## Step 3: Render the Markdown

Write the human-readable sections in the template's order, each mirroring the matching JSON key:

1. Header + metadata (feature, version, generated_at, source artefact)
2. Requirement summary (+ in/out of scope)
3. Affected components (table)
4. Contract delta (table, breaking changes flagged)
5. Tech axis
6. Platform axis (invariants + pre-answered questions)
7. Cloud-framework axis (clouds, pillar profile, framework checks)
8. Domain routing
9. Integration-style recommendation + rationale
10. Guardrails (invariants + anti-patterns)
11. Degradation notes
12. The single fenced JSON block (under a "Machine-Readable Source of Truth" heading)

Place the JSON block at the end under an explicit heading so humans read the narrative first and consumers can locate the block deterministically.

## Step 4: Validate and Finalise

Before declaring done:
- [ ] Exactly one ` ```json ` block exists and parses as valid JSON.
- [ ] Every markdown section has a corresponding JSON key and the values match.
- [ ] Every degradation from Phases 0–1 appears in `degradation_notes`.
- [ ] No axis is presented as resolved if its `state.json.axes` status is `degraded`.

Update `state.json`:

```json
{
  "current_phase": "completed",
  "phase_status": { "emit_design_context": "completed" },
  "artifacts": { "design_context": ".design-context/{feature-name}/design-context.md" },
  "last_updated": "<ISO8601>"
}
```

## Step 5: Hand Off

Tell the user the bus is ready and remind them it is read-if-present:

```
design-context.md written to .design-context/{feature-name}/design-context.md.

This is a shared, read-if-present context bus. Downstream skills will pick it up automatically:
- @monkeymode / @monkeymode-lite — pre-seeds Phase 1A discovery (stack, platform, clouds, contract delta) and Phase 1C IaC design (clouds[], pillar profile, per-resource checks); pillar profile + compliance signals inform verification and external CI/CD
- @commit — enrich PR descriptions

Degraded axes (v1): {list}. Cross-repo consumers are unverified; if a service catalog or dependency-graph tool is available, use it to resolve them.

Next: invoke @monkeymode for {feature-name} to begin design.
```

## Definition of Done

Phase 2 is complete when:
- [ ] `design-context.md` is written to `.design-context/{feature-name}/`.
- [ ] The single JSON block is valid and consistent with the markdown.
- [ ] All degradation notes are present.
- [ ] `state.json` is marked `completed`.
- [ ] The user is told the bus is ready and how consumers use it.
