---
name: intake
description: Phase 0 - Intake. A single focused conversation that captures the working mode (greenfield/clone/hybrid), feature idea, target user, key action, and core data — then asks how to style the prototypes (brand tokens, quick brand questions, or neutral defaults), then proposes 3-5 design variants and lets the PM pick which to prototype. Produces intake.md and populates the variants[] array in state.json before handing off to Phase 0b (if a URL was provided) or directly to Phase 1.
---

# Phase 0: Intake

## Purpose

Capture just enough context to propose informed design directions, then let the PM choose which ones to prototype. This phase intentionally stays light — no deep problem analysis, no constraints exploration, no prior art. The goal is to go from "I have a feature idea" (or "I have a URL") to "I have chosen design directions to visualize" in a single, fast conversation.

## Entry Point

Phase 0 begins with a welcome message:

```
"Welcome to Prototype. I'll help you turn your feature idea into multiple side-by-side
HTML prototypes you can open in any browser.

Let's start with a quick intake. First question:

Are you starting from scratch, or do you want to base this on an existing page?

  1. Greenfield  — I'll describe a new feature; you propose variants from scratch
  2. Clone a page — I have a URL of an existing page; capture it as the starting point
  3. Hybrid      — capture a page AND let me describe changes / extensions on top"
```

If the PM provided a URL directly in their `@prototype` invocation (e.g. `@prototype for something like https://x.com/y`), default the answer to mode **2 (clone)** and skip this question — store `intake.mode: "clone"` and `intake.source_url: "{detected url}"`, then confirm with:

```
"I detected the URL {url} — using clone mode. (Say 'hybrid' if you want to layer
your own ideas on top, or 'greenfield' to ignore the URL and start from scratch.)"
```

Store the chosen mode as `intake.mode` (`"greenfield" | "clone" | "hybrid"`).

---

## Interview Sequence

Ask **one question at a time**. Wait for the answer before asking the next. Do not batch questions.

### Question 0: Source URL (clone or hybrid mode only)

If `intake.mode` is `"clone"` or `"hybrid"` AND `intake.source_url` is not already set:

```
"What's the URL? (production page or any publicly reachable URL — for internal
pages, I'll walk you through attaching to your own Chrome session)"
```

Store as `intake.source_url`. Validate that it parses as a URL; if not, ask again.

**Chrome DevTools MCP availability check (clone/hybrid only):**

Before continuing the interview, silently probe whether the `chrome-devtools` MCP is registered (see SKILL.md → *Chrome DevTools MCP Availability Check*). If not available, present the setup offer described there. The PM can:

1. Set it up now — wait for confirmation, re-probe, then continue
2. Skip the URL capture — fall back to greenfield mode (set `intake.mode: "greenfield"`, clear `intake.source_url`, and continue with the greenfield interview)

If the MCP is available, set `context.chrome_mcp_enabled: true` and continue.

If `intake.mode` is `"greenfield"`, skip this question entirely.

---

### Question 1: Feature Idea

```
"What feature or flow do you want to prototype? (One or two sentences is perfect.)"
```

For `clone` mode, rephrase to anchor on the source page:

```
"What's the feature or flow on this page that you want to prototype?
(If it's the whole page, just say 'the whole page'.)"
```

For `hybrid` mode, rephrase to focus on the extension:

```
"What do you want to do on top of the captured page? Add a new flow?
Restructure it? Change the visual style? (One or two sentences.)"
```

Capture the user's description in their own words. Store as `intake.idea`.

---

### Question 2: Who Uses It

```
"Who is this for? Describe the person or role who will use this feature.
(e.g. 'Campaign Managers reviewing spend', 'Finance Analysts approving invoices', 'End customers browsing offers')"
```

Store as `intake.who`.

---

### Question 3: Key Action

For `greenfield` mode:

```
"What's the single most important thing the user does on this screen?
(e.g. 'approve or reject a request', 'search and filter a list', 'fill out and submit a form', 'monitor live metrics')"
```

For `clone` mode:

```
"What's the single most important action on this page that the prototype should preserve or improve?
(e.g. 'the approve button on each row', 'the search bar at the top', 'the form submit at the bottom' —
or 'all of it, just modernize the styling')"
```

For `hybrid` mode:

```
"For the change you described, what's the primary new action the user will take?
(e.g. 'bulk-approve from the list', 'open a side panel summary', 'switch between two views')"
```

Store as `intake.key_action`.

---

### Question 4: Core Data

For `greenfield` mode:

```
"What information does this screen display?
(e.g. 'a list of pending approvals', 'a form with 6 fields', 'a chart with two metrics and a table below', 'a step-by-step wizard')"
```

For `clone` mode — this question is optional and only asked if the PM wants to change what's shown:

```
"Do you want to change what information is shown on the page, or keep it as-is?
(Say 'as-is' to preserve the source page's data structure, or describe what should
be added / removed / reorganized.)"
```

For `hybrid` mode:

```
"What new information (if any) does your change introduce, or what existing data should be reorganized?
(e.g. 'add a summary card at the top', 'show selected items in a side panel', 'collapse the third column')"
```

Store as `intake.core_data`. For `clone` mode with an "as-is" answer, store `"as-is (matches source page)"`.

---

### Question 5: Styling / Design Tokens

Skip this question for `clone` mode — tokens come from the captured page in Phase 1 (Path 3).

For `greenfield` and `hybrid` modes:

```
"How should I style these prototypes?

1. I have brand tokens — I'll paste them (a DESIGN.md, CSS variables, a Tailwind config, or just hex codes and a font)
2. Ask me a few quick brand questions
3. Neutral defaults — a clean, modern look with no branding"
```

- **Option 1:** Ask one follow-up: *"Paste them here (or give a file path)."* Store the answer as `intake.brand_overrides` and `intake.brand_choice: "provided"`.
- **Option 2:** Store `intake.brand_choice: "questions"`. The 4 brand questions are asked at the start of Phase 1 Step A.
- **Option 3:** Store `intake.brand_choice: "default"`.

Phase 1 Step A turns this choice into `DESIGN.md`.

---

### Optional: Q&A Log

After Question 5, ask:

```
"Would you like me to save a log of our decisions and context throughout this session?
This creates a qa-log.md file — useful if you want to share the rationale with your team.

1. Yes — Save Q&A log
2. No  — Skip Q&A logging"
```

Store as `context.save_qa_log` (bool).

---

## Variant Proposal

After all intake questions are answered, the agent analyzes the intake data and proposes **3-5 design variants**. Each variant represents a genuinely different layout approach suited to the feature — not cosmetic variations of the same layout.

**Timing by mode:**

- **Greenfield:** Propose variants immediately at the end of Phase 0.
- **Clone:** Defer variant proposal until **after Phase 0b (Capture)** completes — the captured DOM and screenshots inform which directions actually make sense. End Phase 0 by transitioning to Phase 0b; the variant proposal happens at the end of Phase 0b.
- **Hybrid:** Same as clone — defer until after Phase 0b.

This section's logic applies whenever the proposal is presented, regardless of when. The orchestrator must populate `variants[]` in state.json before transitioning to Phase 1.

### How to Derive Variants

For `greenfield` mode, use the intake fields:

| `core_data` signals | Candidate layouts |
|---------------------|-------------------|
| "list of items" / "queue" / "approvals" | Card grid, Split pane (list + detail), Data table with actions |
| "form" / "input" / "wizard" / "steps" | Wizard (multi-step), Single-page form, Side-by-side form + preview |
| "metrics" / "chart" / "monitoring" | Dashboard summary, Metric cards + table, Trend chart + alert feed |
| "detail view" / "record" / "profile" | Detail card, Tabbed detail page, Two-column layout |
| "search" / "filter" / "browse" | Search-first (prominent search bar), Filter panel + results grid, Faceted navigation |

For `clone` mode, derive variants from the captured page's structure plus an evolution axis (the source IS one of the variants):

| Variant type | What it does | When to propose |
|--------------|--------------|-----------------|
| Faithful recreation | Reproduce the source page 1:1 with mock data — establishes a baseline | Always (default first variant) |
| Cleanup pass | Same structure, modernized spacing/typography/color (no IA changes) | When source feels dated or visually inconsistent |
| Restructure | Same content, different layout pattern (e.g. table → cards, or two columns → tabs) | When `key_action` suggests a layout that doesn't match the source |
| Mobile-first | Same content reorganized for a small viewport | When `intake.idea` mentions mobile / on-the-go usage |
| Density change | Same layout, denser or roomier | When source feels too cramped or too sparse |

For `hybrid` mode, derive variants from the **new behavior** layered on the captured page:

- The first variant should always recreate the source page faithfully PLUS the new behavior in the most direct way possible
- The remaining variants explore meaningfully different ways to add the new behavior (in-page vs side panel vs modal vs new view, etc.)

Pick 3-5 variants that are meaningfully different from each other in layout, information architecture, or interaction pattern. Aim for variety that helps the PM evaluate different UX philosophies, not just different visual styles.

### Variant Proposal Format

```
"Based on what you've described, here are [N] design directions I could prototype.
Pick any combination (comma-separated numbers, or 'all'):

  1. [Label] — [One-sentence description of the layout and key UX characteristic]
  2. [Label] — [One-sentence description]
  3. [Label] — [One-sentence description]
  4. [Label] — [One-sentence description (if applicable)]
  5. [Label] — [One-sentence description (if applicable)]

Which would you like to see as HTML prototypes?"
```

**Example for an approval queue (greenfield mode):**

```
"Based on what you've described, here are 4 design directions I could prototype.
Pick any combination (comma-separated numbers, or 'all'):

  1. Card grid      — Scannable approval cards with status badges; bulk-select for batch approve/reject
  2. Split pane     — Approval list on the left, full detail view on the right (no navigation needed)
  3. Data table     — Dense tabular view with sortable columns, inline action buttons per row
  4. Inbox style    — Email-like layout with unread indicators, priority flagging, and a reading pane

Which would you like to see as HTML prototypes?"
```

**Example for a captured approval page (clone mode), after Phase 0b:**

```
"I captured the page — it's a data table with 8 columns, dense rows, and a single
approve button per row. Here are 4 directions I could prototype on top of that:

  1. Faithful recreation  — Same table, same layout, mock data (baseline for comparison)
  2. Cleanup pass         — Same table, modernized spacing/typography, the captured/brand tokens applied
  3. Bulk-action layer    — Add row selection + sticky bulk-approve bar at the top
  4. Split detail pane    — Table on the left, full record detail on the right (no row navigation)

Which would you like to see as HTML prototypes?"
```

### Processing the User's Selection

- Accept: comma-separated numbers (`"1, 3"`), ranges (`"1-3"`), or `"all"`
- Convert each selected variant to a kebab-case slug:
  - "Card grid" → `card-grid`
  - "Split pane" → `split-pane`
  - "Inbox style" → `inbox-style`
- Populate `variants[]` in state.json with one entry per selected variant, all with `status: "pending"`
- Set `html_path` for each: `prototypes/{feature-name}/ui-concept-{variant-slug}.html`

---

## Output: intake.md

For `greenfield` mode, save `intake.md` after variant selection is confirmed. For `clone` and `hybrid` modes, save `intake.md` at the end of Phase 0 (without `Selected Variants` populated yet) and append `Selected Variants` after Phase 0b's variant proposal completes.

Save to `.prototype/{feature-name}/intake.md`:

```markdown
# Intake: {Feature Name}

## Mode
{intake.mode}  {if clone/hybrid: — source: `{intake.source_url}`}

## Feature Idea
{intake.idea}

## Who Uses It
{intake.who}

## Key Action
{intake.key_action}

## Core Data
{intake.core_data}

## Design System
{intake.brand_choice: provided brand tokens | brand questions in Phase 1 | neutral defaults | captured from source (clone mode)}
{if intake.mode != "greenfield": "Source capture: " + (chrome_mcp_enabled ? "Chrome DevTools MCP" : "(not available)")}

## Selected Variants
{populated after variant selection — may be deferred until after Phase 0b for clone/hybrid modes}
{for each selected variant:}
- **{label}** (`{slug}`) — {description}

## Generated
{ISO8601 timestamp}
```

---

## State Update

After Phase 0 completes (greenfield mode — variants selected; clone/hybrid mode — variants deferred):

```json
{
  "current_phase": "{1 for greenfield, 0b for clone/hybrid}",
  "phase_status": {
    "intake": "completed"
  },
  "intake": {
    "mode": "greenfield | clone | hybrid",
    "source_url": "{url or null}",
    "idea": "...",
    "who": "...",
    "key_action": "...",
    "core_data": "...",
    "brand_choice": "provided | questions | default | null",
    "brand_overrides": null
  },
  "variants": [
    { "slug": "card-grid", "label": "Card grid", "description": "...", "status": "pending", "html_path": "prototypes/{feature-name}/ui-concept-card-grid.html" }
  ],
  "context": {
    "save_qa_log": true,
    "chrome_mcp_enabled": false,
    "design_system": null
  },
  "artifacts": {
    "intake": ".prototype/{feature-name}/intake.md"
  }
}
```

Notes:
- `intake.source_url` is `null` for greenfield mode
- `context.chrome_mcp_enabled` is `true` only when clone/hybrid mode was chosen AND the Chrome DevTools MCP was reachable
- `variants[]` is empty when clone/hybrid mode is entering Phase 0b — variants are added at the end of Phase 0b
- `design_system` remains `null` until Phase 1 Step A resolves the tokens (via provided brand tokens, brand questions, neutral defaults, or captured tokens)

---

## Transition

**For `greenfield` mode** (with variants selected):

Once state is saved and `intake.md` is written:

```
"Great — I'll prototype the [N] selected directions. Starting with design tokens now..."
```

Set `current_phase: "1"` and immediately begin Phase 1 by reading `phases/01-ui-concept.md`. No additional confirmation needed for the 0 → 1 transition.

**For `clone` or `hybrid` mode** (variants deferred):

Once state is saved and `intake.md` is written (without `Selected Variants` populated yet):

```
"Got it — I'll capture the page first, then propose variants based on what's there.
Starting capture now..."
```

Set `current_phase: "0b"` and immediately begin Phase 0b by reading `phases/00b-capture.md`. After Phase 0b completes, the variant proposal happens, then state advances to `current_phase: "1"`.

---

## Quality Standards

Before marking Phase 0 complete:

- [ ] `intake.mode` set to one of `"greenfield" | "clone" | "hybrid"`
- [ ] If `intake.mode` is `clone` or `hybrid`: `intake.source_url` is populated AND `context.chrome_mcp_enabled` is `true`
- [ ] All 4 intake fields populated (`idea`, `who`, `key_action`, `core_data`) — `core_data` may be `"as-is (matches source page)"` for clone mode
- [ ] `intake.brand_choice` stored (greenfield/hybrid)
- [ ] `save_qa_log` stored in context
- [ ] **Greenfield only:** At least 1 variant selected with `status: "pending"` in `variants[]`
- [ ] **Clone/hybrid:** `variants[]` may be empty at end of Phase 0 — populated at end of Phase 0b instead
- [ ] `intake.md` written to workspace (Selected Variants section may be empty for clone/hybrid until Phase 0b)
- [ ] state.json updated with `phase_status.intake: "completed"` and `current_phase: "1"` (greenfield) or `"0b"` (clone/hybrid)
