---
name: discovery-mode
description: Lightweight, PM self-serve entry point that answers "which teams/orgs do I need to talk to?" without requiring a PRD, a prototype, or Engineering co-presence. Resolves the SiteMap, confirms orgs in scope, and writes a short discovery.md. Upgrades cleanly into the full @scope blueprint later without re-asking anything already answered.
---

# Discovery Mode — "Who do I need to talk to?"

## Why this exists

The full Scope blueprint assumes a PRD exists and Engineering is in the room. But ownership questions often come up earlier — while iterating a prototype, sketching an idea, or reading a ticket, before a PRD is written and often before Engineering is looped in at all. Forcing that person through the full PRD-gated flow just to learn "who owns Activation" is why the gap existed in the first place: a PM writes a full PRD assuming they own everything a feature touches, and only discovers the missing shared-service team when Scope runs — too late to have looped them in from the start.

Discovery Mode is that lookup, standalone:

- **No PRD required.** A sentence or two describing the idea is enough; a PRD, prototype, or issue-tracker ticket helps but is optional extra signal, never a gate.
- **No Engineering co-presence required.** It's meant to be PM self-serve. Every ownership claim it produces is explicitly marked as **not yet Eng-validated** — Discovery tells you who to go talk to, it does not replace that conversation.
- **One artifact, not five sections.** `.scope/{feature-name}/discovery.md` — just the impacted-teams table and a pointer to the full flow.

## When this runs

Invoked directly — `@scope discover for [feature]`, `@scope who's involved in [feature]`, or in plain language ("I just want to know which teams this touches before I write anything"). See `SKILL.md` → "On Every Invocation" for the routing rule that detects this vs. the full flow.

## Steps

### Step 1 — Capture the ask (no PRD gate)

Ask once:

```
"What are you trying to build or change? A sentence or two is enough.

If you have a PRD, prototype, or issue-tracker ticket, share it and I'll use it for
extra context — but none of that is required to answer 'who do I talk to.'"
```

Store the raw description in `context.discovery_ask`. If a PRD, prototype, or ticket is offered, read it for terminology and signal only — do **not** validate it as a proper PRD (that check belongs to the full flow) and do not require it.

### Step 2 — Resolve the SiteMap (same cascade, Path A → B → C)

Identical logic to the full flow's SiteMap resolution in `phases/00-intake.md` — reuse `templates/sitemap-template.yaml`'s schema and `references/discovery-rules.md`'s ownership-resolution order and anti-bias rules. Don't default to whichever repo happens to be checked out locally, and don't rank by documentation density.

If `sitemap.yaml` already exists at the workspace root, this is a one-step lookup — read it, no questions needed beyond org confirmation (Step 3). If it doesn't, Path B/C from the full flow apply, including the persist-on-confirm write.

### Step 3 — Confirm orgs/teams in scope

Same "Confirm orgs in scope" prompt as the full flow:

```
"Based on what you described + the SiteMap, these orgs/teams look involved:
  {list}

Add, remove, or confirm."
```

Store into `context.orgs_in_scope` and `context.impacted_teams`.

### Step 4 — Write `discovery.md` and stop

Write a short artifact — not the 5-section blueprint:

```markdown
# Discovery: {feature-name}

**Generated:** {ISO8601} · **Mode:** PM self-serve — ownership below has **not** been validated by Engineering yet.

## Who you need to talk to

| Org | Team | Why involved | Repos | Confidence |
|-----|------|---------------|-------|------------|
| ... | ... | ... | ... | ... |

## Next step

Loop in the teams above **before or while** writing your PRD — that's the gap this
mode exists to close. When you're ready for estimates, architecture, and a formal
Eng + Product + Design sign-off, run `@scope for {feature-name}`. It will read
this file and re-confirm rather than re-ask the org/team questions above.
```

Update `.scope/{feature-name}/state.json`:

```json
{
  "discovery": {
    "completed": true,
    "completed_at": "ISO8601",
    "discovery_path": ".scope/{feature-name}/discovery.md"
  },
  "context": {
    "sitemap_source": "sitemap.yaml|catalog-info.yaml|interactive|none",
    "orgs_in_scope": ["..."],
    "impacted_teams": ["..."]
  }
}
```

**Do not** set `current_phase` past `"0"` and do not mark `phase_status.intake` as `completed` — Discovery Mode is a fork, not a phase. A later full `@scope for {feature-name}` run still starts at Phase 0, but Step 2 there checks for `discovery.completed` and re-confirms instead of re-asking (see `phases/00-intake.md`).

### Step 5 — Handoff

Announce:

```
"Discovery complete — {N} orgs / {M} teams identified, written to
.scope/{feature-name}/discovery.md. Share it with those teams now, before or
alongside writing your PRD.

When you're ready for the full technical blueprint (architecture, estimates,
Eng + Product + Design sign-off), run `@scope for {feature-name}` — the orgs
and SiteMap data above carry over, so Phase 0 will just re-confirm."
```

## Definition of Done

- [ ] No PRD requested as a hard gate — a plain-language description was sufficient
- [ ] No Engineering-presence question asked
- [ ] SiteMap resolved via the same A→B→C cascade as the full flow, including persist-on-confirm if Path B/C was used
- [ ] Orgs/teams confirmed with the user
- [ ] `discovery.md` written with the impacted-teams table and a pointer to the full flow
- [ ] Ownership explicitly marked as PM-captured / not Eng-validated
- [ ] State stores `discovery.completed` + confirmed orgs/teams so a later full `@scope` run re-confirms instead of re-asking
- [ ] `current_phase` left at `"0"` — Discovery Mode never advances the full phase flow
