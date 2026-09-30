# Design Context — {Feature Name}

> **What this is:** A shared, read-if-present architectural context bus produced by `@design-context` (the design-context skill). Any skill may read it; nothing hard-depends on it. The fenced JSON block at the bottom is the **machine-readable source of truth** — consumers parse that block. The narrative below is for humans and MUST NOT diverge from the JSON.

**Feature:** `{feature-name}`
**design-context version:** v1
**Generated:** {ISO8601}
**Source requirement artefact:** {type} — `{path}`

---

## 1. Requirement Summary

{2–4 sentences distilled from the requirement artefact.}

**In scope:**
- {item}

**Out of scope:**
- {item}

---

## 2. Affected Components

> Scope: **local repo only** in v1.

| Component | Files | Role |
|---|---|---|
| {name} | `{path}`, ... | {role} |

---

## 3. Contract Delta

| Contract | Change | Breaking | Known consumers (local repo, v1) |
|---|---|---|---|
| {name} | add / modify / remove | yes / no | {consumer}, ... |

> Breaking changes flagged here have **unverified cross-repo impact in v1** — see Degradation Notes.

---

## 4. Tech Axis

- **Language:** {language}
- **Framework:** {framework} {version}
- **Build tool:** {build_tool}
- **Test framework:** {test_framework}
- **Framework supplement that applies:** `{supplement | none}`

---

## 5. Platform Axis

- **Platform:** {platform | none}
- **Classification:** {shared | per-unit | n/a}
- **Supplement loaded:** {true | false}

**Invariants in play:**
- {invariant}

**Pre-answered platform discovery questions:**
| Question | Answer | Source |
|---|---|---|
| {question} | {answer} | supplement / requirement / guardrails |

---

## 6. Cloud-Framework Axis

- **Target clouds:** {clouds}

**Pillar profile:**
| Pillar | Emphasis |
|---|---|
| {pillar} | high / medium / low |

**Per-resource framework checks:**
| Check ID | Applies to | Principle |
|---|---|---|
| {REL-5} | {resource type} | {principle} |

**Isolation indicators (isolated deployment units):** {list or "none"}

---

## 7. Domain Routing

> Best-effort in v1; low-confidence routing is flagged.

| Domain | Kind | Confidence |
|---|---|---|
| {domain} | source of truth / derived view | high / medium / low |

---

## 8. Integration-Style Recommendation

- **Recommendation:** {event-driven | synchronous | mixed}
- **Fan-out:** {n} dependents (local scope, v1)
- **Threshold applied:** 5 (standardised)
- **Rationale:** {why this style, cross-checked against platform invariants and product anti-patterns}

---

## 9. Guardrails (from optional project guardrail documents)

> Carried verbatim. Propagated to every downstream consumer (especially the MonkeyMode code-spec and verification phases).

**Invariants:**
- {invariant}

**Anti-patterns:**
- {anti-pattern}

---

## 10. Degradation Notes

> Every axis that could not be fully resolved, and why. Consumers surface these verbatim.

- {note}

---

## 11. Machine-Readable Source of Truth

> The block below is authoritative. If it is missing or fails to parse, treat this artefact as absent and degrade.

```json
{
  "feature_name": "{feature-name}",
  "version": "v1",
  "generated_at": "{ISO8601}",
  "requirement": {
    "summary": "...",
    "in_scope": [],
    "out_of_scope": [],
    "source_artefact": { "type": "monkeyplan|monkeythink|monkeymode|other", "path": "..." }
  },
  "tech_axis": {
    "detected_stack": {
      "language": null,
      "framework": null,
      "framework_version": null,
      "build_tool": null,
      "test_framework": null
    },
    "framework_supplement": "none"
  },
  "platform_axis": {
    "platform": "none",
    "classification": null,
    "supplement_loaded": false,
    "invariants": [],
    "pre_answered_questions": []
  },
  "cloud_framework_axis": {
    "clouds": [],
    "pillar_profile": [],
    "framework_checks": [],
    "isolation_indicators": []
  },
  "semantic_axis": {
    "scope": "local-repo-only",
    "affected_components": [],
    "contract_delta": [],
    "domain_routing": []
  },
  "integration_style": {
    "recommendation": "synchronous",
    "fan_out": 0,
    "threshold": 5,
    "rationale": "..."
  },
  "guardrails": {
    "invariants": [],
    "anti_patterns": []
  },
  "degradation_notes": [
    "semantic axis degraded (v1): cross-repo downstream consumers unknown — if a service catalog or dependency-graph tool is available, use it; otherwise inferred from the repo and unverified."
  ]
}
```
