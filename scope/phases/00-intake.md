---
name: intake
description: Phase 0 - Intake. One batched question covering Eng co-presence, PRD, prototype, and artifact storage; then resolve the SiteMap ownership registry (A→B→C), confirm orgs in scope, and silently detect stack without AI-doc bias.
---

# Phase 0: Intake

## Purpose

Gather everything the blueprint depends on **before** analysis: **PRD**, optional **prototype**, **where to store artifacts**, and the **SiteMap ownership registry** (who builds what, across orgs). Confirm **Engineering is present** with Product. Detect stack silently **without** favoring repos that have richer AI-assistant rules.

## Steps

### Step 1 — Batched intake questions (one message)

Ask all four in a **single** message and let the user answer inline or by number. Do not walk them one at a time — these four are one prompt, not four. Pre-fill any answer you can infer from the invocation or the workspace and present it as a default to confirm.

Two checkpoints still follow, because both depend on this answer: confirming which orgs are in scope (Step 2, needs the SiteMap resolved) and the intake summary before Phase 1 (Step 4). Phase 0 is therefore about three exchanges, not one.

```
"Before I analyse anything, four quick inputs:

1. WHO'S IN THE ROOM — Scope is a joint Product + Engineering activity.
     a. Product + Engineering (recommended)
     b. Product only for now — Eng joins later
     c. Engineering only — Product joins for ownership/sign-off

2. PRD for {feature-name}?
     a. At .monkeyplan/{feature}/prt.md (what @monkeyplan writes) — I'll find it
     b. I'll paste the path / drag the file in
     c. I'll paste the content

3. PROTOTYPE or workflow design? (optional — I won't block on it)
     a. In prototypes/{feature}/ (what @prototype writes) or I'll paste a path
     b. I'll paste / attach the HTML or notes
     c. None yet — proceed, and note gaps prototyping would close

4. WHERE DO ARTIFACTS GO? (blueprint.md + open-questions.md)
     a. Workspace .scope/{feature}/ (repo-based docs — default)
     b. A specific repo path
     c. A wiki (space + parent page — I'll draft markdown to publish)
     d. Other — describe

Answer what you know; I'll use the defaults for the rest and confirm before writing."
```

Then resolve each answer:

**1. Eng co-presence.** `a` → `context.engineering_present: true`. `b` or `c` → set accordingly, warn that **team/repo ownership claims must be re-validated when Eng joins**, and continue. Log the choice in `qa-log.md`.

**2. PRD.** For `a`, read `.monkeyplan/{feature}/prt.md` (or any PRD path the user gives); if several candidate PRD files match the feature, pick the most recent and confirm. Read the full PRD and validate it looks like one (problem, scope, requirements, success metrics) — if thin, warn and ask whether to proceed or return to the PRD author. Store `context.prd_path`. **Never modify the source PRD during intake or any phase before sign-off** — the only sanctioned amendment point is the explicit, reviewed opt-in in Phase 5 (`phases/05-safeguards-handoff.md` → "Offer to Update the Source PRD"), and even there nothing is written without the user approving a shown diff.

If no PRD can be found, stop: *"I need an approved PRD to produce a scope blueprint. Get the PRD approved first, or paste the document."*

**3. Prototype.** If provided, read it and extract workflow decisions, screens/steps, and edge cases. Store `context.prototype_path` and `context.prototype_status: "provided"`. These decisions **override** PRD ambiguity in later phases when they conflict — call out the conflict in §4. If declined or absent, set `context.prototype_status: "declined"` or `"none"` and add a §4 question: *"Should we pause for `@prototype` before locking multi-org epics?"* Never refuse to run — exploratory scoping must stay possible.

**4. Artifact store.** Never auto-select a repo, and especially never the first rich AI-doc repo you find. Persist `context.artifact_store: { type, path }` and write outputs there, always keeping `.scope/{feature}/` as the working copy so state and resume keep working. If `sitemap.yaml` → `artifact_defaults` holds a saved preference, offer it as the default but still confirm once per feature. Log the choice in `qa-log.md`.

> The `.monkeyplan/{feature}/blueprint.md` handoff copy written in Phase 5 is **not** governed by this choice — it is always written, in addition to the artifact store, because `@monkeyplan` auto-detects that exact path.

### Step 2 — Resolve the SiteMap ownership registry (Cascade A → B → C)

SiteMap is the **authority** for org/team/repo ownership. Schema: `templates/sitemap-template.yaml`. Discovery rules: `references/discovery-rules.md`.

**Check for a prior Discovery Mode run first.** If `.scope/{feature-name}/state.json` already has `discovery.completed: true` with `orgs_in_scope` / `impacted_teams` / `sitemap_source` populated (from `phases/00b-discovery-mode.md`), skip Path A/B/C entirely — show the saved org/team list and ask only for **re-confirmation**, not re-capture: *"Discovery already identified {org list} for this feature. Still accurate, or has anything changed?"* This is what makes Discovery Mode upgrade cleanly into the full blueprint without re-asking Eng or Product anything they already answered.

#### Path A (preferred) — `sitemap.yaml`

```
Read {workspace}/sitemap.yaml
```

If present and valid:
- Set `context.sitemap_source: "sitemap.yaml"`, `context.sitemap_path: "sitemap.yaml"`.
- Extract `orgs`, `teams`, `capabilities`, `aliases`, `external_systems`.
- Pre-list orgs that the PRD language might touch (using aliases) into a candidate `context.orgs_in_scope` — **confirm with the user** before locking.

#### Path B (fallback) — `catalog-info.yaml`

If no `sitemap.yaml`, scan for per-repo `catalog-info.yaml`:
- Derive a working SiteMap: `spec.owner` → team, metadata → repo.
- **Normalize:** treat every catalog equally — do **not** prefer repos that also have `.cursor/rules`, `AGENTS.md`, or dense AI docs.
- Set `context.sitemap_source: "catalog-info.yaml"`.
- Set `context.pending_sitemap_write: true` and hold the derived orgs/teams/repos in memory — the actual write happens in "Persist the SiteMap" below, once orgs are confirmed.

#### Path C (fallback) — Interactive multi-org capture

If neither A nor B:

```
"No SiteMap found. Scope needs an ownership registry so we don't guess
(e.g. wrongly scoping everything into one org). For each org involved:

  • Org name (e.g. Platform, Web, Billing)
  • Teams under it
  • Primary repo(s) + what each provides (capabilities / aliases)
  • Product owner / tech lead contacts if known

You can give partial info — UNKNOWN is better than a wrong owner.
Want me to save the result as sitemap.yaml?"
```

- Set `context.sitemap_source: "interactive"`. If the user agreed to save, set `context.pending_sitemap_write: true` and hold the captured orgs/teams/repos in memory — the actual write happens in "Persist the SiteMap" below, once orgs are confirmed. If they declined, set `context.pending_sitemap_write: false` and note in `qa-log.md` that SiteMap will be re-asked on the next run.

#### If the SiteMap stays empty

Proceed with `context.sitemap_source: "none"`. Every ownership cell in §3 is `UNKNOWN — confirm with PM/Eng`, and §4 gains ownership questions. **Warn prominently:** multi-org features will be unreliable without a SiteMap.

#### Confirm orgs in scope

After any path that yields teams/orgs, ask:

```
"Based on the PRD + SiteMap, these orgs/teams look in scope:
  {list}

Add, remove, or confirm. I will plan per-org scopes from this list —
not from whichever repos have the most AI documentation."
```

Store confirmed list in `context.orgs_in_scope` / seed `context.impacted_teams`.

#### Persist the SiteMap (mandatory when `pending_sitemap_write` is true)

Do this immediately after orgs are confirmed above — **do not just offer and move on, and do not defer the write to Phase 5.** Confirming here is the last point the data changes shape, so it's the write point:

1. Build the YAML from `templates/sitemap-template.yaml`'s schema (`orgs`, `teams[].repos[].provides`/`aliases`, `capabilities`), populated from whatever Path B derived or Path C captured, filtered/edited to match the confirmed `context.orgs_in_scope`.
2. Write it to `{workspace}/sitemap.yaml` now.
3. Set `context.sitemap_path: "sitemap.yaml"` and log the write in `qa-log.md` (path + org/team count).
4. Confirm to the user in one line: *"Saved `sitemap.yaml` at the workspace root — {N} orgs / {M} teams. Future `@scope` and `@monkeyplan` runs will read it automatically."*
5. If the user declined to save (Path C) or `pending_sitemap_write` is `false`, skip the write and say so explicitly instead of staying silent: *"Not saving — this run's ownership data stays in `.scope/{feature-name}/state.json` only; the next feature will need to rebuild it."*

### Step 3 — Silent stack detection (bias-safe)

Without asking, scan the workspace **for stack signals only**:
- Config files: `package.json`, `pyproject.toml`, `pom.xml`, `build.gradle`, `*.csproj`, `*.tf`, `Dockerfile`, etc.
- Platform markers: `PLATFORM.md`, `monkeymode.config.yaml`, `catalog-info.yaml`.

**Anti-bias rules (mandatory):**
- Presence of `.cursor/`, `AGENTS.md`, rich README, or AI-assistant rules **must not** increase a repo's score for ownership or inclusion.
- When multiple candidate repos match a capability, prefer **SiteMap `provides` / `aliases`**, then `catalog-info` owner — never "most documented."
- If only one local repo is checked out, do **not** assume it owns the whole feature; keep other SiteMap orgs as first-class.

Write to `context.detected_stack`. Greenfield → note it.

### Step 4 — Confirm inputs & transition

```
"Intake complete:
  • PRD:         {prd_path}
  • Prototype:   {prototype_status} {prototype_path}
  • Artifacts:   {artifact_store.type} → {artifact_store.path}
  • SiteMap:     {sitemap_source} ({N} orgs / {M} teams)
  • Orgs in scope: {orgs_in_scope}
  • Eng present: {yes/no}
  • Stack:       {detected_stack summary, or 'greenfield'}

I'll produce the multi-org technical blueprint next. Section 3 will identify
impacted teams and split work per org. Ready?"
```

On confirm:

```json
{
  "current_phase": "1",
  "phase_status": { "intake": "completed", "system_design": "in_progress" }
}
```

Phase 0 → 1 is the only automatic transition after confirmation.

---

## Definition of Done

- [ ] Intake questions asked as **one batched message**, not four separate turns
- [ ] PM/Eng co-presence recorded (`context.engineering_present`)
- [ ] PRD located and read; `context.prd_path` set
- [ ] Prototype prompted; status set (`provided` | `declined` | `none`)
- [ ] Artifact store confirmed; never auto-picked a repo
- [ ] SiteMap resolved via A, B, or C; orgs in scope confirmed with user
- [ ] If Path B or C and the user opted in, `sitemap.yaml` is **actually written** to the workspace root (not just offered) — `context.sitemap_path` set and confirmed to the user
- [ ] Stack detected without AI-doc bias
- [ ] `qa-log.md` started
- [ ] User confirmed; state advanced to phase 1
