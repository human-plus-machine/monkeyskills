# PR review checklist — base (repo-agnostic)

This is the practical, provider-agnostic walk-through: what to check, why it
matters, and the verify-don't-trust recipes that surface real findings. It
applies to **every** PR. When a repo review profile is loaded (see
`profiles/README.md`), walk that **on top of** this file — the profile encodes
repo-specific rules and usually where most findings come from.

**The target repo's own rules win.** Read the repo's `AGENTS.md`, `CLAUDE.md`,
`.windsurfrules`, and `.cursor/rules/` and treat them as authoritative over these generic notes.

Work top-to-bottom, but spend effort **proportional to the diff**. A one-line URL
fix needs the route/util anchors checked; a backend route change needs the full
auth/data-isolation pass; an infra PR needs the security + apply-time section.

## Table of contents
1. Verify-don't-trust (the core discipline)
2. Returning-reviewer / rescope handling
3. Secrets & credentials (hard blocker)
4. AuthN / AuthZ / access control
5. Data isolation & multi-tenancy
6. API/type contracts & generated code
7. Input validation & injection
8. Concurrency, streaming & resource lifecycle
9. Pagination & query determinism
10. Scope discipline & rollback safety
11. Tests
12. Type-of-change routing (migrations, infra, shell/CI, frontend)

---

## 1. Verify-don't-trust (the core discipline)

A review is only as good as what you confirmed against the *real* code.

- **Don't trust the PR description** — it lists intent; confirm the code does it.
- **Don't trust the raw diff base** — the branch is often behind the target
  branch, so the diff can be stale. For anything load-bearing, confirm against
  the true merge: `git fetch <remote> <base>` then
  `git diff <remote>/<base>...<branch> --stat`.
- **Fetch the PR source into a *named* ref, never bare `FETCH_HEAD`.** Use
  `git fetch <remote> <branch>:pr<N> --force`, then read with `git show pr<N>:path`.
  A bare `git fetch <remote> <branch>` writes only `FETCH_HEAD`, and the *next*
  fetch silently clobbers it — reading `FETCH_HEAD` afterward gives you the wrong
  tree and a confidently-wrong conclusion. A named ref can't be clobbered.
- **Verify every anchor.** A fix that changes a route/util/prop/type/permission
  is only correct if the target exists. Grep the working tree for the real route
  name, the exported helper, the component prop, the permission string — at the
  **call site**, not just the definition.
- **Is a helper actually invoked, not just defined?** Grep the call site.
- **Run the tests — don't trust "CI will catch it."** For any feature/code PR
  with tests or a migration, actually run them against the **merge**, not the
  stale branch (a branch behind the base gives false negatives — it's missing the
  base's newer changes). Reading a test file is not running it.

## 2. Returning-reviewer / rescope handling

- PRs get **rescoped repeatedly**. If you reviewed this PR before, pull your own
  prior comments in full and build a **scorecard**: check each earlier finding
  against the current diff — credit what's fixed, restate what's not.
- **Re-review the *current* HEAD after a post-approval rescope.** Another
  reviewer's approval may be on an older commit; verify *your* findings against
  the latest state.
- When a response claims "N tests added," confirm they're **substantive** —
  grep for a named `test_`/`it(`/`test(` per finding, not a hollow suite — and
  that they pass.

## 3. Secrets & credentials — hard blocker

**Committed credentials are a merge blocker, full stop** — merging bakes them
into history. Scan **added** lines (especially fixtures / seed data / `.env*` /
test recordings / pasted outputs):

```bash
grep -nE "^\+.*(AKIA|ASIA)[A-Z0-9]{16}|x-amz-security-token|AWSAccessKeyId=|-----BEGIN [A-Z ]*PRIVATE KEY-----|password.{0,3}=|api[_-]?key.{0,3}=|secret.{0,3}=|bearer [A-Za-z0-9._-]{20,}" /tmp/pr<N>.diff | head
```

**Calibrate — public identifiers are NOT secrets.** False-positiving these makes
the review noisy and erodes trust. Non-sensitive by design: OIDC/Okta **issuer
URLs** and **authorization-server ids**, **client_ids**, CDN/CloudFront domains,
S3 bucket names, AWS **account ids** (incl. inside ARNs), and service
**usernames** — they appear in tokens, discovery docs, and ARNs by design. The
blockers are the *secret half*: `client_secret`, passwords, presigned-URL query
params (`AWSAccessKeyId` / `x-amz-security-token`), bearer tokens, private keys,
and app/API keys.

If the finding *is* a secret: quote the **location + count** in the review but
**mask the value** — the review comment is itself a published artifact. Flag that
the credential must be **rotated** regardless of the PR (pushing to a shared
branch already exposed it).

## 4. AuthN / AuthZ / access control

- Every state-changing or data-returning route should gate on the repo's
  established permission/claim/role mechanism. Identify which one this repo uses
  (from its `AGENTS.md`/rules) and confirm the change picks the **right tier**
  (admin vs consumer).
- **A new permission string often needs seeding/config in more than one place.**
  Repos commonly require the permission to be defined, granted to roles, and a
  seeder re-run — miss one and users get 403. Check the repo's docs for the exact
  set (a profile will enumerate it precisely).
- **Clear-detection / partial-update bypass:** if only a *non-empty* value
  requires the privileged check, a non-privileged user can send `{"field": ""}`
  to wipe a privileged-set value. Gate the check whenever the key is *present*
  and its applied value *differs* from stored.
- **New security gate → negative tests** (403 paths, the clear-bypass).

## 5. Data isolation & multi-tenancy

- Any query behind a tenant/user-facing route must be scoped to that tenant/user.
  A query with **no scoping** behind a consumer route is a cross-tenant leak.
- **Deny-by-default:** when the tenant/principal can't be resolved, non-admins
  must fall to an empty result, not "return everything." Admin cross-tenant reads
  should be audit-logged where the repo supports it.
- When a change swaps one scoping mechanism for another, confirm it doesn't
  **widen** visibility beyond what the principal already sees elsewhere.

## 6. API/type contracts & generated code

- If types are **generated** from a source of truth (OpenAPI, protobuf, GraphQL
  schema, Pydantic→client), a schema change must regenerate the client — a
  file-mode flip or manifest bump with no content regen is the tell someone
  forgot to run the generator.
- **Hand-rolled types for API data are a violation** when a generated type
  exists — the frontend should alias the generated type, not redeclare it.
- **A local typecheck erroring on a "missing" generated member usually means the
  local generated client is stale**, not that the base is broken — regenerate
  first, then re-typecheck, before raising a "build break" alarm.
- Breaking a published contract (removing/renaming a field, tightening a type) is
  a 🔴 unless all consumers are updated in the same change or a deprecation path
  exists.

## 7. Input validation & injection

- Untrusted input must be validated at the trust boundary and never interpolated
  into a shell command, SQL string, `eval`, or a cloud API call. Prefer
  parameterized queries and allow-lists over string building.
- Operator/user input that selects behavior should **gate which trusted names
  act**, not be interpolated into the command itself.
- Watch for unanchored `grep "$x"` / regex built from input (metachar footgun —
  prefer fixed-string matching) and `rm -rf "$VAR/…"` where `$VAR` can be empty.

## 8. Concurrency, streaming & resource lifecycle

- Long-lived responses (streaming/SSE, websockets, background jobs) must release
  pooled resources (DB connections, file handles) they'd otherwise pin for the
  whole response — check the repo's required pattern (a profile will name it).
- **In-memory mutable state** (caches, counters, locks) that assumes a single
  process breaks or diverges across instances — flag it.
- **Error swallowing** — empty `catch`/bare `except: pass` that discards the
  error signal hides production bugs. Demand log + re-raise or a typed error.

## 9. Pagination & query determinism

Paginated endpoints need a deterministic order (explicit `ORDER BY` / model
ordering) or rows shift/duplicate across pages; confirm a covering index for the
hot query. Often already present — confirm rather than assume a bug.

## 10. Scope discipline & rollback safety

- Every changed line should trace to the PR's stated purpose. Flag adjacent
  "improvements," speculative abstractions, and unrelated refactors.
- Flag **dangling references**: a script/doc that calls files not in the diff.
- For very large PRs mixing infra + service + backend + frontend + docs: call out
  that it's not atomically reviewable/revertable and suggest split seams — **but**
  weigh against cohesion ("the backend change is what makes the test green" is a
  legit reason to co-locate). Scope is a 🟡/🔴 judgment, not automatic.
- **Stacked PRs** — when part 2 targets part 1's branch (not the base), that's
  fine for review, but flag it **must be retargeted to the base before merge**
  once part 1 lands, and verify part 2 against the merged contract.

## 11. Tests

- Bug fix → there should be a **regression test**. New security gate → **negative**
  tests. A new standalone service with zero tests around its core is a 🟡.
- **Reading the tests is not running them.** For a feature/security PR, run the
  suite against the merge — a green claim and a passing-looking test file are
  weaker than an actual run.

## 12. Type-of-change routing

Spend effort by change type. When a profile is loaded it supplies exact commands;
these are the generic prompts:

- **Migrations / schema:** does the migration exactly match the model, with no
  unrelated drift? Does it apply cleanly on a fresh DB? No number collision with
  the base branch? Check *all* apps/modules if the root cause could be systemic.
- **Infra (Terraform/CDK/CFN):** merge ≠ apply — the risk is in what the apply
  does. "No-op wiring" is a claim to verify (env default must equal the module
  default). Watch for destructive changes on prod, cross-env leaked literals
  (account ids, IPs, ARNs copied from another env), and broad IAM wildcards.
  Record apply-time preconditions in the approve comment rather than hard-blocking
  sound code over an apply-time concern.
- **Shell / CI scripts:** lint the **post-PR file**, not the diff (`bash -n`,
  `shellcheck`). Watch the `set -e` dead-code trap (a bare failing command aborts
  before its own error handler), best-effort side-channels that must be `|| true`,
  and secrets that belong in env/secret stores.
- **Frontend:** verify a redirect/route names a **real** route (grep the router).
  Reuse established shared contracts rather than reinventing. Regenerate the API
  client before typechecking (see §6).
