---
name: scope
description: Scope — the engineering-led technical blueprint between PRD and @monkeyplan. Ingests an approved PRD, optional prototype, and a SiteMap ownership registry; produces a multi-org blueprint (system design, effort, dependencies, edge cases, safeguards) with per-team scopes, impacted-team identification for PMs, and Eng+Product+Design sign-off. Conceptual only — no low-level code. Invoke with @scope for [feature]. Also supports a standalone, PRD-free "Discovery Mode" (@scope discover for [feature]) for PM self-serve team-ownership lookups, and an opt-in PRD amendment step at sign-off.
author: MonkeyMode Contributors
---

# Scope — PRD → @monkeyplan Technical Blueprint

## Intent

`@scope` is the engineering-led checkpoint **between PRD and @monkeyplan**. It ingests an approved PRD, optionally a **prototype**, and a **SiteMap ownership registry** (org → team → repo → capabilities + aliases), then produces an intermediate **technical blueprint**: structural clarity, estimates, multi-org dependencies, and risk — with **no** file/function-level design (that is `@monkeymode` Phase 1 design and Phase 3 code spec) and **no** requirements writing (that is `@monkeyplan`).

**Invoke:** `@scope for [feature]` (after your PRD is approved, before `@monkeyplan`).

**Or, before a PRD exists:** `@scope discover for [feature]` — a lightweight, PM self-serve lookup that answers "which teams do I need to talk to" with no PRD and no Engineering co-presence required. See `phases/00b-discovery-mode.md`. It upgrades into the full flow above without re-asking anything already answered.

**Ownership:** **PM + Engineering co-owned during generation** (Eng leads technical judgment; Product confirms scope/ownership). Design joins the Phase 5 sign-off. Eng presence is required from Phase 0 — not only at the end. Discovery Mode is the one exception: it is explicitly PM self-serve, with its ownership output flagged as not yet Eng-validated.

## Phase Flow

Load **only the current phase file**. Transitions checkpoint with the user; Phase 0 → 1 is automatic once inputs are resolved. Phase 5's sign-off gate is never skipped.

| Phase | File | Produces (blueprint section) |
|-------|------|------------------------------|
| 0 | `phases/00-intake.md` | PRD + prototype prompt; artifact store; SiteMap registry; Eng co-presence; stack (bias-safe) |
| 1 | `phases/01-system-design.md` | §1 Architecture, components, data flow, storage |
| 2 | `phases/02-effort-estimation.md` | §2 Epics → person-weeks (MonkeyMode cadence), tagged by owning org/team |
| 3 | `phases/03-dependencies.md` | §3 Deps + **multi-org scopes** + impacted teams (registry-first) |
| 4 | `phases/04-scope-edge-cases.md` | §4 Critical gaps + precise PM questions |
| 5 | `phases/05-safeguards-handoff.md` | §5 Safeguards + Executive Summary + sign-off + optional PRD amendment + optional tracker sync |

Output: `blueprint.md` (template: `templates/blueprint-template.md`) and `open-questions.md`.

**Discovery Mode (`phases/00b-discovery-mode.md`) is a fork of Phase 0, not a numbered phase.** It produces `discovery.md` only and never advances `current_phase` past `"0"`.

## On Every Invocation

1. Extract feature name (kebab-case). Read `{workspace}/.scope/{feature}/state.json`.
2. **Detect Discovery Mode vs. the full flow.** If the invocation says "discover", "who's involved", "which teams", or otherwise clearly asks only for team ownership with no PRD offered, load `phases/00b-discovery-mode.md` instead of `phases/00-intake.md` — regardless of whether state exists yet. If the invocation says `@scope for [feature]` (the default) or a PRD/prototype is already offered, use the full flow.
3. **If state exists:** announce "Resuming Scope for '{feature}' at phase {current_phase}", load that phase file, continue. If only `discovery.completed` is set (no `current_phase` progress) and the user is now running the full flow, say so: *"Discovery already ran for '{feature}' — I'll reuse the confirmed orgs/teams and continue into the full blueprint."*
4. **If not:** create `.scope/{feature}/` + initial `state.json` (`current_phase: "0"`, `save_qa_log: true`), then load the phase file chosen in step 2.


## SiteMap = ownership registry (resolved in Phase 0)

SiteMap is the **authoritative** map of org → team → repo → capabilities. Cascade: **A** `sitemap.yaml` (preferred — `templates/sitemap-template.yaml`) → **B** per-repo `catalog-info.yaml` → **C** interactive capture. **Never rank repos by Cursor AI rules / docs density.** Unresolved owners → `UNKNOWN — confirm with PM/Eng` + Phase 4 questions. Full logic in `phases/00-intake.md`; discovery rules in `references/discovery-rules.md`.

**If Path B or C is used and the user opts in, `sitemap.yaml` is written to the workspace root before Phase 0 ends** — not merely offered. This is what makes later runs (and `@monkeyplan`) resolve straight to Path A.

## State Schema

`{workspace}/.scope/{feature}/state.json`:

```json
{
  "feature_name": "kebab-case",
  "current_phase": "0",
  "phase_status": {
    "intake": "not_started", "system_design": "not_started",
    "effort_estimation": "not_started", "dependencies": "not_started",
    "scope_edge_cases": "not_started", "safeguards_handoff": "not_started"
  },
  "discovery": {
    "completed": false, "completed_at": null, "discovery_path": null
  },
  "context": {
    "save_qa_log": true, "prd_path": null,
    "discovery_ask": null,
    "prototype_path": null, "prototype_status": "none|provided|declined",
    "artifact_store": { "type": null, "path": null },
    "sitemap_source": "sitemap.yaml|catalog-info.yaml|interactive|none",
    "sitemap_path": null,
    "pending_sitemap_write": false,
    "orgs_in_scope": [],
    "impacted_teams": [],
    "engineering_present": false,
    "detected_stack": {}, "architecture_pattern": null
  },
  "blueprint": {
    "epic_count_estimate": null, "person_weeks_estimate": null,
    "most_complex_epic": null, "blocking_dependencies": [],
    "per_org_scopes": []
  },
  "scope": {
    "engineering_signed": false, "product_signed": false, "design_signed": false,
    "signed_at": null,
    "tracker": { "name": null, "project_key": null, "linked_issue": null, "stub_epics": [], "synced_at": null }
  },
  "prd_amendment": { "offered": false, "accepted": false, "amended_at": null },
  "plan_handoff": { "copied": false, "plan_path": null, "copied_at": null },
  "last_updated": "ISO8601"
}
```

Status values: `not_started | in_progress | completed | skipped`.

## Workspace Layout

```
{workspace}/
├── sitemap.yaml                     # Ownership registry (Path A)
├── .monkeyplan/{feature}/prt.md     # PRD input (from @monkeyplan, or any PRD path you give)
├── prototypes/{feature}/            # Optional prototype input (from @prototype, or any path you give)
└── .scope/{feature}/                
    ├── state.json  qa-log.md
    ├── discovery.md                 # Discovery Mode output only (optional, no PRD needed)
    ├── blueprint.md
    └── open-questions.md
```

Artifact location is **user-confirmed in Phase 0** (Git repo path, wiki space, or other) — never auto-picked. Independently of that choice, sign-off **always** copies `blueprint.md` to `.monkeyplan/{feature}/blueprint.md`. That exact path is what triggers `@monkeyplan`'s Blueprint Import (Path D), so it is written automatically rather than offered, and must not be changed.

## Core Rules

1. **No low-level code.** Conceptual architecture and contract *shapes* only; file/function design is `@monkeymode`.
2. **Objective, technical tone.** Flag risk honestly.
3. **SiteMap-first ownership.** Plan from the registry, not from which repos have richer AI docs. Never invent an owning org/team.
4. **Persist the SiteMap on confirm, not just offer it.** When Path B or C derives/captures ownership data and the user agrees to save it, write `sitemap.yaml` to the workspace root **before** leaving Phase 0 — right after orgs-in-scope are confirmed, per `phases/00-intake.md`. A skipped write must be stated out loud, not silent.
5. **Prompt for prototype; do not hard-block.** If present, incorporate workflow decisions. If declined, log and proceed.
6. **Ask where artifacts are stored** before writing outputs; persist the choice in state. This never overrides the `.monkeyplan/{feature}/blueprint.md` handoff copy, which sign-off always writes.
7. **Multi-org by default.** When SiteMap shows ≥2 orgs (e.g. web, billing, platform), produce **per-org scopes** and cross-org blockers — never collapse into one org's repos.
8. **Terminology independence.** Match via SiteMap `aliases` / `provides`, not exact PRD wording. See `references/discovery-rules.md`.
9. **PM + Eng during generation.** Confirm Eng co-presence in Phase 0; Eng validates team/repo claims in Phases 1–3.
10. **Anchor estimates to the MonkeyMode cadence:** 3-member team → 1–2 Epics per 2-week sprint. Size in Epics, then derive person-weeks/sprints, always ranged.
11. **Phase 4 questions are decision-shaped** — each with a default-if-unanswered.
12. **Phase 5 sign-off is mandatory** — Eng + Product + Design before any @monkeyplan handoff.
13. **Q&A logging always on** — append to `qa-log.md` after each confirmed decision.
14. **Never auto-advance** past a checkpoint (except 0 → 1). **@monkeyplan owns Capability/Epic creation.** `@scope` may, on opt-in, *link* the blueprint and *stub* candidate epics in your issue tracker.
15. **Discovery Mode never requires a PRD or Eng co-presence.** It exists precisely for the case where a PM needs team ownership before either exists. Its output is explicitly marked not-yet-Eng-validated, and it never advances `current_phase` past `"0"`. See `phases/00b-discovery-mode.md`.
16. **PRD amendment is opt-in and reviewed, never automatic.** Phase 5 may offer to append discovered findings to the source PRD, but only after showing the exact diff and getting explicit approval — see `phases/05-safeguards-handoff.md` → "Offer to Update the Source PRD". Outside that one gated step, the source PRD is never modified.

## Tracker Sync (Phase 5, optional)

After sign-off, offer an optional sync to your issue tracker or Git host, using whatever CLI or MCP is available (for example `gh`, `glab`, or a tracker integration): ask which tracker and project, **show the plan, confirm before write**.

- **Link only (default-safe):** attach `.scope/{feature}/blueprint.md` + summary comment.
- **Stub epics (opt-in):** one stub per §2.1 candidate; label `scope-stub`; link `Blocks` from §3.3.
- Backfill keys into blueprint header, §5.3, and `scope.tracker` state. Detail in `phases/05-safeguards-handoff.md`.

## Help Mode

If invoked bare or with `help`:

```
Scope — the technical blueprint between PRD and @monkeyplan.
  @scope for [feature]           Generate Executive Summary + multi-org blueprint
  @scope discover for [feature]  PM self-serve: "which teams do I need to talk to?"
                                  — no PRD, no Eng co-presence required

Full flow needs: approved PRD; ideally sitemap.yaml (orgs/teams/repos/aliases)
and a prototype if one exists. Asks where to store artifacts. Output:
.scope/[feature]/blueprint.md + open-questions.md. Discovery Mode needs only a
one-line description and writes .scope/[feature]/discovery.md — running the
full flow afterward reuses its confirmed orgs/teams instead of re-asking.
Phase 5 can offer to amend the source PRD with findings, and can sync to
your issue tracker — both opt-in, both shown before any write.
```
