# Run report template

Write to `.qa-automation/{feature}/run-report.md`. Replace bracketed text.

Report `blocked` cases as blocked. A suite with blocked cases is not a passing suite.

---

# Run Report: [feature-name]

**Run at:** [ISO timestamp]
**Environment:** [env URL]
**Runner:** [runner] · **Command:** [exact command executed]
**Framework profile:** [project-native / generic]
**Environment / module:** [Environment] / [module] (omit when not applicable)
**Scope:** [smoke / regression / both]
**Reporter:** [standard Playwright HTML / allure] · **HTML report:** [playwright-report/ or allure-report/]

## Summary

| Result | Count |
|---|---|
| Passed | [N] |
| Failed — suspected defect | [N] |
| Blocked — could not be tested | [N] |
| Flaky — passed on retry | [N] |
| **Total** | [N] |

## Failed — suspected application defects

### QA-00N — [title]

**Acceptance criterion:** [ref]
**Expected:** [what should happen]
**Actual:** [what happened]
**Evidence:** [screenshot / trace path]
**Assessment:** [why this is an application defect and not a test problem]

If none: `No application defects detected.`

## Blocked — not tested

| Case | Reason | What unblocks it |
|---|---|---|
| QA-00N | [environment / data / element not addressable] | [specific fix — e.g. add `data-testid="..."`, seed account with saved card] |

If none: `No blocked cases.`

## Flaky

| Case | Suspected cause |
|---|---|
| QA-00N | [timing / animation / shared data] |

Flaky cases are reported, not silenced. Quarantining is the team's decision.

If none: `No flaky cases.`

## Fragile locators

| Case | Locator approach | Recommended fix |
|---|---|---|
| QA-00N | [last-resort CSS] | [test id or accessible name to add] |

If none: `All locators use role, label, or test id.`

## Files

| Path | Cases |
|---|---|
| [`path/to/spec`] | [QA-001, QA-002] |

## Next steps

- [e.g. developers add three accessible names to unblock QA-004 and QA-007]
- [e.g. two defects to raise — run Phase 4 to draft them]
