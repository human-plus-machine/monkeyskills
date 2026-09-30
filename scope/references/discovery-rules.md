# Discovery Rules — @scope

Use these rules in Phase 0 (intake), Phase 3 (dependencies), and Discovery Mode
(`phases/00b-discovery-mode.md`). They exist to prevent the workshop failure mode:
scoping everything into the org whose repos happen to have the richest AI-assistant
documentation.

## 1. Ownership resolution order

Resolve "who owns X?" in this order — stop at the first confident hit:

1. `sitemap.yaml` → `capabilities[X].owner_team` / `org`
2. `sitemap.yaml` → `teams[].repos[].provides` contains X
3. `sitemap.yaml` → `aliases` / `repos[].aliases` (terminology independence)
4. `catalog-info.yaml` `spec.owner` (Path B)
5. User / Eng confirmation (interactive)
6. `UNKNOWN — confirm with PM/Eng` + Phase 4 question

Never jump to "the repo that looks most documented."

## 2. Anti-bias (AI documentation)

The following **must not** increase a repo's inclusion or ownership score:

- Presence or size of `.cursor/`, `.cursor/rules/`, `AGENTS.md`
- Density of README / architecture markdown
- Number of AI skill files or eval fixtures
- Local checkout alone (monorepo open in the IDE)

Treat AI metadata as **neutral context for how to work in a repo you already selected**, never as evidence that the repo is in scope.

When ranking candidate repos for a capability, score only:

| Signal | Weight |
|--------|--------|
| SiteMap provides / capability match | high |
| Alias / terminology match | high |
| catalog-info owner | medium |
| PRD explicit system name | medium |
| AI-doc richness | **zero** |

## 3. Terminology independence

PRD language often differs from module names (e.g. PRD "bill split" vs billing-team vocabulary).

- Match against SiteMap `aliases` and `repos[].aliases` before concluding "no existing solution."
- Record **match basis** in §3.1 (`provides` | `alias` | `catalog` | `user`).
- If no alias hits, ask Eng — do not invent equivalence.
- Near-term: maintain aliases in SiteMap. Do not claim full semantic/embedding search in v1.

## 4. Multi-org planning

If `context.orgs_in_scope` has ≥2 orgs (e.g. Platform + Web + Billing):

- Emit **per-org scope slices** (§3.5)
- Tag candidate epics with owning org/team (§2)
- Highlight cross-org blockers early (§3.3)
- Never assign all epics to the locally checked-out org by default

## 5. Impacted teams for PMs

§3.4 is mandatory. PMs often do not know repo ownership — the table is the product of discovery, not a nicety. Prefer `Must join planning? = yes` when the team modifies a system or owns a blocker.

## 6. Registry hygiene

If SiteMap is missing or clearly stale (`registry_owner.last_reviewed` empty/old):

- Warn once in Phase 0
- If the user opts in, **write** `sitemap.yaml` immediately after orgs-in-scope are confirmed (see `phases/00-intake.md` → "Persist the SiteMap") — an offer that is never followed by an actual write recreates the exact ownership-drift problem this file exists to prevent
- Note in §5.1 that ownership assumptions may be invalidated by a registry refresh
