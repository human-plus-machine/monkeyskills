---
name: monkeymode-lite
description: MonkeyMode Lite — condensed 4-phase workflow for small, single-story features (Design → Code Spec → Implementation → Verification). Invoke directly via @monkeymode-lite, or let @monkeytriage route to it after triage. Requires the monkeymode skill installed alongside (shared guides). No parallel subagents, no integration phase.
author: MonkeyMode Contributors
---

# MonkeyMode Lite — Small Feature Workflow

## Intent

MonkeyMode Lite is a streamlined 4-phase workflow for features that fit a single story: a focused change that touches a small number of files, introduces no new public APIs or services, and does not require parallel development.

**User invokes:** `@monkeymode-lite for [feature]` (or delegated from `@monkeytriage` after triage)

> `{skill_dir}` means the directory that contains the installed skill folders (e.g. `~/.claude/skills` or `~/.cursor/skills`). Paths like `{skill_dir}/monkeymode/guides/…` are resolved against it.

> If you arrived here via `@monkeytriage`, triage has already run, `state.json` exists, and `context.workflow_tier: "lite"` is already set. Read state, skip to the current phase, and continue.

> If `context.explore_handoff` is `true`, design was imported from `@explore`. Read `.monkeymode/{feature-name}/design.md`. Do **not** re-run the design interview. **Verify `context.detected_stack` is populated** — if missing, run stack detection (MonkeyMode Phase 1A Step 0) before continuing. Start at `current_phase` (typically `code_spec` if design is complete).

**Phases:**
1. **Phase 1 — Design** — single `design.md` (discovery + contracts merged)
2. **Phase 2 — Code Spec** — single `code-spec.md` (orchestrator writes directly)
3. **Phase 3 — Implementation** — orchestrator implements inline, no parallel batches
4. **Phase 4 — Verification** — checklist-based; optional `verifier` for larger changes

**Checkpoints (user confirmation required):** after code spec, after verification.

---

## When Lite Is Not Enough

MonkeyMode Lite is strictly a 4-phase, single-story workflow. It does **not** promote to Full mid-run.

If during the lite run you discover that the feature actually requires:
- A second independent story
- A new public API, service, or database schema
- A platform supplement or cross-service integration
- Parallel development across multiple files

**Stop the lite workflow** and tell the user:

> "This feature exceeds MonkeyMode Lite's scope. Use `@monkeymode for {feature-name}` (or `@monkeytriage` and choose Full) in a **new** feature folder."

Do **not** convert the lite workspace (`design.md`, `code-spec.md`) into full artifacts (`design/1a..1c`, `stories/user_stories.md`, `code_specs/`). Do **not** rewrite `workflow_tier` to `full`.

---

## Workspace Artifacts

```text
{workspace}/
├── .monkeymode/
│   └── {feature-name}/
│       ├── state.json          # workflow_tier: lite
│       ├── qa-log.md           # Q&A log (always on)
│       ├── critique-log.md     # Optional; only if the user asked for phase critique
│       ├── design.md           # Phase 1 output
│       └── code-spec.md        # Phase 2 output
└── src/
    └── [production code]       # Phase 3: Code written here
```

### state.json Schema

```json
{
  "feature_name": "string (kebab-case)",
  "current_phase": "design|code_spec|implementation|verification|completed",
  "phase_status": {
    "design": "not_started|in_progress|completed",
    "code_spec": "not_started|in_progress|completed",
    "implementation": "not_started|in_progress|completed",
    "verification": "not_started|in_progress|completed"
  },
  "artifacts": {
    "design_doc": ".monkeymode/{feature-name}/design.md",
    "code_spec": ".monkeymode/{feature-name}/code-spec.md",
    "qa_log": ".monkeymode/{feature-name}/qa-log.md"
  },
  "stories": {
    "story-1-{feature-name}": {
      "title": "string",
      "status": "not_started|code_spec|implementation_complete|verified|completed",
      "code_spec_path": ".monkeymode/{feature-name}/code-spec.md",
      "files_to_create": [],
      "files_to_modify": [],
      "verification": {
        "result": "pending|pass|fail|pass-with-warnings",
        "rework_attempts": 0,
        "verified_at": null
      },
      "last_updated": "ISO8601 timestamp"
    }
  },
  "context": {
    "workflow_tier": "lite",
    "save_qa_log": true,
    "detected_stack": {
      "language": "java|python|typescript|csharp|hcl|null",
      "framework": "spring-boot|quarkus|micronaut|fastapi|django|flask|angular|react|nextjs|aspnet-core|null",
      "framework_version": "string|null",
      "build_tool": "gradle|maven|uv|poetry|pip|npm|pnpm|yarn|dotnet|terraform|null",
      "test_framework": "junit|pytest|jest|vitest|xunit|nunit|null",
      "cloud_provider": "aws|gcp|azure|null",
      "platform": "<name>|none|null",
      "platform_version": "string|null",
      "platform_supplement_loaded": false,
      "platform_supplement_warnings": []
    }
  },
  "last_updated": "ISO8601 timestamp"
}
```

Do **not** add `phase_critique` to the initial `state.json`. It appears only after the user asks for phase critique; shape is in the shared Full `PHASE-CRITIQUE-LOOP.md` (State). Absence means critique was not run.

### Lite vs Full at a glance

| Aspect | Lite | Full |
|--------|------|------|
| Design docs | 1 file (`design.md`) | 3 files (`1a`, `1b`, `1c`) |
| User stories | 1 (implicit in state) | `stories/user_stories.md` with N stories |
| Code specs | 1 file (`code-spec.md`) | `code_specs/story-*.md` per story |
| Phase count | 4 | 10 (1A, 1B, 1C, 2, 2B, 3, 4, 5, 6, 7) |
| Subagents | None by default | code-spec-writer, implementer, verifier, reworker |
| Parallel execution | No | Yes (up to 10 concurrent) |
| Integration phase | No | Yes (Phase 6) |
| Promotion to Full | Not supported | N/A |

---

## On Every Invocation

1. **Extract feature name** from the user's request (or prompt if not provided).
2. **Read state:** `{workspace}/.monkeymode/{feature-name}/state.json`.
   - If state exists: read `current_phase`, resume from there. If `context.explore_handoff` is `true`, do **not** re-run the design interview.
   - If no state: first check `.explore/{feature-name}/design/design.md` with completed explore state. If present, execute explore `phases/05-handoff.md` Path A as **Lite** (`workflow_tier: "lite"`) — do not write a blank `current_phase: "design"` state. Otherwise `@monkeytriage` should have already created state; if still missing, create it with `current_phase: "design"`.
3. **Update Q&A log** (`qa-log.md`) throughout all phases — always on.
4. **Load the phase guide** for the current phase (see Phase Reference below).
5. **Execute the phase**, save artifacts, update state.
6. **Checkpoint** where required; then advance. Do **not** run phase critique unless the user asked (see Optional Phase Critique).

**Resume listing:** If no feature name is given:
```
Found MonkeyMode Lite features in this workspace:
  1. export-button  — Phase: design (in_progress)
  2. dark-mode-fix  — Phase: verification (completed)

Which feature would you like to continue with?
```

---

## Phase Reference

| `current_phase` | Phase Guide | Output |
|-----------------|-------------|--------|
| `design` | `phases/01-design.md` | `design.md` |
| `code_spec` | `phases/02-code-spec.md` | `code-spec.md` |
| `implementation` | `phases/03-implementation.md` | `src/` changes |
| `verification` | `phases/04-verification.md` | verified feature |
| `completed` | — | Done |

Read the matching phase file for the full methodology before executing.

---

## Optional Phase Critique

Do **not** run critique on your own. If the user says `run phase critique`, `critique this phase`, or `critique the phase we just finished`, follow the **shared Full guide** with an **explicit** `completed_phase_key` for the phase that just finished. Never infer that key from `current_phase`.

### Guide resolution (portable)

Using the `{skill_dir}` defined at the top of this file:

Resolve `{skill_dir}/monkeymode/guides/PHASE-CRITIQUE-LOOP.md`.

**Canonical repo source** (for contributors editing the monorepo): `monkeymode/guides/PHASE-CRITIQUE-LOOP.md`.

**Missing guide:** If the user asked for critique and the resolved path does not exist → stop with `CRITIQUE_ESCALATE`. Tell the user both skills must be installed/synced side by side (`monkeymode` + `monkeymode-lite`). Do **not** treat missing guide as PASS.

### Eligible Lite phase keys

`design` | `code_spec` | `implementation` | `verification`

### Lite-specific rework (when critique was requested)

- **Safe current-phase fixes:** orchestrator applies inline (no `reworker`).
- **Earlier-phase defects:** set `current_phase` back to `design` or `code_spec` as appropriate; notify the user what changed and why. Do not edit approved `design.md` / `code-spec.md` silently to make the current phase pass.

When spawning the independent critic Task, use the default model. All other Lite work remains inline orchestrator execution.

### State and logs

The guide maintains `phase_critique.<completed_phase_key>` in `state.json` and appends to `qa-log.md` and `critique-log.md` under `.monkeymode/{feature-name}/`. Absence of `phase_critique` means it was not run.

---

## Verify Assumptions with Spikes (All Phases)

Across every phase, **never let an unverified assumption about third-party/library/API/runtime
behavior become a load-bearing part of the design, spec, or implementation.** When a factual
detail can be checked empirically (SDK type shapes, API response fields, error semantics,
method signatures, capability/version support), run a **spike** — a small, time-boxed
investigation that replaces the assumption with evidence — rather than guessing or shipping a
"this may not be supported" caveat.

Priority order for spike evidence: (1) inspect the actual installed code/types for the pinned
version, (2) run a minimal reproduction, (3) read official docs/changelogs, (4) web search
last and distrust it — if a source contradicts the installed code, the installed code wins.
Record the result (what was verified, the evidence, the implication, and any prior assumption
it retired) in the relevant artifact and add a References line pointing at the artifact.

Spikes are especially valuable in **Phase 1 (Design)** and **Phase 2 (Code Spec)**, where a
single wrong assumption propagates into the implementation. The full methodology lives in
`phases/01-design.md` under "Verify with a Spike."

---

## Coding Guidelines

Lite does **not** include its own `guides/` directory. Load guidelines from the `monkeymode` skill, which must be installed alongside this one:

- `{skill_dir}/monkeymode/guides/{LANGUAGE}-CODING-GUIDELINES.md`
- Framework supplement: `{skill_dir}/monkeymode/guides/{LANGUAGE}-{FRAMEWORK}-SUPPLEMENT.md`
- Platform supplement: `{skill_dir}/monkeymode/guides/{PLATFORM}-PLATFORM-SUPPLEMENT.md`

Stack detection follows `monkeymode/phases/01a-design-discovery.md` Step 0a (scan config files, populate `detected_stack` in state.json).

---

## Never Do

- ❌ Spawn parallel `implementer` or `code-spec-writer` subagents (lite uses inline orchestrator execution)
- ❌ Create a Phase 2 (User Stories) decomposition — there is exactly one story in lite
- ❌ Create a Phase 6 (Integration) — lite has no integration phase
- ❌ Promote or migrate lite artifacts to full format mid-run
- ❌ Rewrite `workflow_tier` to `full` on an existing lite project
- ❌ Auto-advance past user checkpoints
- ❌ Duplicate `PHASE-CRITIQUE-LOOP.md` under Lite; if the user asked for critique and the sibling guide is missing, escalate — do not invent a Lite copy

## Always Do

- ✅ Spike (verify empirically) any load-bearing assumption about library/API/runtime behavior instead of guessing or shipping it as a caveat; record the evidence and retire stale assumptions
- ✅ Read `state.json` and resume at `current_phase`
- ✅ Log Q&A to `qa-log.md` throughout
- ✅ Load the matching phase guide before executing
- ✅ Load coding guidelines from `{skill_dir}/monkeymode/guides/`
- ✅ Save `design.md` and `code-spec.md` to `.monkeymode/{feature-name}/` (not `src/`)
- ✅ Update `state.json` after each significant action
- ✅ Ask user before advancing: after code spec, after verification
- ✅ Stop and surface scope overflow rather than stretching lite
