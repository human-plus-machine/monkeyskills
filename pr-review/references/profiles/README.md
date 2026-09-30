# Repo review profiles

A **review profile** is an optional, repo-specific checklist that `@pr-review` (and
`@pr-merge`, when it re-verifies a PR) layers **on top of** the base checklist in
`../review-checklist.md`. Use one when a repository has conventions, invariants, or
risk areas that a generic review would miss (for example: a tenancy model, a
generated-types sync rule, a migration policy, or infrastructure-as-code review
rules).

No profiles ship by default. The skills fall back to the base review plus the target
repo's own `CLAUDE.md` / `AGENTS.md` / `.windsurfrules` / `.cursor/rules/`.

## Adding a profile

1. Copy the template below into `references/profiles/<profile-name>.md`
   (kebab-case, one file per repo or repo family).
2. Fill in **Detection** so the skill can recognise the repo, and keep it explicit:
   the skill announces which profile it picked so the user can correct it.
3. List only rules that are specific to this repo. Do not repeat the base checklist.
4. Keep every rule verifiable: name the file, command, or grep that proves it.
   A profile may also include a "Merge notes" section (how to run tests against the merge, retarget/rebase mechanics, CI quirks) that `@pr-merge` will read.

No other wiring is needed; the skills look in this directory for `*.md` files other
than this README.

## Template

```markdown
# Profile: <name>

## Detection
- Git remote / URL pattern: <e.g. host/path fragment>
- Layout tells: <files or directories that only exist in this repo>

## Repo rules to enforce
- <rule> - how to verify: <grep/command/file to check>

## Type-of-change recipes
- Migrations: <what to check>
- Infrastructure / CI: <what to check>
- API contract changes: <what to check>

## Severity overrides
- <anything that is a blocker in this repo but only "should fix" generically>
```
