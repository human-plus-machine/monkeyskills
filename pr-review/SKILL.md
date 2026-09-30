---
name: pr-review
description: >
  Review a pull request by URL or number for architecture alignment, security,
  and repo-convention compliance - then draft a structured review, present it to
  the user, and (on approval) post it and set Approve / Needs Work using whatever
  Git-host tooling is available (gh, glab, Bitbucket CLI, or an MCP server).
  Provider-agnostic: works with GitHub, GitLab, and Bitbucket PRs/MRs. Use
  this whenever the user asks to review, assess, or "check architecture on" a PR
  or MR, pastes a PR/MR URL, or says things like "review PR 525", "is this
  aligned with architecture", "review this MR", "look at this pull request", or
  "/pr-review <url|number>". It auto-detects an optional repo review profile and
  layers that profile's deep checklist on top of the base review. This skill
  reads, comments, and sets review status - it never merges.
---

# PR Review

Review a pull request (or GitLab MR) for **architecture alignment, security, and
repo-convention compliance**, then draft a structured review, get user sign-off,
post it, and set the right status - using the Git-host CLI or MCP server the
user already has configured (`gh`, `glab`, a Bitbucket CLI, or an MCP connector).

The goal is a review a senior engineer would trust: every claim verified against
the *real* code (not the PR description), security findings calibrated honestly,
and a clear actionable verdict. **This skill only reads, comments, and sets
review status - it never merges.** (Use `@pr-merge` for that.)

## How this skill is layered

- **Base review (always):** the methodology + generic security/quality checklist
  in **`references/review-checklist.md`**, plus whatever rules the *target repo's
  own* agent docs declare (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`).
- **Repo review profile (optional):** a repo-specific deep checklist layered on
  top. Profiles live in `references/profiles/`; see
  `references/profiles/README.md` for how to add one. None ship by default.
  Detection is explicit and **announced** so a misdetection can be corrected by
  the user.

---

## Workflow

### Step 0 - Parse input & pick the review profile

1. **Parse the PR reference.** Accept a full URL or a bare number.
   - From a URL, extract provider + coordinates. Examples:
     - `https://github.com/<owner>/<repo>/pull/42` -> GitHub, `<owner>/<repo>`, PR `42`.
     - `https://gitlab.com/<group>/<repo>/-/merge_requests/7` -> GitLab, MR `7`.
     - `https://<host>/projects/<PROJ>/repos/<repo>/pull-requests/525` -> Bitbucket, project `<PROJ>`, repo `<repo>`, PR `525`.
   - If given a **bare number**, resolve provider + repo from the current
     working directory's git remote (`git remote -v`). If it's ambiguous, ask.

2. **Detect the review profile (announce it).** If `references/profiles/`
   contains profiles (other than the README), check each profile's "Detection"
   section against:
   - the **git remote** / PR URL host and path, and
   - **repo layout tells** (when a local checkout is available).

   Then state the decision plainly and let the user correct it:
   - *"Detected the **<name>** profile - I'll apply the base review plus
     `references/profiles/<name>.md`."* or
   - *"No specific profile matched - I'll apply the **base** review and read this
     repo's own `AGENTS.md`/`CLAUDE.md`/`.cursor/rules/`."*

3. **Load the layers.** Always read `references/review-checklist.md`. If a
   profile matched, also read that profile file. If a local checkout is
   available, read the target repo's `AGENTS.md`/`CLAUDE.md`/`.cursor/rules/`.

### Step 1 - Tooling preflight

Work out which tool will fetch the PR, post the comment, and set the status.
Prefer, in order: the provider's official CLI (`gh` for GitHub, `glab` for
GitLab, a Bitbucket CLI), then an MCP server exposing PR operations. Confirm it
is installed and authenticated (e.g. `gh auth status`, `glab auth status`).
Do **not** hardcode provider quirks here - check the tool's `--help` for the
exact `view / diff / comment / review / approve` commands and flags. If no tool
is available, fall back to a local `git fetch` of the PR ref for reading and
give the user the drafted review to post manually.

### Step 2 - Gather context (before reading the diff)

Using the provider's tooling:

- **PR metadata** - title, source/target branches, reviewers, state, approvals.
- **PR activity** - how many times it was rescoped and who commented.

These PRs are often **rescoped many times** and you may be a **returning
reviewer**. Pull your own prior comments in full and build a
**scorecard** of your earlier findings, so you re-review against the *current*
state - credit what's fixed, restate what's not.

Then fetch the **diff on its own** (never in the same parallel batch as JSON
calls - raw diff text corrupts JSON parsing), e.g.:

```bash
gh pr diff <N> > /tmp/pr<N>.diff        # or: glab mr diff <N> > /tmp/pr<N>.diff
wc -l /tmp/pr<N>.diff
grep -E "^diff --git" /tmp/pr<N>.diff        # file list
grep -nE "deleted file mode|new file mode|old mode|new mode" /tmp/pr<N>.diff  # deletions / mode flips
```

### Step 3 — Verify against the real repo (don't trust the diff base)

The core discipline of a trustworthy review. Full recipes are in
`references/review-checklist.md` §"Verify-don't-trust"; the essentials:

- **The branch is often behind the base.** For anything load-bearing, confirm
  against the true merge. Fetch the PR source into a **named ref**, never bare
  `FETCH_HEAD` (the next fetch clobbers it and you'll silently read the wrong
  tree): `git fetch <remote> <branch>:pr<N> --force`, then `git show pr<N>:path`.
- **Verify every anchor.** A fix that changes a route/util/prop/claim/type is
  only correct if the target exists — grep the working tree for the real symbol.
- **Don't trust the PR description** — it states intent; confirm the code does it.
- **Run the tests / migration checks** for feature or migration PRs — reading a
  test is not running it. Prefer testing the *merge*, not the stale branch.

If a repo profile is loaded, apply its type-of-change recipes here (migrations,
Terraform, shell/CI, tenant scoping, type-sync, and so on).

### Step 4 — Walk the checklist(s)

Walk **`references/review-checklist.md`** top-to-bottom, spending effort
proportional to the diff. If a profile is loaded, walk it too — it encodes the
repo-specific rules that are easy to miss and where most real findings come from.
Also check the PR against the **target repo's own agent docs** rules.

**If MonkeyMode artifacts exist for this work** (`.monkeymode/{feature}/` in the checkout —
acceptance checklist, code specs, user stories), verify the PR actually delivers
the stated **acceptance criteria**, not just generic quality.

### Step 5 — Form the verdict

Use the severity taxonomy and **lead with calibration** so the reader trusts the
rest (e.g. *"I found no unauthenticated/unprivileged escalation; the blockers
below are …"*). Cite `file:line`. **Credit what's solid** — reviews that only
list problems read as adversarial.

- 🔴 **Blocker** — must fix before merge. Build break, data leak across tenants, auth bypass,
  **committed secrets**, contract/type-sync violation, irreversible-on-merge hazards.
- 🟠 **Should fix** — real security/correctness gaps that aren't a clean
  escalation (privileged-insider exfil, fail-open defaults, missing backstops).
- 🟡 **Minor / nice-to-have** — cleanups, cosmetics, dead code, scope notes.
- ✅ **Solid** — what's correctly done; reinforce it.

Keep scope honest: flag when a PR mixes backend + infra + feature + docs into one
unreviewable/unrevertable unit, but weigh that against cohesion before calling it
a blocker.

### Step 6 — Present, then post (ask first)

1. **Present the drafted review to the user** and ask before posting. Posting the
   comment and setting Approve/Needs-Work is only done after the user approves.
2. Write the comment to a file and pass it from the file so
   markdown/quotes survive:

```bash
gh pr comment <N> --body-file /tmp/review.md      # or: glab mr note <N> --message "$(cat /tmp/review.md)"
```

3. Then set exactly one status (using the provider's CLI or MCP tool, e.g. `gh pr review --approve` / `--request-changes`):

| Outcome | When |
|---|---|
| **Approve** | No blockers; ready to merge. |
| **Needs Work** | Real blockers, but the right direction. Pair with the comment listing actionable items. PR stays open. |
| **Decline** | Fundamentally wrong. **Closes the PR** — rare; prefer Needs Work. **Never autonomous — always ask a human.** |

Rules that matter:
- **Redact secrets in the comment.** If the finding *is* a leaked credential,
  quote enough to locate it (file, count) but **mask the value** — the comment is
  itself a published artifact.
- You usually **cannot approve your own** PR (e.g. Bitbucket 409) — that's
  expected, not an error.
- If you previously set Needs Work and everything is now resolved, switching to
  Approve with a short "prior blockers resolved" summary is the right closeout.

---

## Autonomy boundary

Reviewing and drafting are always safe. **Posting the review + setting
Approve/Needs Work requires user approval** (present the verdict first). **Stop
and ask a human** for: declining a PR, anything that would **merge**, and any
case where you'd post a public comment containing a secret value. When a blocker
is a committed secret, recommend Needs Work and flag that the credential needs
rotation regardless of the PR — surfacing it is the win, never silently merging
past it.

## Trigger phrases

"review PR <n>", "review this MR", "review this pull request", a pasted PR/MR
URL, "is this aligned with architecture", "check architecture on this PR",
"/pr-review <url|number>".
