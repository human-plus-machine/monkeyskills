# Test plan template

Write to `.qa-automation/{feature}/plan.md`. Replace bracketed text. Remove sections that do not apply.

No selectors appear in this document — locators are confirmed against the live page in Phase 2.

---

# Test Plan: [feature-name]

**Environment:** [env URL]
**Runner:** [playwright / cypress / pytest] ([existing / scaffolded])
**Framework profile:** [project-native / generic]
**Environment / module:** [Environment] / [module] (omit when not applicable)
**Test location:** [repo and path]
**Scope:** [smoke / regression / both] · **Surface:** [ui / api / both]
**Auth:** [none / attached-browser / storage-state]
**Execution login:** [.env vars listed by name only, e.g. ACME_USERNAME / ACME_PASSWORD]
**Reporter:** [standard Playwright HTML / allure]
**Criteria sources:** [files or issue keys read, or "user-supplied"]

## Already covered — not re-tested here

| Existing test | Covers | Why not duplicated |
|---|---|---|
| [`path/to/test`] | [behaviour] | [e.g. MonkeyMode Phase 6 integration test] |

If nothing exists: `No existing automated coverage found for this feature.`

## Cases

| ID | Title | Type | Suite | Acceptance criterion |
|---|---|---|---|---|
| QA-001 | [what the user does] | ui | smoke | [AC-001 / story / issue ref] |

## Case detail

### QA-001 — [title]

**Acceptance criterion:** [exact criterion this satisfies]
**Suite:** [smoke / regression / security] · **Type:** [ui / api]

**Steps**
1. [User-level action — "open the cart page", "submit the coupon form". Name the target control in words, not as a selector.]
2. [Next action]

**Expected result**
[Observable outcome — visible confirmation, status code, list contents]

**Test data**
[What this case needs, who creates it, and how it is cleaned up]

## Testability risks

| Case | Risk | Fix needed |
|---|---|---|
| QA-00N | [e.g. icon-only delete button has no accessible name] | [e.g. add `aria-label="Delete item"`] |

If none: `No testability risks identified.`

## Out of scope

- [Flow explicitly excluded, and why]

## Open questions

- [Anything blocking a case, with the default if unanswered]
