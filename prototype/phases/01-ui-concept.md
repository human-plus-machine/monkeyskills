---
name: ui-concept
description: Phase 1 - UI Concepts. Resolves design tokens once (user-provided brand tokens, a short brand-question flow, neutral defaults, or tokens captured from a production page), then generates one self-contained HTML prototype per selected variant. Includes an iteration loop for adjustments and new variants after the initial set is delivered.
---

# Phase 1: UI Concepts

## Purpose

Turn the PM's chosen design variants into standalone HTML files they can open in any browser and share with teammates immediately. All variants are built from the same shared design tokens so the comparison is fair — layout and structure differ, not brand identity.

This phase produces one output per variant:

- **`ui-concept-{variant-slug}.html`** at `prototypes/{feature-name}/` — fully self-contained, Tailwind CDN, vanilla JS, no build step

## When It Runs

- After Phase 0 (Intake) is complete
- `variants[]` in state.json has at least 1 entry with `status: "pending"`

## Prerequisites

Before starting, read:
- `{workspace}/.prototype/{feature-name}/state.json` — intake data, variants[], context flags, mode
- `{workspace}/.prototype/{feature-name}/intake.md` — feature idea, who, key action, core data
- `{workspace}/.prototype/{feature-name}/capture.md` — **if `intake.mode` is `"clone"` or `"hybrid"`**, this contains the source-capture summary (paths to screenshots, extracted tokens, warnings)
- `{workspace}/.prototype/{feature-name}/source-capture/tokens.json` — **if `intake.mode` is `"clone"`**, the raw extracted design tokens
- `{workspace}/DESIGN.md` — if it already exists from a prior session, load it instead of re-generating
- `guides/chrome-devtools-mcp.md` — **if `intake.mode` is `"clone"` or `"hybrid"`**, read this for the `tokens.json` → DESIGN.md mapping rules in the "Building DESIGN.md from tokens.json" section

---

## Step A: Resolve Design Tokens (once, shared across all variants)

**Check first:** If `{workspace}/DESIGN.md` already exists (e.g. this is a resumed session), parse it and extract tokens. Skip to Step A-end. Do not regenerate or ask again.

If `DESIGN.md` does not exist, branch on `intake.mode`:

**Mode-based path selection:**

| `intake.mode` | Path used | DESIGN.md tokens come from |
|---------------|-----------|----------------------------|
| `greenfield` | Path 1 (Brand tokens) | Tokens the PM provides, the 4-question flow, or neutral defaults |
| `clone` | **Path 3 (Captured)** | `source-capture/tokens.json` |
| `hybrid` | Path 1 + captures as reference | Brand tokens (canonical), capture as visual reference |

If the PM explicitly says during clone-mode intake "use my brand tokens, not the captured ones", switch to Path 1 with captures as reference (effectively hybrid mode).

---

### Path 1: Brand Tokens (greenfield, or the canonical source in hybrid)

Read `intake.brand_choice` (asked in Phase 0 Question 5; if it is missing, ask that question now):

- **`provided`:** Parse the tokens in `intake.brand_overrides` into the DESIGN.md format below. Fill any missing key from the neutral defaults table. Set `context.design_system: "custom"`.
- **`questions`:** Run Path 2 below.
- **`default`:** Generate DESIGN.md from the neutral defaults table. Set `context.design_system: "default"`.

Neutral defaults:

| Key | Default |
|-----|---------|
| `colors.primary` | `#2563EB` |
| `colors.secondary` | `#1E40AF` |
| `colors.neutral` | `#F5F5F5` |
| `colors.surface` | `#FFFFFF` |
| `colors.on-surface` | `#1A1A1A` |
| `colors.error` | `#D32F2F` |
| `typography.*.fontFamily` | `Inter` |
| `rounded.md` | `6px` |
| `spacing.md` | `16px` |

Use the DESIGN.md structure shown in Path 2 for every choice. The PM can also point at a production page to lift tokens from; if they do, switch to clone or hybrid mode and use Path 3.

---

### Path 2: Brand Questions

Ask the user 4 questions, one at a time:

```
"Before I generate the prototypes, I need a few design basics so they match your brand.
I'll ask you 4 quick questions."
```

**Q1 — Brand personality:**
```
"How should this product feel?
(e.g. 'professional and minimal', 'friendly and approachable', 'bold and data-dense')"
```

**Q2 — Primary color:**
```
"What's your main brand color?
(hex code, or describe it — e.g. '#1A73E8', 'a deep navy blue', 'forest green')"
```

**Q3 — Font preference:**
```
"Any specific font, or should I pick one that matches the personality?
(e.g. 'Inter', 'match the personality', 'we use DM Sans')"
```

**Q4 — Corner radius:**
```
"Sharp edges, slightly rounded, or fully rounded?
(e.g. 'sharp/none', 'slightly rounded (4-8px)', 'rounded (12px+)')"
```

From the answers, generate `{workspace}/DESIGN.md`:

```markdown
---
version: alpha
name: [Brand name derived from feature name / intake]
description: [Brand personality answer]
colors:
  primary: "[derived hex from Q2]"
  secondary: "[complementary color]"
  neutral: "[light neutral background]"
  surface: "#FFFFFF"
  on-surface: "[dark text for contrast]"
  error: "#B3261E"
typography:
  h1:
    fontFamily: [Q3 font or matched font]
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: [Q3 font]
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label-sm:
    fontFamily: [Q3 font]
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.04em
rounded:
  sm: [0px or 4px based on Q4]
  md: [4px or 8px based on Q4]
  lg: [8px or 16px based on Q4]
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px
---

## Overview

[2-3 sentence brand personality statement from Q1.]

## Colors

[Describe the color palette roles.]

## Typography

[Describe the font choice and type scale.]

## Layout

The layout uses an 8px base spacing scale. Content is contained to a max-width of 1200px on desktop with 16px margins on mobile.

## Shapes

[Describe corner radius philosophy from Q4.]

## Do's and Don'ts

- Do use the primary color only for the single most important action per screen
- Do maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Don't use more than two font weights on a single screen
- Don't mix sharp and rounded corners in the same view
```

Set `context.design_system: "custom"` in state.json.

---

### Path 3: Captured Tokens (`intake.mode` is `"clone"`)

This path runs when the PM provided a source URL and chose clone mode — the tokens come from `source-capture/tokens.json` written by Phase 0b. Read `guides/chrome-devtools-mcp.md` § "Building DESIGN.md from tokens.json" first.

**A3-a: Load tokens.json**

Read `.prototype/{feature-name}/source-capture/tokens.json`. If the file does not exist, abort and surface to the user — Phase 0b should have produced it. Offer to re-run Phase 0b or switch to a different path.

**A3-b: Map captured fields to DESIGN.md**

Apply the mapping rules from `guides/chrome-devtools-mcp.md`:

| Source field | DESIGN.md target |
|--------------|------------------|
| `primaryButton.backgroundColor` | `colors.primary` (convert rgb → hex) |
| `body.backgroundColor` | `colors.surface` |
| `body.color` | `colors.on-surface` |
| `body.fontFamily` (first family) | `typography.body-md.fontFamily` |
| `body.fontSize` | `typography.body-md.fontSize` |
| `h1.fontFamily` | `typography.h1.fontFamily` |
| `h1.fontSize` | `typography.h1.fontSize` |
| `h1.fontWeight` | `typography.h1.fontWeight` |
| `card.borderRadius` or `primaryButton.borderRadius` | `rounded.md` |

If any captured field is `null` (selector not present on source page), use these fallbacks:

| Missing field | Fallback |
|---------------|----------|
| `primaryButton.backgroundColor` | First non-neutral color in `customProperties`, else `#0066CC` |
| `body.fontFamily` | `Inter` |
| `h1.*` | Mirror `body.*` with weight bumped to `700` |
| `card.borderRadius` | `4px` |

**A3-c: Run contrast check**

Run WCAG AA contrast check on the captured `primary` over `surface`. If it fails, darken `primary` by one step and write the adjustment to both `DESIGN.md` and `capture.md`'s Warnings section.

**A3-d: Generate DESIGN.md**

Write `{workspace}/DESIGN.md` using the captured values:

```markdown
---
version: alpha
name: "Captured from {source domain}"
description: "Tokens extracted from {intake.source_url} on {ISO8601 date}"
source_url: "{intake.source_url}"
captured_at: "{ISO8601 timestamp from capture.md}"
colors:
  primary: "{captured.primary}"
  secondary: "{derived secondary or fallback}"
  neutral: "{derived from customProperties or fallback}"
  surface: "{captured.surface}"
  on-surface: "{captured.on-surface}"
  error: "#D32F2F"
typography:
  h1:
    fontFamily: "{captured.h1.fontFamily}"
    fontSize: "{captured.h1.fontSize}"
    fontWeight: "{captured.h1.fontWeight}"
  body-md:
    fontFamily: "{captured.body.fontFamily}"
    fontSize: "{captured.body.fontSize}"
    fontWeight: 400
  label-sm:
    fontFamily: "{captured.body.fontFamily}"
    fontSize: 12px
    fontWeight: 600
rounded:
  sm: 2px
  md: "{captured.rounded.md}"
  lg: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
---

## Overview

Tokens captured from {intake.source_url}. The prototype variants will match the
source page's visual language — colors, fonts, spacing, and radii are pulled
directly from computed styles on the live page.

## Colors

Primary `{captured.primary}` was extracted from the page's primary action button.
Surface `{captured.surface}` and text `{captured.on-surface}` come from the page body.

## Typography

Body: `{captured.body.fontFamily}` @ `{captured.body.fontSize}`.
H1: `{captured.h1.fontFamily}` @ `{captured.h1.fontSize}` / weight `{captured.h1.fontWeight}`.

## Layout

The layout uses captured spacing values where available. Content is contained to a
max-width of 1200px on desktop.

## Shapes

Border radius is `{captured.rounded.md}` — matched from cards and buttons on the source page.

## Do's and Don'ts

- Do match the source page's visual language; this is a clone, not a redesign
- Do swap real data for domain-realistic mock data
- Don't introduce new colors or fonts not present in the source
- Don't change the structural pattern unless the variant description explicitly says to
```

Set `context.design_system: "captured"` in state.json.

---

### Path 3b: Hybrid Mode (`intake.mode` is `"hybrid"`)

For hybrid mode, the **canonical tokens come from Path 1 / Path 2** (brand tokens or neutral defaults) and run as normal. The captures are passed to subagents as **visual reference only**, not as the source of design tokens.

After running Path 1 / 2 to produce DESIGN.md, additionally read `source-capture/tokens.json` and `source-capture/desktop.png` paths — these are passed to subagents via the `SOURCE_CAPTURE` brief field in Step B. The subagent's instructions are explicit: use the canonical tokens (brand or default) for colors/fonts/radii; use the captures for **structural inspiration and visual fidelity hints**.

No DESIGN.md changes are made for the capture in hybrid mode — `context.design_system` remains whatever Path 1/2 set it to. The capture is purely an input to the subagent brief.

---

### Step A-end: Extract Token Map

After `DESIGN.md` is written (any path), parse it and build a token map for use in all HTMLs.

**If `context.design_system` is `"custom"` or `"default"`**, extract hex values for all color fields and the font family — these are injected directly into the Tailwind config by the subagent:

```
primary_color   = colors.primary
secondary_color = colors.secondary
neutral_color   = colors.neutral
surface_color   = colors.surface  (fallback: #FFFFFF)
text_color      = colors.on-surface  (fallback: #1A1C1E)
error_color     = colors.error
font_family     = typography.body-md.fontFamily
radius_md       = rounded.md
spacing_md      = spacing.md
```

Run a contrast check: ensure `primary_color` over `surface_color` meets WCAG AA (4.5:1). If it fails, darken `primary_color` by one step and update `DESIGN.md` before proceeding.

**If `context.design_system` is `"captured"`** (clone mode), extract hex values from the captured DESIGN.md and inject them into the Tailwind config — same approach as the `"custom"` path:

```
primary_color   = colors.primary          (from captured tokens)
secondary_color = colors.secondary        (derived or fallback)
neutral_color   = colors.neutral
surface_color   = colors.surface
text_color      = colors.on-surface
error_color     = colors.error
font_family     = typography.body-md.fontFamily
radius_md       = rounded.md
spacing_md      = spacing.md
```

Same contrast check as the `"custom"` path applies.

### Step A-end-2: Build SOURCE_CAPTURE brief field (clone or hybrid mode only)

If `intake.mode` is `"clone"` or `"hybrid"`, build a `SOURCE_CAPTURE` object to pass to every subagent:

```
SOURCE_CAPTURE:
  mode: "{intake.mode}"
  source_url: "{intake.source_url}"
  desktop_screenshot_path: "{absolute path to source-capture/desktop.png}"
  mobile_screenshot_path: "{absolute path to source-capture/mobile.png}"
  snapshot_path: "{absolute path to source-capture/snapshot.json}"
  tokens_path: "{absolute path to source-capture/tokens.json}"
  states:
    - label: "{state label}"
      path: "{absolute path to states/{name}.png}"
    {one entry per captured state, if any}
  capture_summary: "{2-3 sentence summary of the page from capture.md}"
```

If `intake.mode` is `"greenfield"`, set `SOURCE_CAPTURE: null` in the brief.

Announce:
```
"Design tokens ready — using [brand tokens / neutral defaults / captured from source] system.
{If clone/hybrid: Source capture: {N} screenshot(s) + DOM snapshot at {source-capture-dir}}
[Custom: Primary {primary_color}, font {font_family}, radius {radius_md}. | Default: neutral defaults, Inter font. | Captured: Primary {primary_color}, font {font_family}, radius {radius_md}.]
Generating {N} prototype(s) now..."
```

---

## Step B: Spawn prototype-builder Subagents in Parallel

The orchestrator does **not** write HTML directly. Instead, it constructs a build brief for each pending variant and spawns one `prototype-builder` subagent per variant — all in parallel using the Task tool.

### B1: Construct the absolute output path

For each variant, compute:

```
{workspace_absolute_path}/prototypes/{feature-name}/ui-concept-{variant-slug}.html
```

Create the `prototypes/{feature-name}/` directory before dispatching (the subagent will also attempt this, but creating it first avoids races).

### B2: Construct the browser open command

```bash
open -a "Google Chrome" "{absolute_output_path}"
```

Include this verbatim in the brief. The subagent handles OS fallback if Chrome is unavailable.

### B3: Dispatch all pending variants in parallel

Spawn one `prototype-builder` subagent per variant with `status === "pending"`. Pass this brief as the subagent's prompt, substituting all values:

```
FEATURE: {intake.idea — display name derived from feature_name}
VARIANT_SLUG: {variant.slug}
VARIANT_LABEL: {variant.label}
VARIANT_DESCRIPTION: {variant.description}

MODE: {intake.mode}  # greenfield | clone | hybrid

WHO: {intake.who}
KEY_ACTION: {intake.key_action}
CORE_DATA: {intake.core_data}

DESIGN_TOKENS:
  primary_color: {token_map.primary_color}
  secondary_color: {token_map.secondary_color}
  neutral_color: {token_map.neutral_color}
  surface_color: {token_map.surface_color}
  text_color: {token_map.text_color}
  error_color: {token_map.error_color}
  font_family: {token_map.font_family}
  radius_md: {token_map.radius_md}
  spacing_md: {token_map.spacing_md}

DESIGN_SYSTEM: {context.design_system}  # custom | default | captured

SOURCE_CAPTURE: {SOURCE_CAPTURE object built in Step A-end-2, or null}
  # When non-null, the subagent should Read the desktop_screenshot_path as a
  # visual reference. For mode=clone, match the source's structure and visual
  # language. For mode=hybrid, use captures as inspiration but DESIGN_TOKENS
  # are canonical.

OUTPUT_PATH: {absolute_output_path}
OPEN_COMMAND: open -a "Google Chrome" "{absolute_output_path}"
```

**Important dispatch rules:**
- Spawn all variants at once in a single message (true parallel execution)
- Do not spawn more than 5 subagents concurrently — if more than 5 variants are pending, batch them (5 at a time)
- Pass the **identical** token map to every subagent — tokens are resolved once and shared

### B4: Collect results and update state

Wait for all subagents to complete. Each returns a `PROTOTYPE_RESULT` block. For each result:

- Parse `variant_slug`, `status`, `html_path`, `file_url`, `browser_opened`, and `summary`
- Update `variants[slug].status` to `"generated"` (or `"failed"` if `status: failed`) in state.json
- Record `variants[slug].html_path` from the result

**On failure:** If a subagent reports `status: failed`:
```
"The {Variant Label} prototype failed to generate. Error: {errors field from result}.
Would you like me to retry it, or skip it and continue with the others?"
```

**Minimum viable set:** Proceed to Step C if at least 1 variant generated successfully.

---

## Step C: Present the Full Set

After all subagents complete and results are collected, present the full set. Each HTML was already opened in Chrome by its subagent — this message gives the PM a consolidated view:

```
"All {N} prototype{s} are ready and open in Chrome.

  - {Variant 1 Label}: [{file_url_1}]({file_url_1})
  - {Variant 2 Label}: [{file_url_2}]({file_url_2})
  ...

All use the same [{design_system}] design system.
Files are at prototypes/{feature-name}/ — drag any of them into Slack to share.

What would you like to do next?
  A. Adjust a specific variant (describe what to change)
  B. Add a new design direction
  C. Done — mark this prototype set as complete"
```

---

## Step D: Iteration Loop

Remain in Phase 1 until the user explicitly chooses "Done" (or equivalent). Handle:

### Adjust a Variant

User says: "Change the card grid to show the approval status as a colored dot instead of a badge" or "Make the data table denser".

1. Read the current HTML file for that variant so the subagent has the existing code as context
2. Spawn a single `prototype-builder` subagent with the same brief format as Step B3, but add one extra field to the brief:

   ```
   EXISTING_HTML: {full contents of the current html file}
   CHANGES_REQUESTED: {verbatim description of what the user wants changed}
   ```

3. The subagent rewrites only what needs to change and saves the file to the same `OUTPUT_PATH`
4. After the subagent returns, announce:
   ```
   "Updated {Variant Label} — {summary from subagent result}.
   Reopened in Chrome: [{file_url}]({file_url})"
   ```

### Add a New Variant

User says: "Also add a timeline view" or "Can you try a kanban board layout?"

1. Derive the new variant's label and kebab-case slug
2. Append to `variants[]` in state.json with `status: "pending"`
3. Run Steps B1–B4 for the new variant only (spawn one `prototype-builder` subagent)
4. After the subagent returns, announce:
   ```
   "New variant ready — {Label}: [{file_url}]({file_url})"
   ```

### Done

User says: "That's great, we're done" or "Ship it" or equivalent.

Update state.json:
```json
{
  "current_phase": "completed",
  "phase_status": {
    "ui_concepts": "completed"
  }
}
```

Announce:
```
"Prototype set complete for '{feature_name}'. {N} design direction{s} saved to prototypes/{feature-name}/.

When you're ready to move to structured requirements, invoke @monkeyplan for {feature-name}.
To share the prototypes, just send the HTML files — they open in any browser with no setup needed."
```

---

## Quality Standards

Before marking Phase 1 complete:

- [ ] `DESIGN.md` exists at workspace root with valid YAML frontmatter and all required token keys
- [ ] `context.design_system` set in state.json (`"custom"`, `"default"`, or `"captured"`)
- [ ] All selected variants have `status: "generated"` in `variants[]`
- [ ] All HTML files are fully self-contained (open in browser with no setup)
- [ ] All HTML files have inline `tailwind.config` block with design token values
- [ ] Domain-realistic mock data used in every file (NEVER real captured data, even when MODE is `"clone"`)
- [ ] Primary user action is interactive in every file
- [ ] **Clone mode:** First variant labelled "Faithful recreation" matches the source page's structure at a glance
- [ ] **Clone or hybrid mode:** `DESIGN.md` references `source_url` in its frontmatter or overview
- [ ] User explicitly confirmed they are done (iteration loop exited cleanly)

## State Update (at completion)

```json
{
  "current_phase": "completed",
  "phase_status": {
    "ui_concepts": "completed"
  },
  "variants": [
    { "slug": "card-grid", "status": "generated", "html_path": "prototypes/{feature-name}/ui-concept-card-grid.html" },
    { "slug": "split-pane", "status": "generated", "html_path": "prototypes/{feature-name}/ui-concept-split-pane.html" }
  ],
  "context": {
    "design_system": "custom"
  },
  "artifacts": {
    "design_md": "{workspace}/DESIGN.md"
  }
}
```
