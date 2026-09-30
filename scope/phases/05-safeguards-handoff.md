---
name: safeguards-handoff
description: Phase 5 - Architectural Safeguards & Scope Sign-Off. Documents assumptions, Phase-1 boundaries, @monkeyplan inputs, Executive Summary, Eng+Product+Design sign-off, optional tracker sync, and @monkeyplan handoff.
---

# Phase 5: Architectural Safeguards & Scope Sign-Off

## Purpose

Produce **Section 5**, assemble the **Executive Summary**, close the **Product + Engineering scope gate** (Design included), optionally sync to your issue tracker, and hand off to `@monkeyplan`.

## What to Produce

### 5.1 Technical Assumptions

List every assumption from Sections 1–4, including Section 4.2 defaults and any ownership assumed when SiteMap was thin.

```markdown
| # | Assumption | Affects | Invalidated if... |
|---|------------|---------|-------------------|
| 1 | Peak load < 1k concurrent at launch | storage (1.4), effort (2) | PM confirms >10k → add cache + revisit sizing |
```

### 5.2 Architectural Boundaries — What Phase 1 Will NOT Do

```markdown
**In Phase 1:** {one-line restatement of the in-scope core}

**Explicitly NOT in Phase 1:**
- {capability deferred + reason}
- {non-goal a reader might wrongly assume}
```

Tie each exclusion to either a future phase or an unresolved Section 4 question. Out-of-scope is a decision, not an omission.

### 5.3 Inputs @monkeyplan Needs Next

| Input @monkeyplan needs | Source | Status |
|-----------------|--------|--------|
| Candidate Epic list + sizes + owning org/team | §2.1 | ready |
| Impacted teams (PM rollup) | §3.4 | ready |
| Per-org scopes + cross-org blockers | §3.5 / §3.3 | ready |
| Resolved PM answers | §4.2 / `open-questions.md` | pending PM |
| Data model / API contract shapes | §1.3–1.4 | ready / partial |
| Stack decision (if greenfield) | §1.1 | ready / pending |
| SiteMap (orgs/teams/repos/aliases) | `sitemap.yaml` | {source} |
| Prototype decisions (if any) | Phase 0 | {status} |
| Artifact store location | Phase 0 | {type/path} |

Anything `pending` is a precondition the user should clear before — or early in — @monkeyplan.

## Assemble the Executive Summary (before the gate)

Write the **Executive Summary** at the **top of `blueprint.md`** (after header metadata, before §1). This is the only part most of the room will read live, so it must let Eng + Product + Design **review, challenge, and sign off in minutes** — and surface the questions worth discussing. It is a *rollup*, not new analysis: every line restates a section already written and points to it.

Fill every field — leave none blank (write "None" where a field genuinely doesn't apply).

```markdown
## Executive Summary

**What this is:** {1–2 sentences}
**Why now / the core shift:** {problem + so what}
**Orgs / teams in scope:** {from §3.4 — so PMs see who must join}
**What we're building ({N} epics):**
1. **{Candidate epic}** — {outcome} *(org/team)* *(§2.1)*
2. ...
**Size & shape:** ~{N}–{M} epics → ~{S1}–{S2} sprints → ~{PW1}–{PW2} person-weeks *(§2)*
**Recommended sequencing:** {…} *(§2.2/§5.3)*
**Most complex / top risk:** **{epic}** — {why}; de-risk by {…}. *(§2.3, §5.1)*
**Cross-org prerequisites:** {from §3.3/§3.5, or "None — single org"}
**In scope:** {…}  /  **Explicitly NOT in scope:** {…} *(§5.2)*
**Key decisions needed from the room:**
- {2–5 decision-shaped questions} *(§4.2)*
**Status:** Draft — pending Eng/Product/Design sign-off.
```

Rules:
- **Numbers must match the sections.** Epic count, person-weeks, and sprint ranges are copied from §2 — never re-estimated here.
- **Every epic in §2.1 gets a one-line bullet, with its owning org/team.** The "What we're building" list *is* the scope at a glance, and in a multi-org feature the org tag is what tells the room who is on the hook.
- **Keep it to one screen.** If it runs longer than ~1 page, the sections are leaking detail upward — tighten.
- **Add a small table only when it earns its place.** For a multi-org, multi-pillar, or multi-mode feature, a 3–4 row table under "Why now / the core shift" (e.g. org × outcome × epics) or under "What we're building" (e.g. user-facing modes × behavior) makes the room's review faster. Skip it for single-thread features — prose is enough.
- **Depth bar:** every field is filled, each claim carries its section reference, and a PM could act on it without opening §1–§5. If an earlier signed blueprint exists under `.scope/`, use its `## Executive Summary` as the reference for depth and tone.

## Scope Sign-Off Gate (mandatory)

Present the Executive Summary as the briefing. Request explicit sign-off from all three roles. Eng should already have been present during Phases 0–3; this gate records formal alignment.

```
"Blueprint complete — Executive Summary is at the top of blueprint.md.
This is the PRD → @monkeyplan Scope gate. Sign-off needed:

  1. Engineering — architecture, estimates, multi-org ownership are sound
  2. Product     — scope, boundaries, impacted teams, open questions accepted
  3. Design      — UX implications and component scope understood

Walk the Executive Summary (especially Orgs/teams in scope + Key decisions),
then confirm each role (or note what's blocking)."
```

```json
{ "scope": { "engineering_signed": true, "product_signed": true, "design_signed": true,
             "signed_at": "ISO8601" } }
```

Do **not** hand off to @monkeyplan until all three are `true` (or a waiver is logged in `qa-log.md`).

## Offer to Update the Source PRD (optional, explicit opt-in)

Scope's job is never to silently rewrite the PRD — the "never modify the source PRD" rule from Phase 0 still holds everywhere except this one gated step. But the room often surfaces things the PRD didn't know when it was written: teams it never named, resolved open questions that change stated scope, or boundaries that narrow what it implied. Leaving those only in `blueprint.md` lets the PRD silently drift out of sync with what Engineering is actually about to build — a PM reading only the PRD later would have no idea the scope shifted.

Check, after sign-off, whether `context.prd_path` is set and any of these are non-empty:
- `context.impacted_teams` (§3.4) includes a team the PRD never mentioned
- A §4.2 question was resolved with an answer that changes stated scope
- A §5.2 boundary narrows or contradicts something the PRD implied

If so, offer an amendment — never silently:

```
"Scope surfaced some things your PRD doesn't mention yet:
  - {impacted team the PRD didn't name}
  - {resolved question that changes scope}
  - {boundary that narrows what the PRD implied}

Want me to draft an amendment to {prd_path}? I'd add a dated 'Scope Findings'
appendix section — never rewrite your existing sections — and show you the
exact diff before writing anything.

1. Yes — draft it, show me the diff, I'll approve before you write
2. No — leave the PRD as-is; this stays in blueprint.md only
3. I'll do it myself — just give me the bullet list"
```

Rules:
- **Never auto-write.** Always render the proposed diff and get explicit approval before touching the PRD file — same bar as any other write in this skill.
- **Append, don't rewrite.** Add a clearly dated `## Scope Findings ({date})` appendix to the end of the PRD rather than editing existing prose. The PRD's original authorship and Product's intent stay intact and auditable; nothing already written is silently changed.
- **Record the outcome**, regardless of the answer:

```json
{ "prd_amendment": { "offered": true, "accepted": true, "amended_at": "ISO8601" } }
```

- If accepted, log the amendment in `qa-log.md` and note it in the sign-off announcement. If declined, still set `"offered": true` so a later run doesn't ask again unless new findings appear.

## Tracker Sync (optional — after sign-off)

**Ownership boundary:** `@scope` only *links the artifact* and (opt-in) *stubs candidate epics* — `@monkeyplan` formalizes epics and creates stories.

This step is tool-neutral. Use whatever CLI or MCP exists for your issue tracker or Git host (for example `gh issue`, `glab issue`, or a tracker integration). If none is available, skip it and tell the user what would have been created.

```
"Scope signed. Anchor it in your issue tracker?

  1. Link only      — attach blueprint.md + summary comment to an existing issue
  2. Stub epics     — placeholder epics from §2.1 (label scope-stub); @monkeyplan formalizes
  3. Skip

Which? (and which tracker / project?)"
```

Show the plan and confirm before any write:

- Option 1: attach `.scope/{feature-name}/blueprint.md` to `{ISSUE-KEY}` and add a comment: "Scope blueprint signed (Eng/Product/Design). Orgs: {orgs}. Candidate epics: {N}; ~{PW1}–{PW2} pw."
- Option 2: one stub epic per candidate epic, name `{Candidate Epic name}`, summary `{one-line outcome}`, body "Stub from @scope blueprint ({feature-name}); org={org}; @monkeyplan to formalize. Size {S/M/L}.", label `scope-stub`; then link blockers (`Blocks`) per §3.3.

Backfill keys into blueprint header **Tracker:** field, §5.3, and state:

```json
{ "scope": { "tracker": { "name": "{tracker}", "project_key": "{PROJECT}",
            "linked_issue": "{KEY or null}", "stub_epics": ["{KEY}"], "synced_at": "ISO8601" } } }
```

Write files to `context.artifact_store.path` (working copy always under `.scope/{feature}/` when the store is a wiki or other).

## @monkeyplan Handoff

**The handoff copy is automatic — do not offer it.** As soon as all three sign-offs are recorded, copy `blueprint.md` → `.monkeyplan/{feature-name}/blueprint.md` and update state:

```json
{ "current_phase": "completed",
  "phase_status": { "safeguards_handoff": "completed" },
  "plan_handoff": { "copied": true, "plan_path": ".monkeyplan/{feature-name}/blueprint.md", "copied_at": "ISO8601" } }
```

> **Why this isn't optional.** `@monkeyplan` Phase 0 auto-detects the blueprint by reading `.monkeyplan/{feature-name}/blueprint.md` and only enters Blueprint Import (Path D) if it finds it there. If the copy is skipped or written elsewhere, `@monkeyplan` falls back to the guided interview and silently discards the signed-off blueprint — no error, just a worse run that re-asks everything. Making it a prompt invites exactly that outcome, so it is a side effect of sign-off rather than a decision. If `context.artifact_store` points somewhere else (a wiki, another repo), that store is written *in addition to* this copy, never instead of it.
>
> The only opt-in step at handoff is the tracker sync above.

Then announce:
   > "Signed off and copied to `.monkeyplan/{feature-name}/`{; tracker stubs: {keys} — @monkeyplan will formalize them}. Invoke `@monkeyplan for {feature-name}` — its Phase 0 will load the blueprint to seed Epic sizing (§2, with owning org/team), impacted teams and per-org scopes (§3.4–§3.5), cross-org dependency notes (§3), and the data/schema inputs it needs (§5.3). Clear the `pending` items in §5.3 with your PM first where you can."

## Definition of Done

- [ ] Assumptions + Phase-1 boundaries + @monkeyplan inputs table complete
- [ ] Executive Summary at top — includes orgs/teams in scope; numbers match §2
- [ ] Eng + Product + Design sign-off recorded (or waiver logged)
- [ ] PRD amendment checked and offered if findings warrant it (or explicitly not applicable); outcome recorded in `prd_amendment` state
- [ ] Tracker sync offered; keys backfilled if synced
- [ ] Artifacts written to confirmed store path
- [ ] Blueprint copied to `.monkeyplan/{feature}/blueprint.md` — automatic on sign-off, never offered (exact path; `@monkeyplan` Path D depends on it)
- [ ] State → `completed`
