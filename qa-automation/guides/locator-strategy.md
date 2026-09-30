---
name: locator-strategy
description: Locator priority order, banned patterns, and the recovery loop when an element cannot be found. The core rule is that a locator is never written without a confirmed unique match against the live page.
---

# Locator Strategy

Brittle locators are the main reason UI suites get abandoned. Two rules cover most of it:

1. Prefer how a **user** identifies a control over how it is **implemented**.
2. Never write a locator that has not matched exactly one node on the live page.

## Priority order

Use the first option that produces a unique match. Playwright syntax shown; apply the equivalent in Cypress or another runner.

| # | Approach | Example |
|---|---|---|
| 1 | Role plus accessible name | `getByRole('button', { name: 'Place order' })` |
| 2 | Form label | `getByLabel('Email address')` |
| 3 | Placeholder | `getByPlaceholder('Search products')` |
| 4 | Existing test id | `getByTestId('checkout-submit')` |
| 5 | Unique visible text | `getByText('Order confirmed')` |
| 6 | Alt or title text | `getByAltText('Company logo')` |
| 7 | Short semantic CSS — **last resort** | `page.locator('form#checkout input[name="coupon"]')` |

Use option 4 when the application already uses test ids. Do not introduce a test-id convention unilaterally; propose it (see Escalation).

Anything at option 7 is recorded with `locator_risk: "fragile"` on the case and listed in the report.

## Banned patterns

Never write these, even when they work at the moment:

- generated or hashed class names — `.sc-a1b2c3`, `.css-1x2y3z`, `.MuiBox-root-142`
- positional selectors — `nth-child(7)`, `div:nth-of-type(3)`, `(//button)[4]`
- deep structural paths — `div > div > div > span`
- absolute XPath — `/html/body/div[2]/div[3]/...`
- text matched on copy that changes per environment, locale, or A/B variant
- fixed sleeps used to make a locator resolve — `waitForTimeout(5000)`

Each of these breaks on the next unrelated layout change, and the failure looks like a product bug.

## Scoping

Prefer scoping over lengthening a selector:

- narrow to a region first — `getByRole('dialog').getByRole('button', { name: 'Save' })`
- filter a repeated row — `getByRole('row').filter({ hasText: 'INV-1042' })`
- inside an iframe — `frameLocator('#payment-frame').getByLabel('Card number')`

## Recovery loop when an element is not found

Run these in order. Stop as soon as there is a unique match.

1. **Wait properly.** Assert the expected state (`expect(locator).toBeVisible()`), or wait for the loading indicator to disappear. Do not add a fixed sleep.
2. **Check the container.** Is the control inside a dialog, drawer, expanded panel, or iframe that is not open yet? Perform the step that opens it, then re-snapshot.
3. **Check the viewport.** Virtualized lists and lazy sections only render visible rows. Scroll the container, or filter the list instead of hunting a row.
4. **Re-snapshot** and look for the control by its visible label.
5. **Too many matches?** Scope it (see Scoping). Do not switch to an index.
6. **Still nothing?** Stop. Escalate — do not fall back to a structural selector.

## Escalation

| Cause | Action | Never do |
|---|---|---|
| Icon-only control with no accessible name | Ask for `aria-label` or `data-testid` on that control. Name it precisely. | Bind to an SVG path or icon class |
| Class names are generated | Ask for a `data-testid` | Use the hashed class |
| Third-party widget or canvas | Test the outcome through the API, or mark the case blocked with the reason | Fake interaction through coordinates |
| Copy differs per environment | Use role plus test id, or parameterize the expected text | Hardcode one environment's wording |
| Behind sign-in | Follow `guides/browser-mcp.md` Step 3 | Automate the login form |
| Screen not reachable in this environment | Mark blocked — environment or data | Skip the case silently |

When proposing test ids, propose the **minimum set** for the blocked controls, show the exact attribute for each, and wait for approval. Adding attributes across an application is a developer decision, not a side effect of writing tests.

An honest `blocked` with the specific fix required is more useful to the team than a passing test bound to a fragile selector.
