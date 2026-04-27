---
name: ui-concept
description: Phase 2b - UI Concept (optional). Loads or generates a DESIGN.md design token file, then generates a rough but realistic visual sketch of the main UI surface for the chosen direction. Produces a live-preview .canvas.tsx for Cursor users and a self-contained ui-concept.html for anyone else. Both outputs use real design tokens from DESIGN.md. Purpose is visual validation of the concept before committing to requirements — not production code.
---

# Phase 2b: UI Concept

## Purpose

Turn the chosen direction into something the user can *see* and react to — before writing a single requirement. A rough but realistic visual sketch is worth more than a paragraph of description for validating whether a concept feels right.

This phase produces three outputs:
- **`DESIGN.md`** — a design token file at the workspace root, either loaded from an existing one or generated from 4 quick questions. Acts as the seed design system, carried forward into MonkeyPlan and MonkeyMode.
- **`ui-concept.canvas.tsx`** — a self-contained React component that renders live in the Cursor canvas panel, styled with tokens from `DESIGN.md`
- **`ui-concept.html`** — a self-contained HTML file (Tailwind CDN + vanilla JS) that opens directly in any browser, no tooling needed, also styled with tokens from `DESIGN.md`

## When It Runs

- Only when `context.ui_concept_enabled` is `true`
- Only when the chosen direction involves a user-facing interface
- Runs after Phase 2a (Direction Setting), before Phase 2c (Risk Challenge)
- Seeing the UI sketch often surfaces concrete risks — making the risk challenge more productive if it follows

## Prerequisites

Before starting, read:
- `{workspace}/.monkeythink/{topic-name}/state.json` — chosen direction, scope sketch, success criteria
- `{workspace}/.monkeythink/{topic-name}/framing.md` — who is affected, pain points, opportunity

## Output

- `{workspace}/DESIGN.md` — design token file at the workspace root (loaded or generated)
- `.monkeythink/{topic-name}/ui-concept.canvas.tsx` — Cursor canvas component
- `.monkeythink/{topic-name}/ui-concept.html` — standalone HTML file

## Process

### Step 0: Load or Generate DESIGN.md

Before sketching anything, establish the design tokens that will style both outputs.

#### Step 0a: Check for existing DESIGN.md

Read `{workspace}/DESIGN.md`.

**If the file exists:**
- Parse the YAML frontmatter to extract tokens: `colors`, `typography`, `spacing`, `rounded`, `components`
- Announce: "Found an existing DESIGN.md — I'll apply your design tokens to the UI sketch."
- Skip to Step 0c (lint check), then proceed to Step 1.

**If the file does not exist:**
- Proceed to Step 0b.

#### Step 0b: Generate a minimal DESIGN.md

Ask the user 4 targeted questions:

```
"Before I sketch the UI, I need a few design basics so the concept uses your brand's look and feel.

1. Brand personality — How should this product feel?
   (e.g. "professional and minimal", "friendly and approachable", "bold and data-dense")

2. Primary color — What's your main brand color? (hex code, or describe it)
   (e.g. "#1A73E8", "a deep navy blue", "forest green")

3. Font preference — Any specific font, or should I pick something that matches the personality?
   (e.g. "Inter", "match the personality", "we use DM Sans")

4. Corner radius — Sharp edges, slightly rounded, or fully rounded?
   (e.g. "sharp/none", "slightly rounded (4-8px)", "rounded (12px+)")"
```

From the answers, generate a valid `DESIGN.md` at `{workspace}/DESIGN.md` following the [DESIGN.md spec](https://github.com/google-labs-code/design.md):

```markdown
---
version: alpha
name: [Brand name derived from topic/framing]
description: [Brand personality answer]
colors:
  primary: "[derived hex]"
  secondary: "[complementary color]"
  neutral: "[light background color]"
  surface: "#FFFFFF"
  on-surface: "[dark text color for contrast]"
  error: "#B3261E"
typography:
  h1:
    fontFamily: [chosen font]
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: [chosen font]
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label-sm:
    fontFamily: [chosen font]
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.04em
rounded:
  sm: [4px or 0px depending on preference]
  md: [8px or 4px]
  lg: [16px or 8px]
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

[Brand personality statement derived from user's answer — 2-3 sentences describing the product's look, feel, and target audience.]

## Colors

[Describe the color palette and the role each color plays.]

## Typography

[Describe the font choice and how different type levels are used.]

## Layout

The layout uses an 8px base spacing scale. Content is contained to a max-width of 1200px on desktop with 16px margins on mobile.

## Shapes

[Describe corner radius philosophy based on user's preference.]

## Do's and Don'ts

- Do use the primary color only for the single most important action per screen
- Do maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Don't use more than two font weights on a single screen
- Don't mix sharp and rounded corners in the same view
```

Save to `{workspace}/DESIGN.md`.

#### Step 0c: Lint the DESIGN.md

Run the linter to validate the file and catch any contrast or token reference issues:

```bash
npx @google/design.md lint DESIGN.md
```

- If the linter **passes**: proceed to Step 1
- If the linter **reports contrast failures**: adjust the offending color values to meet WCAG AA (4.5:1 for normal text) and re-save before proceeding
- If the linter **reports token reference errors**: fix the broken `{path.to.token}` references and re-save
- If `npx` is not available (non-Node environment): skip the lint step and note it in the announcement

#### Step 0d: Extract tokens for use in outputs

From the parsed `DESIGN.md`, build a token map to apply in both generated files:

```
primary_color   = colors.primary
surface_color   = colors.surface (or #FFFFFF fallback)
text_color      = colors.on-surface (or #1A1C1E fallback)
secondary_color = colors.secondary
font_family     = typography.body-md.fontFamily
radius_md       = rounded.md
spacing_md      = spacing.md
```

These are applied directly as CSS custom properties in the HTML file and as Tailwind arbitrary values in the canvas component.

---

### Step 1: Understand the Surface

From the direction and framing data, identify:

1. **The primary screen** — what is the single most important view for this feature? If there are multiple screens, pick the one the user spends the most time on or the one that carries the most value
2. **The key user action** — what is the one thing the user *does* on this screen? (approve, search, configure, review, submit, etc.)
3. **The core data** — what information does the screen display? (list of items, a form, a detail view, a dashboard summary, etc.)
4. **The key states** — what are the 2-3 most important states? (empty, loaded with data, loading, error, confirmation)

If the direction involves multiple distinct screens, build the primary screen in full and add minimal placeholder cards for secondary screens.

### Step 2: Sketch the Layout

Design a layout that reflects real usage — not a wireframe with boxes, but a layout that uses realistic:
- **Labels and copy** — use actual field names, button labels, and headings drawn from the direction and framing
- **Sample data** — populate tables, lists, and cards with 3-5 realistic example rows (not "Item 1", "Item 2" — use domain-relevant names)
- **Hierarchy** — primary action should be visually prominent; secondary actions should feel secondary
- **States** — show the default loaded state; include a toggle or tab to preview at least one other state (empty or confirmation)
- **Design tokens** — apply the token map from Step 0d: use the primary color for the main action, surface color for backgrounds, the brand font for all text, and the brand radius for all interactive elements

The sketch should be rough enough to build in one pass but realistic enough that the user immediately understands what the feature would feel like — in their actual brand colors and typography.

### Step 3: Generate Both Files

Generate both files in a single pass. They must represent the same layout, content, and design tokens.

#### Canvas Component (`ui-concept.canvas.tsx`)

Rules:
- `'use client'` at the top — required for Cursor canvas
- Single default export — a React functional component named after the feature in PascalCase (e.g. `InvoiceApproval`)
- **No external imports** — no npm packages, no design system imports. Use only React hooks (`useState`, `useMemo`) if needed
- **Tailwind CSS with token-derived arbitrary values** — apply design tokens as Tailwind arbitrary values (e.g. `bg-[#1A73E8]`, `font-[Inter]`, `rounded-[8px]`) using the values extracted in Step 0d
- **Self-contained mock data** — define a `const mockData = [...]` array at the top of the file
- **Interactive where it matters** — wire up the primary action with `useState`. Do not make every element interactive — focus on the key action
- Keep it under ~150 lines

Structure:
```tsx
'use client'

import { useState } from 'react'

// Design tokens from DESIGN.md
const tokens = {
  primary: '[colors.primary]',
  surface: '[colors.surface]',
  text: '[colors.on-surface]',
  secondary: '[colors.secondary]',
  font: '[typography.body-md.fontFamily]',
  radius: '[rounded.md]',
}

const mockData = [
  // 3-5 realistic domain entries
]

export default function FeatureName() {
  const [state, setState] = useState(...)

  return (
    <div className={`min-h-screen p-6`} style={{ backgroundColor: tokens.surface, fontFamily: tokens.font }}>
      {/* layout here — use tokens.primary for primary actions, tokens.text for text */}
    </div>
  )
}
```

#### Standalone HTML (`ui-concept.html`)

Rules:
- Fully self-contained — no external files, no npm, no build step
- Load Tailwind via CDN and configure it with the design tokens inline:
  ```html
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '[colors.primary]',
            secondary: '[colors.secondary]',
            surface: '[colors.surface]',
            'on-surface': '[colors.on-surface]',
          },
          fontFamily: {
            brand: ['[typography.body-md.fontFamily]', 'sans-serif'],
          },
          borderRadius: {
            brand: '[rounded.md]',
          }
        }
      }
    }
  </script>
  ```
- With this config, use semantic class names like `bg-primary`, `text-on-surface`, `font-brand`, `rounded-brand` throughout the HTML — no arbitrary values needed
- Vanilla JS only — no frameworks. Use `<script>` blocks with `document.querySelector` for any interactivity
- Same layout and content as the canvas component
- Wire up the same primary interaction as the canvas component

Structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Feature Name] — UI Concept</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { /* tokens here */ } } }
  </script>
</head>
<body class="min-h-screen bg-surface font-brand p-6">
  <!-- layout here — use bg-primary for primary actions, text-on-surface for body text -->
  <script>
    // primary interaction
  </script>
</body>
</html>
```

### Step 4: Present to User

After generating all three files:

1. Announce what was created:
   ```
   "UI concept generated for [feature name].

   Design system: DESIGN.md [created/loaded] at the workspace root — [N] tokens applied.

   - Cursor users: Open ui-concept.canvas.tsx in the canvas panel to see it live
   - Everyone else: Open ui-concept.html in any browser — no setup needed

   This shows [1-sentence description of what the sketch depicts], styled with your
   [brand personality] design tokens ([primary color], [font]).
   The [primary action] is wired up — you can interact with it.

   Does this capture the direction well, or should I adjust anything before we move on?"
   ```

2. If the user requests visual changes (colors, layout, copy):
   - Make targeted edits to both files — do not regenerate from scratch unless the layout fundamentally changed
   - If color or font changes are requested, update `DESIGN.md` first, then re-derive tokens and update both files
   - Re-present with a summary of what changed

3. If the user approves or says it's good enough:
   - Update state.json: `ui_concept: "completed"`
   - Ask: "Ready to move to [Phase 2c: Risk Challenge / Phase 3: Discovery Brief]?"

## Quality Standards

Before marking Phase 2b complete:

- [ ] `DESIGN.md` exists at workspace root (loaded or generated)
- [ ] `DESIGN.md` lint passes (or lint was skipped with a note)
- [ ] All WCAG AA contrast failures resolved before generating files
- [ ] Canvas file has `'use client'` and a single default export
- [ ] No external npm imports in the canvas file
- [ ] Canvas file uses design tokens (not hardcoded generic colors)
- [ ] HTML file is fully self-contained (opens in browser with no setup)
- [ ] HTML file has inline `tailwind.config` with design tokens
- [ ] Both files show the same layout, content, and brand tokens
- [ ] Realistic mock data used — no "Item 1", "Item 2" placeholders
- [ ] Primary user action is interactive in both files
- [ ] Labels and copy match the domain language from the direction and framing
- [ ] User explicitly reacted to the sketch ("looks right", "adjust X", "move on")

## What This Phase Does NOT Do

- Does not produce production code — this is a throwaway concept sketch
- Does not replace Phase 2 UX Ideation in MonkeyPlan — that phase does the full component mapping and framework-specific spec
- Does not build every screen — primary screen only (with placeholders for others)
- Does not produce a complete design system — `DESIGN.md` is a seed that gets refined in MonkeyPlan and MonkeyMode

## State Update

```json
{
  "current_phase": "2c",
  "phase_status": {
    "ui_concept": "completed"
  },
  "artifacts": {
    "design_md": "{workspace}/DESIGN.md",
    "ui_concept_canvas": ".monkeythink/{topic-name}/ui-concept.canvas.tsx",
    "ui_concept_html": ".monkeythink/{topic-name}/ui-concept.html"
  }
}
```

If risk challenge is disabled (`risk_challenge_enabled` is `false`), set `current_phase: "3"` instead.
