---
name: pr-merge
description: >
  Merge a pull request (or GitLab MR) by URL or number — review it first, gate on
  hard stops, then (with per-step confirmation) approve, merge, sync local, and
  optionally apply small verified fixes / nice-to-haves (on the PR branch if it lives in the main repo, or as a follow-up PR if it's a fork). Provider-agnostic via gh, glab,
  a Bitbucket CLI, or an MCP server, and aware of optional repo review profiles.
  Use whenever the user asks to merge, land, ship, or
  "merge and fix" a PR, says "merge PR 525", "land this once it's good", "approve
  and merge this MR", "merge the PR you just reviewed", or "/pr-merge
  <url|number>". Merging is irreversible — honor the hard stops and the
  confirm-before-each-write rule in the body before acting.
---

# PR Merge

Merge a pull request **after** it passes review, then optionally apply requested
fixes / nice-to-haves. Merging commits to the base branch and is effectively
irreversible (especially anything baked into history), so this skill is
deliberately gated. It is the write/irreversible companion to **`@pr-review`**.

All PR mechanics run through whichever Git-host tooling the user already has
configured: the provider's CLI (`gh` for GitHub, `glab` for GitLab, a Bitbucket
CLI) or an MCP server that exposes PR operations. Check the tool's `--help` for
the exact `approve / merge / comment / create` commands and confirm it is
authenticated before starting — don't hardcode provider quirks in the base flow.
If no tool is available, stop and tell the user; do not improvise with raw API
calls unless they ask.

## Autonomy — confirm before every write

This skill performs **irreversible** actions. **Ask for explicit user
confirmation before EACH write** — approve, merge, push, and create-follow-up-PR
— **even on a clean PR**. Present exactly what you're about to do and wait for a
go-ahead. A standing "merge and fix" instruction authorizes the *task*, not each
individual irreversible step, and it **never** overrides a hard stop.

**Always stop and ask a human** (never autonomous) for: anything that hits a hard
stop, bypassing other required reviewers, declining a PR, retargeting a PR, and
merging a change whose verification you could not run. When in doubt, post the
review and ask — an unmerged good PR costs minutes; a merged secret or broken
build costs far more.

## Step 0 — Parse input & pick the review profile

Same as `@pr-review`: parse the PR URL/number into provider + coordinates (or
resolve a bare number from the local git remote), then **detect and announce** a
repo review profile (optional; profiles live in
`../pr-review/references/profiles/`, see its `README.md` for how to add one; check
git remote / URL host and repo-layout tells). If a profile matches, load it for
repo-specific merge mechanics. If none matches, rely on the base checklist and the
repo's own `AGENTS.md`/`CLAUDE.md`. Let the user correct a misdetection.

## Always review first

A merge decision is only as good as the review behind it. **Run `@pr-review`
first** (or rely on a clean review you produced this session) so the merge is
grounded in verified findings, not the PR description. If the review surfaces any
🔴 blocker, do not merge — see hard stops.

## Hard stops — never merge when

These are not merges to "do and fix later" — merging makes them worse:

1. **Committed secrets** in the diff (credentials, tokens, presigned URLs,
   passwords, API keys) — merging writes them to history permanently. Recommend
   Needs Work + scrub + **rotate the exposed credential** (a human/ops action).
2. **Failing tests / typecheck / build**, or unverified claims that the change
   actually works.
3. **Any unresolved 🔴 blocker** from the review.
4. **Hard-to-reverse or outward-facing surprises** the user hasn't authorized.

In all of these: stop, explain why merging is wrong, and ask. A standing "merge
and fix" instruction does **not** override a hard stop — say so plainly.
Surfacing the blocker is the correct outcome, not merging past it.

**Discharging hard-stop #2 — actually run the tests.** Reading a test is not
running it, and a prior reviewer's "LGTM once CI is green" is an unverified claim
(some repos post no build status to the PR at all — see the profile, if any). Before
merging any PR with tests or a migration, run them yourself against the **merge**,
not the stale branch (a branch behind the base gives false negatives — it's
missing the base's newer changes). The exact commands are repo-specific; see the
loaded profile and the base recipes in
`../pr-review/references/review-checklist.md` §1 and §11.

## Infra PRs: merge ≠ apply

For Terraform/CDK/CFN PRs the hard-stop calculus shifts. Merging env-root wiring
changes **no** infrastructure — `apply` per env does, and that's operator-run and
staged. So there are no tests/build to "fail," and an infra PR with correct code
but an apply-time hazard (e.g. a destructive change that first lands on prod) is
**still mergeable** — provided the review verified the code (no-op wirings match
module defaults, no leaked cross-env literals, scope is env-root only) and you
**record the operational caveat in the approve comment** (stage the apply
source-env → soak → prod-last; state any precondition). Don't hard-block sound
infra code over an apply-time concern — document it. The real hard stops still
apply: committed secrets, leaked account literals in the wrong env, or a no-op
claim that doesn't hold.

## Stacked PRs & target branch — check the target before anything else

`pr view` shows the target branch. **If it isn't the intended base (e.g.
`develop`/`main`), do not merge yet** — it's almost always a *stacked* PR (part 2
of a split targets part 1's feature branch so its diff shows only its own
changes). Once the parent merges, the child **must be retargeted to the base**
before merging; merging into a now-merged feature ref is wrong and can resurrect
stale history.

- This is a **merge-blocker until fixed**, but it's *metadata, not code* — the PR
  itself can be perfectly reviewable and Approvable.
- Honor the **merge order** in the split PR's description (parent first, then
  retarget + merge child). After the parent lands, the child usually needs a
  **rebase**, not just a retarget.
- **Retargeting is a deliberate metadata change → confirm with the human first.**
  The mechanics (rebase-onto-base + how to change the target) are provider- and
  repo-specific; see the loaded profile. On a fork you can't push, so it stays a
  human action — surface it (change the PR's target/base branch in your provider's UI) and stop.

## Merge flow

Each step below is a **write → confirm first**.

1. **Confirm clean review** (no blockers) **and target = base branch**. If you
   set Needs Work earlier and everything is resolved, proceed.
2. **Approve + summary comment** (clears a prior Needs Work). Write the summary to
   a file and pass it from the file so markdown/quotes survive:
   ```bash
   gh pr review <N> --approve --body-file /tmp/approve.md   # GitHub
   glab mr approve <N> && glab mr note <N> --message "$(cat /tmp/approve.md)"   # GitLab
   ```
   (For Bitbucket or MCP-based setups use the equivalent approve + comment calls.)
   You usually **cannot approve your own** PR (e.g. Bitbucket 409) — expected.
3. **Merge:**
   ```bash
   gh pr merge <N> --merge        # or --squash / --rebase per repo policy
   glab mr merge <N>
   ```
   - Blocked by "not all required reviewers approved"? That's a project-level
     reviewer condition. Bypassing other required reviewers is a **human
     decision** — surface it and ask; don't auto-bypass team gates.
4. **Sync local base branch** so the working tree reflects the merge — use
   `--ff-only`, not a plain `git pull` (local may carry unpushed WIP or have been
   reset; a plain pull would silently create a merge commit):
   ```bash
   git fetch <remote> <base>
   git log --oneline @{u}..HEAD    # any local-ahead commits? if so, stop and ask
   git checkout <base> && git pull --ff-only <remote> <base>
   ```
   If `--ff-only` refuses (local diverged), surface it rather than forcing a merge.
5. **Cross-PR sequencing.** If another open PR depends on or overlaps this one
   (same files, or one references files this one adds), note the rebase order in
   your summary.

## Applying fixes / nice-to-haves

When the user says "merge and fix any issues / apply nice-to-haves", be honest
about what's actually worth doing — **don't fabricate changes to a clean PR.** If
the review found nothing material, say so and just merge; gold-plating a
merge-ready, multi-reviewer PR resets approvals and re-runs CI for no gain. Only
apply a change that's real, in-scope, and verified — and **confirm before the
commit/push** (per the autonomy rule).

**Where the change lands depends on the branch:**

- **Same-repo branch** (`git ls-remote <remote> | grep refs/heads/<branch>` is
  non-empty): you can push to the PR branch *before* merging, so the fix is part
  of the same PR. Check it out, edit, verify, commit, push, then merge.
- **Fork branch** (`ls-remote` lacks it): you **cannot push to it**. Merge the PR
  as-is, then land the fix as a **small follow-up PR** against the main repo:
  ```bash
  git checkout <base> && git pull <remote> <base>
  git checkout -b fix/<short-slug>
  # …edit, verify…
  git commit … && git push -u <remote> fix/<short-slug>
  gh pr create --head fix/<short-slug> --base <base> --title "<title>"   # or: glab mr create
  ```
  (Don't pass reviewers unless you know the exact reviewer usernames/handles — a bad one can
  reject the create. You can't self-approve your own follow-up; merge rights still
  let you merge it.)

**Verify before you commit a fix** — the standard that gates a merge gates the fix
too. Exact commands are repo-specific (see the loaded profile); generically:
- Run the relevant test suite; run any required env/setup or regenerate-clients steps your project
  requires (a generated API client is often gitignored and must be regenerated
  before typechecking).
- A new behavior/fix deserves a **regression test in the same commit**.
- If the fix is a generated migration, generate it, apply it locally, and prove it
  applies on a clean DB before committing (repos often have a pre-commit hook that
  rejects unapplied migrations — that hook is correct; fix the cause).

**Commit conventions:**
- Conventional-commit subject: `fix(...)`, `perf(...)`, `feat(...)`.
- Branch off the base; never commit to the default branch directly when starting
  fresh.
- **Never `--no-verify`** — pre-commit hooks (typecheck, prettier, secret scan,
  and repo-specific guards) are load-bearing. If a hook fails, fix the cause.
- **Commit trailers follow the user's standing preference, not a default** — honor
  whatever the environment/memory records; don't append a trailer the user has
  turned off.
- Only commit/push/merge when the user has asked — the merge request *is* that
  authorization for this PR; a follow-up PR is part of fulfilling "apply
  nice-to-haves". Still confirm before each write.

## Trigger phrases

"merge PR <n>", "merge this MR", "land this once it's good", "approve and merge",
"merge and apply any nice-to-haves", "merge the PR you just reviewed",
"/pr-merge <url|number>".
