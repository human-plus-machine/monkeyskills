---
name: capture
description: Phase 0b - Capture. Runs only when intake.mode is "clone" or "hybrid". Uses the Chrome DevTools MCP to drive a real Chrome browser, capture screenshots, DOM snapshot, design tokens, and assets from a live URL, then writes everything to .prototype/{feature-name}/source-capture/ so Phase 1 can build prototypes that match the source page's structure and visual language.
---

# Phase 0b: Capture

## Purpose

Convert a production URL into a structured set of artifacts the rest of the skill can consume: screenshots at desktop and mobile breakpoints, a DOM snapshot, an extracted design-token JSON, an asset URL list, and (optionally) interactive-state screenshots. This is the bridge between "the PM gave me a URL" and "I can prototype like a designer who actually saw the page".

This phase is **only** invoked when `intake.mode` is `"clone"` or `"hybrid"`. For `"greenfield"` mode, skip Phase 0b entirely and go straight from Phase 0 to Phase 1.

## When It Runs

- After Phase 0 (Intake) is complete
- `intake.mode` is `"clone"` or `"hybrid"`
- `intake.source_url` is populated
- `context.chrome_mcp_enabled` is `true` in state.json

## Prerequisites

Before starting, read:
- `{workspace}/.prototype/{feature-name}/state.json` — intake data, mode, source URL
- `{workspace}/.prototype/{feature-name}/intake.md` — feature context for the capture summary
- `guides/chrome-devtools-mcp.md` — **required** — read this before making any Chrome DevTools MCP tool call. It contains exact tool parameters, the design-token extraction script, authentication patterns, and failure handling.

If `guides/chrome-devtools-mcp.md` is not in the skills directory or cannot be read, abort Phase 0b with a clear error to the user and fall back to greenfield mode.

---

## Step 0: Pre-flight

Announce:

```
"Capturing {intake.source_url} now. I'll grab screenshots at desktop and mobile,
extract the design tokens, and snapshot the structure. This takes about
30-60 seconds."
```

If the URL looks like an internal / SSO-gated host (e.g. matches patterns like `*.internal.*`, `*.corp.*`, or otherwise hints at private infra), pause first:

```
"Heads up — that URL looks like it might be behind login. If it is, I need
you to start Chrome yourself with remote debugging on so I can attach to
your authenticated session. See guides/chrome-devtools-mcp.md for the
exact commands. Do you want me to wait while you set that up?"
```

Wait for confirmation before proceeding. If the PM confirms a public URL or the attached-browser setup is in place, continue.

---

## Step 1: Navigate & Wait

```
tool: navigate_page
arguments:
  type: "url"
  url: "{intake.source_url}"
```

After navigation, wait for the page to settle:

```
tool: wait_for
arguments:
  # list of strings; resolves when ANY appears in the page text
  text: ["{distinctive heading the PM mentioned}", "{fallback string from intake.idea}"]
```

If `wait_for` times out, take a snapshot anyway and continue. Note the timeout in `capture.md`.

**Login screen detection:** Before proceeding, run a quick check:

```
tool: evaluate_script
arguments:
  function: |
    () => {
      const hasPwdField = !!document.querySelector('input[type=password]');
      const title = document.title.toLowerCase();
      const url = location.href.toLowerCase();
      const looksLikeLogin = hasPwdField ||
        /\b(login|sign[\s-]?in|authenticate)\b/.test(title) ||
        /\/(login|signin|sso|auth)\b/.test(url);
      return { looksLikeLogin, title: document.title, url: location.href };
    }
```

If `looksLikeLogin: true`, follow the authentication-handling flow in `guides/chrome-devtools-mcp.md` (offer attached-browser setup, different URL, or greenfield fallback). Do not continue capturing.

---

## Step 2: Desktop Capture (1440×900)

```
tool: resize_page
arguments:
  width: 1440
  height: 900

tool: take_screenshot
arguments:
  format: "png"
  fullPage: true
  filePath: "{abs}/.prototype/{feature-name}/source-capture/desktop.png"
```

Save the screenshot to `.prototype/{feature-name}/source-capture/desktop.png`.

---

## Step 3: Mobile Capture (390×844)

```
tool: resize_page
arguments:
  width: 390
  height: 844

tool: take_screenshot
arguments:
  format: "png"
  fullPage: true
  filePath: "{abs}/.prototype/{feature-name}/source-capture/mobile.png"
```

Save to `.prototype/{feature-name}/source-capture/mobile.png`.

Restore desktop viewport before continuing:

```
tool: resize_page
arguments:
  width: 1440
  height: 900
```

---

## Step 4: DOM Snapshot

```
tool: take_snapshot
```

Save the returned structured snapshot to `.prototype/{feature-name}/source-capture/snapshot.json`.

---

## Step 5: Design Token Extraction

Run the full extraction script documented in `guides/chrome-devtools-mcp.md` § 5b. Pass it verbatim to `evaluate_script`:

```
tool: evaluate_script
arguments:
  function: |
    (full script — see guides/chrome-devtools-mcp.md § 5b)
```

The script returns an object with computed styles for `body`, `h1`, `h2`, `primaryButton`, `link`, `card`, `input`, and a `customProperties` map of all CSS variables defined on accessible stylesheets.

Save to `.prototype/{feature-name}/source-capture/tokens.json`.

**Validation:** If the script returns `null` for every element except `body`, the page is likely an unusual SPA or uses shadow DOM heavily. Continue, but log a warning in `capture.md` and rely on `customProperties` for token recovery.

---

## Step 6: Asset Enumeration

```
tool: list_network_requests
arguments:
  resourceTypes: ["image", "font", "stylesheet"]
```

Save the response (grouped by `resource_type`) to `.prototype/{feature-name}/source-capture/assets.json`.

---

## Step 7: Optional Interactive State Captures

Apply the heuristic from `guides/chrome-devtools-mcp.md` § 6:

- A primary CTA with a visible hover state → capture hover
- A dropdown / menu trigger → capture open state
- An accordion or tab control → capture an alternate panel
- If `intake.key_action` mentions modal behaviour → trigger the modal and capture

Aim for **0–3 supplementary state captures**. Do not exhaustively iterate every element.

For each state, save to `.prototype/{feature-name}/source-capture/states/{state-name}.png` and record the trigger (hover target, click target, wait condition) in `capture.md`.

If a state capture fails (selector not found, hover doesn't change anything), skip it and continue — these are nice-to-have, not required.

---

## Step 8: Write capture.md

Save a human-readable summary at `.prototype/{feature-name}/capture.md`:

```markdown
# Source Capture: {Feature Name}

## Source

- **URL:** {intake.source_url}
- **Captured:** {ISO8601 timestamp}
- **Page title:** {document.title from navigation}
- **Mode:** {intake.mode}

## Captures

- Desktop (1440×900): `source-capture/desktop.png`
- Mobile (390×844): `source-capture/mobile.png`
- DOM snapshot: `source-capture/snapshot.json`
- Extracted tokens: `source-capture/tokens.json`
- Assets: `source-capture/assets.json`
- State captures:
  {for each state: `- {label}: source-capture/states/{name}.png`}
  {if none captured: `- (none)`}

## Extracted Design Tokens (summary)

- Primary color: `{primaryButton.backgroundColor → hex}`
- Surface: `{body.backgroundColor → hex}`
- Body font: `{body.fontFamily}` @ `{body.fontSize}`
- H1 font: `{h1.fontFamily}` @ `{h1.fontSize}` / `{h1.fontWeight}`
- Border radius (md): `{card.borderRadius or primaryButton.borderRadius}`
- CSS custom properties found: `{count of customProperties entries}`

## Warnings

{Any failures, fallbacks, or anomalies encountered during capture. Examples:
- "h2 element not found — using h1 styles for both heading levels"
- "Cross-origin stylesheet at /vendor.css — CSS custom properties may be incomplete"
- "Contrast check failed — primary darkened from #5B8DEF to #3A6FE0"
- "(none)" if everything succeeded}

## Notes

{Optional free-form notes about the source page: layout structure observed,
dominant components, unusual patterns. The orchestrator writes these from
the snapshot for downstream context.}
```

---

## Step 9: State Update

After Phase 0b completes, update state.json:

```json
{
  "current_phase": "1",
  "phase_status": {
    "intake": "completed",
    "capture": "completed"
  },
  "context": {
    "chrome_mcp_enabled": true
  },
  "artifacts": {
    "capture_md": ".prototype/{feature-name}/capture.md",
    "source_capture_dir": ".prototype/{feature-name}/source-capture/"
  }
}
```

The Phase 1 design-token resolution logic uses `intake.mode` and the presence of `source_capture_dir` to decide whether to seed DESIGN.md from `tokens.json` (clone mode) or treat captures as visual reference only (hybrid mode).

---

## Step 10: Announce & Transition

After the capture is written:

**For `mode: clone`:**

```
"Capture complete. Here's what I pulled from {intake.source_url}:

  Desktop:        file://{abs_path}/source-capture/desktop.png
  Mobile:         file://{abs_path}/source-capture/mobile.png
  Extracted:      Primary color {primary_hex}, font {font_family}, radius {radius}
  States:         {N} additional state(s) captured

I'll use these to seed the design tokens and shape the variants.

{If any warnings:} ⚠ {one-line warning summary}

Continuing with variant proposal..."
```

**For `mode: hybrid`:**

```
"Capture complete. I'll use the screenshots as visual reference, but the
design tokens will come from {your provided brand tokens / neutral defaults / brand answers}
as you selected during intake.

  Desktop:        file://{abs_path}/source-capture/desktop.png
  Mobile:         file://{abs_path}/source-capture/mobile.png

{If any warnings:} ⚠ {one-line warning summary}

Continuing with variant proposal..."
```

Then either:

- **If variants were not yet selected during Phase 0** (the variant proposal was deferred until after capture for clone/hybrid mode): present the variant proposal now using both the intake answers AND the captured DOM structure as inputs.
- **If variants were already selected during Phase 0**: proceed directly to Phase 1.

No additional confirmation is needed for the 0b → 1 transition.

---

## Quality Standards

Before marking Phase 0b complete:

- [ ] `source-capture/desktop.png` exists and is > 5KB (not a blank page)
- [ ] `source-capture/mobile.png` exists and is > 5KB
- [ ] `source-capture/snapshot.json` exists and contains a non-trivial DOM tree
- [ ] `source-capture/tokens.json` exists and has at least `body` and `primaryButton` populated (or `body` plus a non-empty `customProperties` map)
- [ ] `source-capture/assets.json` exists (may be empty if the page used no external assets — unusual but valid)
- [ ] `capture.md` written with at least the Source, Captures, and Extracted Design Tokens sections filled in
- [ ] No login screen detected in the captured page
- [ ] state.json updated with `phase_status.capture: "completed"` and `artifacts.source_capture_dir`
- [ ] If any warnings occurred, they are documented in `capture.md` AND surfaced to the user

If any required artifact is missing or invalid, do not proceed to Phase 1 — surface the failure and offer the PM the choice to retry, switch to greenfield, or pick a different URL.
