# Phase 1 — Plan

Goal: a reviewed list of test cases, each traceable to an acceptance criterion. No test code is written in this phase.

## Step 1: Collect acceptance criteria

Read every source recorded in `context.ac_sources`. If the list is empty, ask the user to paste the criteria or describe the flows to cover.

Never invent acceptance criteria. When a flow is unclear, add it to Open Questions instead of guessing.

## Step 2: Identify what is already covered

List tests that already exist for this feature:

- MonkeyMode in-repo tests (Phase 4 unit tests, Phase 6 integration tests)
- existing specs under `context.test_root`

Record these as **already covered** in `plan.md`. Do not plan a duplicate case for them. Duplicating an in-process integration test as a browser test adds maintenance cost without adding signal.

## Step 3: Derive cases

Produce one case per acceptance criterion that is observable from outside the application.

| Source signal | Case type |
|---|---|
| `human-ui` / `human-verify` item in `2b-acceptance.md` | `ui` |
| Given/When/Then on a screen flow | `ui` |
| Endpoint contract in `1b-contracts.md` | `api` |
| Authorization matrix row | `api` or `ui`, suite `security` |
| Error or edge case in acceptance criteria | same surface, suite `regression` |

Assign each case:

- `id` — `QA-001` upward
- `title` — plain language, what a user does
- `ac_ref` — the exact criterion or checklist id it satisfies
- `type` — `ui` or `api`
- `suite` — `smoke`, `regression`, or `security`

Respect `context.scope`: for `smoke`, plan only the critical path.

Describe the target control **in words** ("the primary Submit button on the checkout page"). Do **not** write selectors in this phase — locators are confirmed against the live page in Phase 2.

## Step 4: Flag testability risks

For each case, note anything likely to block automation:

- controls with no visible text and no accessible name (icon-only buttons)
- content inside an iframe, canvas, or third-party widget
- flows that require data the environment cannot produce
- steps that need email, SMS, or an external system

List these under Testability Risks with the fix needed (usually an `aria-label` or `data-testid`). Raising these now is cheaper than discovering them mid-authoring.

## Step 5: Write and review the plan

Write `.qa-automation/{feature}/plan.md` using `templates/plan.md`. Write the case list to `state.cases` with `status: "planned"`.

Present it and ask:

```
"Here is the test plan for {feature}: {N} cases ({N} smoke, {N} regression,
{N} security) — {N} UI, {N} API.

{M} cases have testability risks that need a label or test id.

Any flows or edge cases missing? Anything to remove before I write the tests?"
```

Incorporate feedback and re-present until the user approves.

## Step 6: Advance

Only after explicit approval: set `phase_status.plan` to `approved`, `current_phase` to `"2"`, then go to Phase 2.

## Quality checklist

- [ ] Every case has an `ac_ref` pointing at a real criterion
- [ ] No case duplicates an existing MonkeyMode or in-repo test
- [ ] Cases respect `context.scope` and `context.surface`
- [ ] Testability risks listed with the fix each one needs
- [ ] No selectors present anywhere in `plan.md`
- [ ] User approved the plan explicitly
