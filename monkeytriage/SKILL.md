---
name: monkeytriage
description: MonkeyTriage — triage entry point that classifies a feature as Lite or Full and delegates to monkeymode-lite or monkeymode. Invoke @monkeytriage for any new or resumed feature; use @monkeymode-lite or @monkeymode to force a tier without triage.
author: MonkeyMode Contributors
---

# MonkeyTriage — Router & Triage

## Intent

`@monkeytriage` is the single entry point for feature development. It triages the request, writes `context.workflow_tier` to state, and delegates all implementation work to either `monkeymode` or `monkeymode-lite`. The router never designs, codes, or verifies features itself.

**User invokes:** `@monkeytriage for [feature]`

> `{skill_dir}` means the directory that contains the installed skill folders (e.g. `~/.claude/skills` or `~/.cursor/skills`). Paths like `{skill_dir}/monkeymode/guides/…` are resolved against it.

After triage, the agent reads and follows the delegated skill:
- **Lite** → read `{skill_dir}/monkeymode-lite/SKILL.md`
- **Full** → read `{skill_dir}/monkeymode/SKILL.md`

---

## On Every Invocation

1. **Extract feature name** from the user's message (convert to kebab-case).
2. **Check for state:** Read `{workspace}/.monkeymode/{feature-name}/state.json`.

### Path A — Resuming (state.json exists)

1. Read `context.workflow_tier` from state.
2. If `workflow_tier` is missing:
   - If `context.explore_handoff` is `true` AND `.monkeymode/{feature-name}/design.md` exists AND `.monkeymode/{feature-name}/design/1a-discovery.md` does **not** → treat as `lite`
   - Else treat as `full`
   - Write the resolved `workflow_tier` on the next state update
3. Announce: "Resuming MonkeyMode {tier} for '{feature_name}' at phase {current_phase}." If `context.explore_handoff` is `true`, add: "Design was imported from @explore — do not re-run design interviews."
4. **Delegate immediately** — read and follow `{skill_dir}/monkeymode-{tier}/SKILL.md`. Stop router work.

### Path B — New Feature (no state.json)

**Explore import check (before triage)** — same idea as `@scope` → `@monkeyplan` Path D. Do this *before* writing a blank MonkeyMode `state.json`.

1. Read `{workspace}/.explore/{feature-name}/state.json` if present.
2. Treat explore design as **completed** when all of:
   - that state file exists
   - `phase_status.design_capture` is `completed`, **or** `current_phase` is `"5"` or `"completed"`
   - `{workspace}/.explore/{feature-name}/design/design.md` exists
3. If completed:
   - Announce: "Found completed @explore design at .explore/{feature-name}/. Import it and skip MonkeyMode design interviews, or start a fresh MonkeyMode design?"
   - **Import** (yes / ok / import, or default when the user invoked `@monkeytriage` immediately after explore handoff):
     - Read `{skill_dir}/explore/phases/05-handoff.md` and execute **Handoff Path A** for this feature.
     - Honor force flags (`lite` / `full` / `@monkeymode-lite` / `@monkeymode`) as `workflow_tier`; otherwise ask Full vs Lite.
     - That write creates `.monkeymode/{feature-name}/state.json` with `context.explore_handoff: true` and `context.workflow_tier`.
     - Continue as **Path A**. Do **not** overwrite that state with the blank templates below.
   - **Start fresh:** proceed with triage below (do not copy explore artifacts).
4. If no completed explore design: run triage as below, then delegate.

---

## Triage

### Force flags (skip triage)

If the user's message contains any of `lite`, `full`, `--lite`, `--full`, `@monkeymode-lite`, or `@monkeymode`:
- Set `workflow_tier` to the matched tier.
- Skip the recommendation and confirmation step.
- If Path B already imported explore state, continue as Path A — do **not** overwrite it.
- Otherwise continue to "Write state and delegate".

### Complexity rubric

Score the request using these signals. More than one "Full" signal → recommend **Full**. All "Lite" or ambiguous → recommend **Lite** (with bias toward Full when uncertain).

| Signal | Lite | Full |
|--------|------|------|
| Story count (estimated) | 1 clear story | 2 or more stories |
| Files touched (estimated) | ≤ 5 | > 5 or unknown breadth |
| New public API or schema | No | Yes |
| New service or module | No | Yes |
| Platform supplement needed | No | Yes |
| Parallel development needed | No | Yes |
| Multi-team / cross-service | No | Yes |
| User says "quick", "small", "just add…" | Yes | — |
| User says "system", "rewrite", "platform", "integration" | — | Yes |

### Recommendation

Output a single line:

```
Recommended: MonkeyMode Lite — [one-sentence rationale].
Proceed with Lite, or type "full" to use the complete Full workflow (Design 1A–1C, Stories, Acceptance checklist, Code Spec, Implementation, Verification, Integration, Acceptance).
```

Or for Full:

```
Recommended: MonkeyMode — [one-sentence rationale].
Proceed with Full, or type "lite" if this is simpler than it looks.
```

Wait for user confirmation (one word is enough: "lite", "full", "yes", "ok" → proceed with recommendation).

### Write state and delegate

After tier is confirmed:

1. Create `.monkeymode/{feature-name}/` directory in the workspace.
2. Resolve `{initial_phase}` = `design` for Lite or `1a` for Full.
3. Write initial `state.json`:

**Lite initial state:**
```json
{
  "feature_name": "{feature-name}",
  "current_phase": "{initial_phase}",
  "phase_status": {
    "design": "not_started",
    "code_spec": "not_started",
    "implementation": "not_started",
    "verification": "not_started"
  },
  "artifacts": {
    "design_doc": ".monkeymode/{feature-name}/design.md",
    "code_spec": ".monkeymode/{feature-name}/code-spec.md",
    "qa_log": ".monkeymode/{feature-name}/qa-log.md"
  },
  "stories": {},
  "context": {
    "workflow_tier": "lite",
    "save_qa_log": true,
    "detected_stack": {
      "language": null,
      "framework": null,
      "framework_version": null,
      "build_tool": null,
      "test_framework": null,
      "cloud_provider": null,
      "platform": null,
      "platform_version": null,
      "platform_supplement_loaded": false,
      "platform_supplement_warnings": []
    }
  },
  "last_updated": "ISO8601 timestamp"
}
```

**Full initial state:**
```json
{
  "feature_name": "{feature-name}",
  "current_phase": "{initial_phase}",
  "phase_status": {
    "design_1a": "not_started",
    "design_1b": "not_started",
    "design_1c": "not_started",
    "user_stories": "not_started",
    "acceptance_checklist": "not_started",
    "code_spec": "not_started",
    "implementation": "not_started",
    "verification": "not_started",
    "integration": "not_started",
    "acceptance": "not_started"
  },
  "artifacts": {
    "design_docs": {
      "1a_discovery": ".monkeymode/{feature-name}/design/1a-discovery.md",
      "1b_contracts": ".monkeymode/{feature-name}/design/1b-contracts.md",
      "1c_operations": ".monkeymode/{feature-name}/design/1c-operations.md"
    },
    "user_stories_doc": ".monkeymode/{feature-name}/stories/user_stories.md",
    "acceptance_checklist": ".monkeymode/{feature-name}/stories/2b-acceptance.md",
    "qa_log": ".monkeymode/{feature-name}/qa-log.md"
  },
  "stories": {},
  "parallel_execution": {
    "enabled": false,
    "max_concurrent": 10,
    "batches": [],
    "current_batch": null
  },
  "rework_history": [],
  "integration": {
    "status": "not_started",
    "shared_files_merged": [],
    "integration_tests_added": 0,
    "post_integration_verification": "pending",
    "completed_at": null
  },
  "acceptance": {
    "status": "not_started",
    "automated_passed": 0,
    "automated_failed": 0,
    "human_passed": 0,
    "human_failed": 0,
    "known_issues": [],
    "completed_at": null
  },
  "context": {
    "workflow_tier": "full",
    "save_qa_log": true,
    "detected_stack": {
      "language": null,
      "framework": null,
      "framework_version": null,
      "build_tool": null,
      "test_framework": null,
      "cloud_provider": null,
      "platform": null,
      "platform_version": null,
      "platform_supplement_loaded": false,
      "platform_supplement_warnings": []
    },
    "infra_required": null,
    "explore_handoff": false,
    "explore_path": null,
    "architectural_guidance": {
      "source": null,
      "clouds": [],
      "domains": [],
      "pillar_profile": [],
      "framework_checks": [],
      "contract_delta": [],
      "integration_style": null,
      "degradation_notes": []
    }
  },
  "last_updated": "ISO8601 timestamp"
}
```

4. **Delegate:** Read and follow `{skill_dir}/monkeymode-{tier}/SKILL.md` from the skills install
   directory. Announce the actual selected phase:

```
Tier: [Lite | Full]. Reading {skill_dir}/monkeymode-{tier}/SKILL.md and starting Phase 1...
```

---

## Listing Existing Features

If the user invokes `@monkeytriage` with no feature name, list all features found under `.monkeymode/`:

```
Found MonkeyMode features in this workspace:
  1. favorites-feature  [lite]   — Phase: design (in_progress)
  2. payment-gateway    [full]   — Phase: 3 (code_spec)

Which feature would you like to continue with?
```

After user selects, resume as Path A above.

---

## Never Do

- ❌ Run design, code spec, implementation, or verification phases in this skill
- ❌ Overwrite an `@explore` handoff `state.json` with a blank `1a` / `design` template
- ❌ Skip triage on a genuinely new feature (force flags are the only exception; explore import is not triage — it is an alternate Path B entry)
- ❌ Promote a lite run to full mid-feature — if scope overflows, stop and tell the user to start a new full run
- ❌ Modify `workflow_tier` on an existing project without explicit user instruction
- ❌ Auto-advance past delegation — the router's job ends when it hands off

## Always Do

- ✅ Write `workflow_tier` to `state.json` before delegating
- ✅ Delegate by reading the chosen skill's `SKILL.md` — not by summarising it
- ✅ On resume, skip triage entirely and go straight to delegation
- ✅ Treat missing `workflow_tier` on existing projects as `full`, unless explore-handoff Lite artifacts are present (see Path A)
- ✅ Before writing new MonkeyMode state, check `.explore/{feature}/` for a completed design and offer import
