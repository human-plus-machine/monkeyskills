# Verification Method

**Resolved:** {ISO8601 date} via {repo-memory | discovered | user-specified | default-generated-tests}

## Command(s)

{the exact command(s) to run — e.g. `uv run pytest`, `npm test`, `make verify`. If the method
is "generate minimal tests" with no fixed command (a new project, no test infra yet), say so
explicitly rather than leaving this blank.}

## Lint / Typecheck (if separate from the above)

{command(s), or "covered by the test command above" / "none configured"}

## Notes

{caveats a future run needs — e.g. "requires a local Postgres on 5432", "run from repo root,
not from packages/api", "flaky test X is a known issue, not a regression"}

## Fallback (used when no test exists yet for the changed behavior)

{default: "Generate a minimal set of tests for the changed behavior, run them, then
iteratively refine the implementation or the tests until they pass and the acceptance
criteria in plan.md are demonstrably met." — replace with a repo-specific fallback if one
was given, e.g. "manual QA checklist in docs/testing.md"}
