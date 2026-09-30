---
name: prototype
description: Prototype - PM UI Prototyping - Turn a feature idea OR a production URL into multiple side-by-side standalone HTML prototypes (one per design direction) via a single intake conversation. Agent proposes 3-5 design variants, PM picks which to build. Can clone an existing page using the Chrome DevTools MCP (screenshots, DOM, extracted design tokens) or work greenfield from a description. Invoke with @prototype for [feature/idea/URL].
author: MonkeyMode Contributors
---

# Prototype — PM UI Prototyping Skill

## Intent

This skill lets product managers turn a rough feature idea — or a live production URL — into multiple side-by-side HTML prototypes in a single conversation. No repo cloning, no BRD, no canvas tooling required. Each prototype is a self-contained HTML file that opens directly in any browser.

**Tone:** Efficient, encouraging, PM-oriented — like a senior designer who goes fast and doesn't over-explain.

**Terminology:**
- **Prototype** (capitalized) — this skill, the workflow, or a Prototype project for a single feature
- **prototype** (lowercase) — an individual HTML artifact (one per variant)
- **Mode** — one of `greenfield`, `clone`, or `hybrid`; determines whether the skill captures a live URL as the starting point

**User invokes:** `@prototype for [feature/idea/URL]`

**Agent guides through:**
1. **Phase 0: Intake** — a mode question (greenfield / clone / hybrid), the feature idea, who uses it, key action, core data; a styling question (brand tokens, quick brand questions, or neutral defaults); then (for greenfield) proposes 3-5 design variants
2. **Phase 0b: Capture** (clone or hybrid mode only) — uses the Chrome DevTools MCP to drive a real Chrome browser, capture screenshots at desktop and mobile breakpoints, snapshot the DOM, extract design tokens from computed styles, and enumerate assets; produces `source-capture/` artifacts; THEN proposes variants informed by what was actually on the page
3. **Phase 1: UI Concepts** — design tokens resolved once (provided brand tokens, brand questions, neutral defaults, or captured tokens); one `prototype-builder` subagent spawned per chosen variant in parallel; each builds, saves, and opens its HTML file; orchestrator collects results, presents links, and manages the iteration loop

## Architecture: Orchestrator + Subagents

The Prototype skill uses a **one orchestrator, N worker subagents** model:

```
Orchestrator (@prototype)
├── Handles all user conversation (Phase 0 intake, preferences, iteration requests)
├── Manages state.json
├── Phase 0b (clone/hybrid only): drives Chrome DevTools MCP to capture source URL
│   ├── navigate → wait → resize → screenshot (desktop + mobile)
│   ├── DOM snapshot + computed-style token extraction
│   └── optional interactive state captures
├── Resolves design tokens once (brand tokens / defaults / captured tokens)
└── Phase 1: spawns prototype-builder subagents in parallel
    ├── prototype-builder (variant: card-grid)     → writes HTML, opens Chrome
    ├── prototype-builder (variant: split-pane)    → writes HTML, opens Chrome
    └── prototype-builder (variant: data-table)    → writes HTML, opens Chrome
```

**Orchestrator responsibilities:**
- All user-facing conversation
- State management (state.json reads/writes)
- Chrome DevTools MCP calls (Phase 0b page capture, clone/hybrid mode only)
- Constructing build briefs for subagents (including `SOURCE_CAPTURE` field when applicable)
- Dispatching subagents in parallel via your tool's subagent mechanism (e.g. Task / subagent tool)
- Collecting and parsing subagent results
- Presenting links and managing the iteration loop

**`prototype-builder` subagent responsibilities:**
- Receives a fully self-contained build brief (no state, no file reads beyond the brief)
- Generates exactly one HTML prototype file
- Opens it in Chrome
- Returns a structured `PROTOTYPE_RESULT` block

The orchestrator NEVER writes HTML files directly. All HTML generation is delegated to `prototype-builder` subagents.

## Workspace Setup

### Chrome DevTools MCP Availability Check (runs only when clone/hybrid mode is selected)

This probe is **deferred** until Phase 0 reaches the mode question. It is not run on every invocation — only when the PM picks clone or hybrid mode (or invokes `@prototype` with a URL).

1. Attempt to list tools on the `chrome-devtools` MCP server (npm package `chrome-devtools-mcp`)
2. Branch on the result:

**If the MCP server IS accessible (tools listed successfully):**
- Store `chrome_mcp_available: true` in memory for this session
- Set `context.chrome_mcp_enabled: true` in state.json
- Do not announce anything beyond what the intake phase already says — proceed to Phase 0b after Phase 0 wraps

**If the MCP server is NOT accessible (server not registered, network unreachable, or no tools returned):**
- Present the following setup offer:

```
"The Chrome DevTools MCP isn't connected yet. It's how I'll capture the page
from a URL — screenshots, layout, design tokens, and interactive states.

To set it up, add this to your MCP server configuration:

  Name:     chrome-devtools
  Command:  npx
  Args:     ["-y", "chrome-devtools-mcp@latest"]

Optional flags worth including:
  --isolated      — fresh Chrome profile each run (recommended)
  --viewport=1440x900   — consistent screenshot size

For internal / SSO-gated pages, see guides/chrome-devtools-mcp.md § Setup for
the attached-browser pattern (run your own Chrome with --remote-debugging-port).

Would you like to:
1. Set it up now — I'll wait while you add it and restart your IDE
2. Skip the URL capture — fall back to greenfield mode (describe the screen instead)"
```

- **If the user chooses option 1 (set it up):**
  - Wait for them to confirm they've added the server and restarted
  - Re-attempt the availability check
  - If it now succeeds: announce "Connected — I can see the Chrome DevTools MCP." Proceed with clone/hybrid mode
  - If it still fails: say "Still not reachable — let's fall back to greenfield mode." Set `intake.mode: "greenfield"`, clear `intake.source_url`, and `context.chrome_mcp_enabled: false`
- **If the user chooses option 2 (skip):**
  - Set `intake.mode: "greenfield"`, clear `intake.source_url`, and `context.chrome_mcp_enabled: false`
  - Continue Phase 0 in greenfield mode

Store `chrome_mcp_available` in session memory only. The reconcile step for resumed sessions is described in [Invocation Flow](#invocation-flow) below.

---

### Invocation Flow

`@prototype` follows two slightly different orderings depending on whether the project is new or being resumed. The first three steps are always the same:

1. **Extract feature name** from the user's request (convert to kebab-case). If the user did not specify one, list existing projects (see [Resuming Work](#resuming-work)) or ask for a name.
2. **Detect a URL** in the invocation (e.g. `@prototype for something like https://x.com/y`). If found, store it for use as `intake.source_url` and default the mode question to clone.
3. **Check for state file:** Read `{workspace}/.prototype/{feature-name}/state.json`.
The Chrome DevTools MCP availability check is **deferred** — it runs only when Phase 0 reaches the mode question and the PM picks clone or hybrid (or a URL was detected in step 2).

Then branch:

**New project (state file does not exist):**
- Create the `.prototype/{feature-name}/` directory
- Create initial `state.json` with `current_phase: "0"`, empty `intake`/`variants`, and any detected URL pre-populated in `intake.source_url`
- Start Phase 0 (Intake)

**Resumed project (state file exists):**
- Load context (intake data, variants, design system, mode, etc.) from state
- Reconcile Chrome DevTools MCP state: if `context.chrome_mcp_enabled` is `true` (project was created in clone/hybrid mode) AND the resume needs to re-capture or change the source URL, run the Chrome DevTools MCP probe and offer fallback options if unreachable. If the existing `source-capture/` artifacts are complete and the PM doesn't want to re-capture, no probe is needed.
- Resume from `current_phase`. If `current_phase` is `"completed"`, see the [Resuming Work](#resuming-work) section for how to handle re-entry

### State File Schema

The agent MUST create and maintain this file at `{workspace}/.prototype/{feature-name}/state.json`:

```json
{
  "feature_name": "string (kebab-case)",
  "current_phase": "0|0b|1|completed",
  "phase_status": {
    "intake": "not_started|in_progress|completed",
    "capture": "not_started|in_progress|completed|skipped",
    "ui_concepts": "not_started|in_progress|completed"
  },
  "intake": {
    "mode": "greenfield|clone|hybrid",
    "source_url": null,
    "idea": null,
    "who": null,
    "key_action": null,
    "core_data": null,
    "brand_choice": "provided|questions|default|null",
    "brand_overrides": null
  },
  "variants": [
    {
      "slug": "card-grid",
      "label": "Card grid",
      "description": "Scannable tiles, bulk-select for batch actions",
      "status": "pending|generated|failed|skipped",
      "html_path": "prototypes/{feature-name}/ui-concept-card-grid.html"
    }
  ],
  "context": {
    "save_qa_log": false,
    "chrome_mcp_enabled": false,
    "design_system": "custom|default|captured"
  },
  "artifacts": {
    "intake": ".prototype/{feature-name}/intake.md",
    "capture_md": ".prototype/{feature-name}/capture.md",
    "source_capture_dir": ".prototype/{feature-name}/source-capture/",
    "design_md": "{workspace}/DESIGN.md",
    "prototypes_dir": "prototypes/{feature-name}/",
    "qa_log": ".prototype/{feature-name}/qa-log.md"
  },
  "last_updated": "ISO8601 timestamp"
}
```

**When fields are populated:**
- `intake.mode` — Phase 0 Question 0 (mode fork); always set before any other intake field
- `intake.source_url` — Phase 0 Question 0 (only for clone/hybrid); pre-populated from URL detection if the user invoked `@prototype` with a URL
- `intake.*` (rest) — Phase 0, as each remaining question is answered
- `intake.brand_choice` / `intake.brand_overrides` — Phase 0 Question 5 (greenfield/hybrid); `brand_overrides` holds pasted brand tokens, otherwise stays `null`
- `variants[]` — Phase 0 (greenfield) or Phase 0b (clone/hybrid), after the user selects from the variant proposal; updated in Phase 1 as each subagent reports back
- `context.chrome_mcp_enabled` — set in Phase 0 Question 0 if clone/hybrid mode was chosen AND the Chrome DevTools MCP probe succeeded
- `context.design_system` — set when tokens are resolved (Phase 1 Step A, for `"custom"`, `"default"`, and `"captured"`)
- `artifacts.intake` — Phase 0 completion
- `artifacts.capture_md` / `artifacts.source_capture_dir` — Phase 0b completion; only set for clone/hybrid mode
- `artifacts.design_md` — Phase 1 Step A completion
- `artifacts.qa_log` — only if `context.save_qa_log` is `true`; appended to throughout the session

### Workspace Artifact Structure

All generated files go in the **user's workspace** (NOT in the skills directory):

```
{workspace}/
├── DESIGN.md                                      # Phase 1: Design token file (brand, default, or captured)
├── prototypes/
│   └── {feature-name}/
│       ├── ui-concept-{variant-slug}.html         # Phase 1: One HTML file per chosen variant (browser-openable)
│       └── ui-concept-{variant-slug-2}.html       # Phase 1: Additional variant
└── .prototype/
    └── {feature-name}/
        ├── state.json                             # State tracking (agent creates this)
        ├── intake.md                              # Phase 0 output: Structured intake summary
        ├── capture.md                             # Phase 0b output: Source capture summary (clone/hybrid only)
        ├── source-capture/                        # Phase 0b output directory (clone/hybrid only)
        │   ├── desktop.png                        #   Desktop screenshot (1440x900)
        │   ├── mobile.png                         #   Mobile screenshot (390x844)
        │   ├── snapshot.json                      #   DOM snapshot
        │   ├── tokens.json                        #   Extracted computed-style design tokens
        │   ├── assets.json                        #   Image/font/stylesheet URLs from the page
        │   └── states/                            #   Optional interactive state screenshots
        │       └── {state-name}.png
        └── qa-log.md                              # OPTIONAL: Q&A log (only if user opts in)
```

HTML prototype files are saved to the **visible** `prototypes/{feature-name}/` directory (not inside `.prototype/`) so they are easy to locate, share, and double-click. State and internal artifacts (including source captures) remain in `.prototype/{feature-name}/`.

## Phase Flow & State Management

### Phase Mapping

| `current_phase` | Maps to `phase_status` key | Phase Guide | Meaning |
|-----------------|----------------------------|-------------|---------|
| `"0"` | `intake` | `phases/00-intake.md` | Mode fork + intake interview + (greenfield: variant proposal) |
| `"0b"` | `capture` | `phases/00b-capture.md` | Chrome DevTools MCP page capture + variant proposal (clone/hybrid only) |
| `"1"` | `ui_concepts` | `phases/01-ui-concept.md` | Token resolution + HTML generation + iteration loop |
| `"completed"` | — | — | All selected variants generated and user explicitly confirmed they are done |

Phase 0b is only visited when `intake.mode` is `"clone"` or `"hybrid"`. For `"greenfield"` mode, transitions are `0 → 1 → completed`.

The detection / resume sequence is covered in [Invocation Flow](#invocation-flow) — read state, run the MCP probe, branch on whether state exists.

### Phase Transitions

**Default rule:** Do not auto-advance phases. After finishing a phase, save the artifact, update state, and ask the user before moving on.

**Exception — Phase 0 → 0b (clone/hybrid):** Once the PM chose clone or hybrid mode and provided a source URL, transition automatically to Phase 0b. The PM's URL is the confirmation. No "ready to advance?" prompt.

**Exception — Phase 0 → 1 (greenfield):** Once the user has explicitly selected variants from the proposal, that selection IS the confirmation. Skip the "ready to advance?" prompt and start Phase 1 by reading `phases/01-ui-concept.md`.

**Exception — Phase 0b → 1:** Once Phase 0b completes successfully AND variants are selected (the variant proposal happens at the end of Phase 0b for clone/hybrid mode), transition automatically to Phase 1. The variant selection is the confirmation.

**Phase 1 completion:** After all selected variants are generated, present the full set and enter the iteration loop. Only set `current_phase: "completed"` when the user explicitly says they are done (Step D of the phase guide).

**Re-entry after `completed`:** A project can leave the terminal state if the user returns and asks for a new variant or an adjustment. In that case:
- Append any new variants to `variants[]` with `status: "pending"`
- Set `current_phase` back to `"1"` and `phase_status.ui_concepts` back to `"in_progress"`
- Run the relevant Step B/D loop in the phase guide
- Re-mark `current_phase: "completed"` once the user is done again
- A re-entry does NOT re-run Phase 0b — existing `source-capture/` artifacts are reused. Only re-run Phase 0b if the PM explicitly asks to re-capture the page.

## Phase Reference Guides

The agent should read these files from the skills directory for detailed methodology:

- **Phase 0 (Intake):** Read `phases/00-intake.md` — mode fork (greenfield/clone/hybrid), source-URL question, intake interview, styling question, variant proposal logic, intake.md output format
- **Phase 0b (Capture):** Read `phases/00b-capture.md` — Chrome DevTools MCP capture sequence, login detection, screenshot/snapshot/token extraction, capture.md output format. Only consulted when `intake.mode` is `clone` or `hybrid`.
- **Phase 1 (UI Concepts):** Read `phases/01-ui-concept.md` — design token resolution (brand tokens / brand questions / defaults / captured paths), parallel subagent dispatch, iteration loop
- **Chrome DevTools MCP Reference:** Read `guides/chrome-devtools-mcp.md` — all Chrome DevTools MCP tools used during capture, exact tool parameters, design-token extraction script, authentication patterns (attached browser flow for SSO pages), token mapping rules, failure handling. Read this before calling any `chrome-devtools` MCP tool.

## Resuming Work

The detection and reconcile logic for resumed projects is covered in [Invocation Flow](#invocation-flow). This section only covers the resume **UX**.

When resuming, announce context succinctly:

```
"Resuming Prototype for '{feature_name}'. Currently in Phase {N}: {phase_name}."
```

If the user invokes `@prototype` without a feature name, list available projects by scanning the `.prototype/` directory:

```
User: "@prototype"
Agent: "Found existing Prototype projects in this workspace:
        1. campaign-approval-flow (Phase 1: UI Concepts — 2 of 3 variants generated)
        2. offer-builder (Completed — 4 variants)

        Which would you like to continue with, or would you like to start a new one?"
```

If the `.prototype/` directory doesn't exist or is empty, treat the invocation as a new project and start Phase 0.

## Agent Instructions Summary

### Per-Invocation Checklist

The full ordering (feature name → state → MCP probe → branch on new vs resumed) is in [Invocation Flow](#invocation-flow). Once the project is loaded and the current phase is known, every invocation must:

1. **Load the phase guide:** read `phases/{N}-*.md` for the current phase
2. **Load workspace artifacts:** read `intake.md`, `DESIGN.md` as relevant for the current phase
3. **Execute phase:** follow methodology from the phase guide
4. **Save artifacts:** write to the paths defined in the [Workspace Artifact Structure](#workspace-artifact-structure)
5. **Update Q&A log (if enabled):** if `context.save_qa_log` is `true`, append the conversation's Q&A to `qa-log.md`
6. **Update state:** write the updated `state.json` after every significant action (phase transitions, variant generation, iteration step)
7. **Ask for confirmation before advancing phases** (exception: 0 → 1 after variant selection is the confirmation)

### Never Do

- ❌ Auto-advance phases without user confirmation (exceptions: 0 → 0b after clone/hybrid mode chosen; 0 → 1 after variant selection; 0b → 1 after variant selection)
- ❌ Skip state updates
- ❌ Assume phase without reading state
- ❌ Create artifacts without proper workspace paths
- ❌ Forget to load context when resuming
- ❌ Generate a `.canvas.tsx` file — this skill produces HTML only
- ❌ Write HTML files directly from the orchestrator — always delegate to `prototype-builder` subagents
- ❌ Batch multiple intake questions in a single message during Phase 0 — ask one and wait for the answer before asking the next
- ❌ Spawn more than 5 `prototype-builder` subagents concurrently — if `variants[]` has more than 5 entries with `status: "pending"` (e.g. accumulated through the iteration loop), batch them 5 at a time
- ❌ Regenerate all variants when the user only requests a change to one specific variant
- ❌ Re-fetch the same MCP resource within a session — resolve tokens once into `DESIGN.md`, capture each URL once into `source-capture/`, and reuse from those caches for the rest of the session
- ❌ Proceed to subagent dispatch if DESIGN.md tokens are not yet established
- ❌ Save HTML files inside `.prototype/` — HTMLs go in `prototypes/{feature-name}/`; only state/internal artifacts go in `.prototype/`
- ❌ **(Capture)** Run Phase 0b for greenfield mode — Phase 0b is only for clone or hybrid
- ❌ **(Capture)** Skip the Chrome DevTools MCP availability check when the PM picks clone/hybrid mode — surface the setup offer if it's not connected
- ❌ **(Capture)** Capture a page that returns a login screen — detect, surface to the PM, and offer the attached-browser flow or a fallback
- ❌ **(Capture)** Attempt to log in programmatically on the source page — credentials are the PM's responsibility via the attached-browser pattern
- ❌ **(Capture)** Re-call Chrome DevTools MCP tools when the source URL hasn't changed and `source-capture/` already exists — reuse the cache
- ❌ **(Capture)** Use real captured content (names, emails, account numbers, etc.) in the generated prototypes — always swap for domain-realistic mock data
- ❌ **(Hybrid mode)** Treat captured tokens as canonical — brand/default tokens win; captures are visual reference only

### Always Do

- ✅ Extract feature name first
- ✅ Detect any URL in the invocation and pre-populate `intake.source_url`
- ✅ Read state from `.prototype/{feature-name}/state.json`
- ✅ Save all artifacts to workspace
- ✅ Update state after significant actions
- ✅ Log all Q&A exchanges to `qa-log.md` immediately (if enabled)
- ✅ Ask user before phase transitions (except 0 → 0b, 0 → 1, and 0b → 1 — each has explicit confirmations built into the prior step)
- ✅ Load phase guides for detailed methodology
- ✅ Use workspace-relative paths for all artifacts
- ✅ Resolve design tokens once and reuse across all variant HTMLs
- ✅ Delegate all HTML generation to `prototype-builder` subagents — never write HTML directly
- ✅ Spawn all pending variants in parallel in a single batch of parallel subagent calls (capped at 5 per batch)
- ✅ Parse the `PROTOTYPE_RESULT` block from each subagent before updating state
- ✅ Present clickable `file://` links (from subagent `file_url` results) after all subagents complete
- ✅ Run the Chrome DevTools MCP availability check when (and only when) the PM picks clone/hybrid mode or invokes with a URL
- ✅ Offer the MCP setup flow (with config instructions) if the Chrome DevTools MCP is not registered or unreachable
- ✅ Handle Chrome DevTools MCP failures gracefully — offer retry, attached-browser pattern, different URL, or greenfield fallback
- ✅ Use the `variants[]` array in state to track per-variant generation status
- ✅ In Phase 0b: cache the full capture in `source-capture/` and reuse across all variants AND the iteration loop
- ✅ Pass `SOURCE_CAPTURE` in the subagent brief for clone/hybrid mode (`null` for greenfield)

## Quality Standards

Top-level standards every Prototype project must meet. Each phase guide has a detailed checklist at the bottom — these summary criteria cross-cut all phases.

- **Intake:** `intake.mode` is set; all 4 content fields populated (`idea`, `who`, `key_action`, `core_data`); for clone/hybrid mode, `intake.source_url` is set and validates as a URL
- **Capture (clone/hybrid only):** `source-capture/desktop.png`, `mobile.png`, `snapshot.json`, `tokens.json`, `assets.json` all present and non-empty; `capture.md` written; no login screen captured
- **Variants:** `variants[]` has at least 1 entry with `status: "pending"` before Phase 1 starts
- **DESIGN.md:** Valid YAML frontmatter with all required token keys; present at workspace root before any HTML is generated; for `captured` design system, includes `source_url` in frontmatter
- **HTML prototypes:** Fully self-contained; open in any browser with no setup; domain-realistic mock data (NEVER real captured data); primary action interactive; correct design tokens applied
- **Clone-mode prototypes:** First variant labelled "Faithful recreation" matches the source page's structure at a glance

For the per-phase exit checklists, see:
- `phases/00-intake.md` — Phase 0 quality gate
- `phases/00b-capture.md` — Phase 0b quality gate (clone/hybrid only)
- `phases/01-ui-concept.md` — Phase 1 quality gate
