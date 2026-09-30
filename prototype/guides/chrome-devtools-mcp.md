---
name: chrome-devtools-mcp
description: Reference guide for using the Chrome DevTools MCP within the Prototype skill. Covers setup (npx and attached-browser modes), the exact tools used during Phase 0b capture, parameter shapes, the design-token extraction script, authentication patterns for SSO-gated pages, and failure handling.
---

# Chrome DevTools MCP Guide

## Overview

The Chrome DevTools MCP gives the Prototype skill the ability to drive a real Chrome browser to capture a live URL — screenshots at desktop and mobile breakpoints, an accessibility-tree snapshot, computed-style design tokens, and the asset URLs the page actually loads. Phase 0b uses this MCP to turn a PM-supplied URL into the `source-capture/` artifact set that seeds Phase 1.

**MCP server name (as registered in your MCP config):** `chrome-devtools` (some clients prefix it, for example `user-chrome-devtools`; tool names may carry that prefix)
**Package:** [`chrome-devtools-mcp`](https://www.npmjs.com/package/chrome-devtools-mcp)

---

## Setup

The MCP server runs Chrome locally on the PM's machine. There are two run modes — pick one based on whether the target URL is public or behind login.

### Mode A: `npx` with isolated profile (default — public URLs)

Use this for any publicly reachable URL. The MCP launches a clean Chrome instance per session.

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated", "--viewport=1440x900"]
    }
  }
}
```

Useful flags:

| Flag | Purpose |
|------|---------|
| `--isolated` | Fresh Chrome profile per run (recommended — no cookie/session leakage) |
| `--viewport=1440x900` | Default viewport size; Phase 0b overrides per breakpoint via `resize_page` |
| `--headless=true` | Run Chrome without a visible window (faster, but harder to debug) |
| `--channel=stable\|canary\|dev` | Pick a Chrome channel |

After updating MCP config, the PM must restart their IDE for the server to register.

### Mode B: Attached browser (SSO / internal pages)

When the target URL is behind login, the PM must start their own Chrome with remote debugging enabled and have the MCP attach to it. This is the only supported way to capture authenticated pages — the skill must NOT attempt to log in programmatically.

**PM setup (one-time per capture session):**

1. Quit Chrome completely.
2. Start Chrome from a terminal with remote debugging on:

```bash
# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile"

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug-profile"

# Windows (PowerShell)
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:USERPROFILE\.chrome-debug-profile"
```

3. Sign in to whatever the target page requires.

**MCP config (point at the running Chrome):**

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
    }
  }
}
```

The orchestrator should still start by calling `list_pages` and either selecting an existing tab on the target URL or opening a new one with `new_page` — the PM's authenticated session carries over because the profile is shared.

---

## Available Tools (used by Phase 0b)

Phase 0b uses a small subset of the MCP. These are the only tools the orchestrator should call during capture:

| Tool | Purpose | Used in Step |
|------|---------|--------------|
| `list_pages` | Enumerate open tabs (attached-browser mode) | Step 0 (attached only) |
| `select_page` | Make an already-open tab the active one (by index from `list_pages`) | Step 0 (attached only) |
| `new_page` | Open a new tab at the source URL | Step 1 (alternative to `navigate_page`) |
| `navigate_page` | Navigate the active tab to a URL | Step 1 |
| `wait_for` | Wait for distinctive text to appear before capturing | Step 1 |
| `evaluate_script` | Run JS in the page (login detection + token extraction) | Step 1 (login check), Step 5 |
| `resize_page` | Set viewport dimensions for desktop/mobile capture | Steps 2, 3 |
| `take_screenshot` | Save a PNG of the current viewport or full page | Steps 2, 3, 7 |
| `take_snapshot` | Capture the a11y tree (returns `uid`s for interactions) | Step 4, before any state capture |
| `list_network_requests` | List images / fonts / stylesheets the page loaded | Step 6 |
| `hover` | Hover an element by `uid` (state captures) | Step 7 |
| `click` | Click an element by `uid` (state captures) | Step 7 |

Other tools the MCP provides (`fill`, `fill_form`, `type_text`, `press_key`, `drag`, `lighthouse_audit`, `performance_*`, `take_memory_snapshot`, `emulate`, `upload_file`, dialog/console helpers) are **not used during prototype capture** — Phase 0b is read-only on the source page.

---

## Step-by-Step Usage in Phase 0b

### 0. (Attached-browser mode only) Discover or open the target tab

```
tool: list_pages
arguments: {}
```

If a tab on the source URL already exists, note its index and call `select_page` with that index. Otherwise:

```
tool: new_page
arguments:
  url: "{intake.source_url}"
```

In `npx --isolated` mode, skip this step entirely and go straight to `navigate_page`.

---

### 1. Navigate and wait for the page to settle

```
tool: navigate_page
arguments:
  type: "url"
  url: "{intake.source_url}"
```

> **Important:** `navigate_page` requires the `type` field. For URL navigation it must be `"url"`. The other valid values are `"back"`, `"forward"`, and `"reload"`.

Wait for distinctive content. `wait_for` takes a list of strings — it resolves when ANY appears in the page's text.

```
tool: wait_for
arguments:
  text: ["{distinctive heading from the PM}", "{another fallback string}"]
  timeout: 10000
```

If the PM didn't volunteer a distinctive string, use generic fallbacks pulled from `intake.idea` — words from the feature description that are likely to appear. If `wait_for` times out, continue anyway and log the timeout in `capture.md`.

**Login screen detection** (run before any capture):

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

> **Important:** `evaluate_script` takes a `function` parameter — a JavaScript **function declaration** (arrow function or `function() {}`), NOT a free-form expression. The MCP wraps the result and returns it as JSON.

If `looksLikeLogin: true`, stop capturing and follow the [Authentication-Failure Flow](#authentication-failure-flow) below.

---

### 2. Desktop capture (1440×900)

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

> **Important:**
> - The parameter is `fullPage` (camelCase), not `full_page`.
> - Use `filePath` to write directly to disk — otherwise the PNG comes back as base64 in the response, which is wasteful and harder to handle.

---

### 3. Mobile capture (390×844)

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

Restore the desktop viewport before continuing (so subsequent snapshots and state captures match the primary screenshot):

```
tool: resize_page
arguments:
  width: 1440
  height: 900
```

---

### 4. DOM snapshot (a11y tree)

```
tool: take_snapshot
arguments:
  filePath: "{abs}/.prototype/{feature-name}/source-capture/snapshot.json"
```

> **Important:** This is an accessibility-tree snapshot, not a raw DOM dump. Each node has a `uid` that can be passed to `click`, `hover`, `evaluate_script` (via `args`), and the element form of `take_screenshot`. Always take a fresh snapshot before any interaction in Step 7 — `uid`s are tied to the most recent snapshot.

For deeper hierarchy when the default snapshot is too sparse, pass `verbose: true`. Default is enough for most pages.

---

### 5. Design token extraction

#### 5a. Why this exists

CSS custom properties only cover what the source site exposes — many production sites still use raw hex values inline or in compiled stylesheets. The script below combines two extraction paths:

1. **Computed styles** for representative elements (`body`, `h1`, `h2`, primary button, link, card, input) → reliable visual tokens
2. **CSS custom properties** declared on accessible stylesheets → captures design-system variables when present

#### 5b. Extraction script

Pass the script verbatim to `evaluate_script`:

```
tool: evaluate_script
arguments:
  function: |
    () => {
      const pick = (el, props) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const out = {};
        for (const p of props) out[p] = cs.getPropertyValue(p).trim();
        return out;
      };

      const visualProps = [
        'color', 'background-color', 'background',
        'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
        'border-color', 'border-radius', 'border-width', 'border-style',
        'box-shadow', 'padding', 'margin', 'gap'
      ];

      const findOne = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return el;
        }
        return null;
      };

      const primaryButton = findOne([
        'button[type=submit]',
        'button.primary, .btn-primary, .button--primary, [class*="primary"][class*="button"]',
        'a.button, a.btn, button',
        '[role=button]'
      ]);
      const link  = findOne(['main a[href]', 'a[href]:not([class*="button"])']);
      const card  = findOne(['article', '.card', '[class*="card"]', 'section']);
      const input = findOne(['input[type=text]', 'input[type=search]', 'input[type=email]', 'input:not([type=hidden])', 'textarea']);

      const customProperties = {};
      for (const sheet of Array.from(document.styleSheets)) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; /* cross-origin */ }
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (!rule.style) continue;
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith('--')) {
              customProperties[prop] = rule.style.getPropertyValue(prop).trim();
            }
          }
        }
      }

      return {
        url: location.href,
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight },
        body:           pick(document.body, visualProps),
        h1:             pick(document.querySelector('h1'), visualProps),
        h2:             pick(document.querySelector('h2'), visualProps),
        primaryButton:  pick(primaryButton, visualProps),
        link:           pick(link, visualProps),
        card:           pick(card, visualProps),
        input:          pick(input, visualProps),
        customProperties
      };
    }
```

Save the returned JSON to `.prototype/{feature-name}/source-capture/tokens.json`.

#### 5c. Mapping computed styles → DESIGN.md fields

When `intake.mode` is `"clone"` and `context.design_system` will be `"captured"`, Phase 1 Step A reads `tokens.json` and maps fields like this:

| DESIGN.md field | Source in `tokens.json` | Fallback |
|-----------------|-------------------------|----------|
| `colors.primary` | `primaryButton.background-color` (parse to hex) | `customProperties` lookup for `--primary`, `--brand`, `--color-primary` |
| `colors.secondary` | `link.color` (parse to hex) | Lighter shade of `colors.primary` |
| `colors.surface` | `body.background-color` | `#ffffff` |
| `colors.neutral` | `card.background-color` if differs from surface | `#f5f5f5` |
| `colors.on-surface` (text) | `body.color` | `#222222` |
| `colors.error` | `customProperties` lookup for `--error`, `--danger` | `#d32f2f` |
| `typography.body-md.fontFamily` | first font in `body.font-family` (strip quotes) | `system-ui` |
| `typography.body-md.fontSize` | `body.font-size` | `14px` |
| `typography.h1.fontFamily` | first font in `h1.font-family` | inherit body |
| `typography.h1.fontSize` | `h1.font-size` | `28px` |
| `typography.h1.fontWeight` | `h1.font-weight` | `700` |
| `rounded.md` | `card.border-radius`, else `primaryButton.border-radius`, else `input.border-radius` | `4px` |
| `spacing.md` | `card.padding` (median value if shorthand) | `16px` |

**Validation:**
- If `primaryButton.background-color` is `rgba(0, 0, 0, 0)` (transparent), fall back to `customProperties` then to a sensible neutral. Note the fallback in `capture.md`.
- If body text contrast against surface is < 4.5:1, darken the text by 20% and log a warning.
- If every element except `body` returned `null`, the page likely uses heavy shadow DOM or an unusual SPA — log a warning and lean on `customProperties` only.

---

### 6. Asset enumeration

```
tool: list_network_requests
arguments:
  resourceTypes: ["image", "font", "stylesheet"]
  pageSize: 200
```

> **Important:** The parameter is `resourceTypes` (camelCase). Valid values include `document`, `stylesheet`, `image`, `media`, `font`, `script`, `xhr`, `fetch`, plus the rest of the standard Chrome resource-type list — see the `list_network_requests` tool descriptor for the full enum.

Group the response by `resource_type` and save to `.prototype/{feature-name}/source-capture/assets.json`. The font URLs in particular are useful — Phase 1 can match captured fonts against Google Fonts when seeding `DESIGN.md`.

---

### 7. Optional interactive state captures (0–3 per page)

State captures are nice-to-have. Capture only what helps the PM evaluate the prototype — do not exhaustively iterate every element.

**Heuristic — capture at most one per category:**

| Trigger | Capture | When to attempt |
|---------|---------|-----------------|
| Hover over the primary CTA | Hover state | When the CTA's hover style is meaningfully different (find via the `primaryButton` element from Step 5) |
| Click a menu / dropdown trigger | Open state | When a `<button aria-haspopup>` or visible disclosure exists |
| Click an alternate tab | Alt panel | When the page has a tab control (`role=tab`) |
| Trigger a modal | Modal open | Only if `intake.key_action` mentions modal / dialog behavior |

**Always take a fresh `take_snapshot` immediately before each interaction** — `uid`s expire when the DOM changes.

```
tool: take_snapshot

# Find the primary CTA's uid in the snapshot, then:

tool: hover
arguments:
  uid: "{uid_from_snapshot}"

tool: take_screenshot
arguments:
  format: "png"
  filePath: "{abs}/.prototype/{feature-name}/source-capture/states/cta-hover.png"
```

For click-driven states (menu open, modal):

```
tool: click
arguments:
  uid: "{uid_from_fresh_snapshot}"
  includeSnapshot: true   # returns the post-click snapshot in the same call

tool: take_screenshot
arguments:
  format: "png"
  filePath: "{abs}/.prototype/{feature-name}/source-capture/states/menu-open.png"
```

If a state capture fails (element gone, no visible change, snapshot stale), skip it and continue. Log the skip in `capture.md` but do not abort the phase — these are supplementary.

---

## Authentication-Failure Flow

When Step 1's login-detection script returns `looksLikeLogin: true`, OR when the PM hits a login redirect mid-capture, surface this to the PM verbatim:

```
"That URL is gated by login — I caught {description: a password field / a sign-in title / an /sso/ redirect}.

I can't log in for you. You have three options:

1. Attach to your own Chrome — Quit Chrome, restart it with remote debugging
   on, sign in once, then I'll attach. (See guides/chrome-devtools-mcp.md
   § Mode B for the exact command for your OS.)
2. Try a different URL — A public page that shows the same pattern works
   just as well as visual reference.
3. Skip the capture — Fall back to greenfield mode and describe the screen
   instead."
```

If the PM picks (1):
- Wait for them to confirm the new Chrome is running and they're signed in.
- Update the MCP config (or ask them to) with `--browser-url=http://127.0.0.1:9222` and restart the IDE.
- Re-probe the MCP, then resume from Step 0 (attached-mode discovery).

If the PM picks (2): collect the new URL, validate, restart from Step 1.

If the PM picks (3): set `intake.mode: "greenfield"`, clear `intake.source_url`, set `context.chrome_mcp_enabled: false`, return to Phase 0's greenfield flow.

**Never attempt to fill the login form.** Credentials are the PM's responsibility and the skill has no safe place to store them.

---

## Failure Handling

Surface every failure to the PM — never silently fall back.

| Failure | Action |
|---------|--------|
| MCP server not reachable at all | Surface the setup offer from `SKILL.md` → *Chrome DevTools MCP Availability Check*. Do not start Phase 0b. |
| `navigate_page` times out / 4xx / 5xx | Report the status to the PM, ask whether to retry, try a different URL, or fall back to greenfield. |
| `wait_for` times out | Continue with the capture anyway; log the timeout in `capture.md` under Warnings. |
| Login screen detected | Run the [Authentication-Failure Flow](#authentication-failure-flow). Do not capture. |
| `take_screenshot` writes a < 5KB file | Treat as a blank-page failure. Re-attempt once after a 2s wait; if still tiny, abort and offer the same three fallback options as the auth flow. |
| `evaluate_script` returns `null` for every element except body | Continue capture; warn in `capture.md` that the page likely uses shadow DOM and tokens may be incomplete. Lean on `customProperties` for token recovery. |
| `list_network_requests` returns empty | Unusual but valid (e.g. an inlined-asset SPA). Save an empty `assets.json` and warn in `capture.md`. |
| `hover` / `click` fails (stale `uid`) | Take a fresh `take_snapshot` and retry once. If it still fails, skip that state capture. |
| Cross-origin stylesheet blocks `customProperties` extraction | The script catches and skips these — no action needed beyond noting it in `capture.md`. |

For every failure that completes capture in a degraded state, add a one-line entry to `capture.md`'s `## Warnings` section so the PM and Phase 1 are aware.

---

## Caching Rule

Capture each URL **once per session**. The orchestrator must reuse `source-capture/` artifacts across:
- All `prototype-builder` subagents in a Phase 1 batch
- Every iteration loop turn
- Re-entry after `current_phase: "completed"`

Re-run Phase 0b only when the PM explicitly asks to re-capture (e.g. "the page changed, recapture it" or "use a different URL").

---

## What NOT to Use During Capture

These tools exist on the MCP but should not be called during Phase 0b:

| Tool | Why not |
|------|---------|
| `fill`, `fill_form`, `type_text`, `press_key` | Capture is read-only — never type into the source page |
| `upload_file` | Same as above |
| `lighthouse_audit` | Heavy and slow; not needed for visual capture |
| `performance_start_trace` / `_stop_trace` / `_analyze_insight` | Performance is out of scope for prototyping |
| `take_memory_snapshot` | Out of scope |
| `emulate` | Use `resize_page` instead — viewport sizing is all Phase 0b needs |
| `handle_dialog` | If a dialog appears, it indicates an unexpected page state — surface to the PM rather than auto-dismissing |

If a future phase needs any of these (e.g. capturing a logged-in dashboard mid-flow), document the new use here before adding it to a phase guide.

---

## Quick Reference: Parameter Gotchas

The MCP's parameter naming differs from what feels natural — get these exact:

| Tool | ✅ Correct | ❌ Wrong |
|------|-----------|---------|
| `navigate_page` | `{ type: "url", url: "..." }` | `{ url: "..." }` |
| `wait_for` | `{ text: ["str", "str"] }` | `{ selector: "...", text: "..." }` |
| `take_screenshot` | `{ fullPage: true, filePath: "..." }` | `{ full_page: true, file_path: "..." }` |
| `evaluate_script` | `{ function: "() => { ... }" }` | `{ expression: "..." }` |
| `list_network_requests` | `{ resourceTypes: [...] }` | `{ resource_types: [...] }` |
| `click` / `hover` | `{ uid: "from-snapshot" }` | `{ selector: "..." }` |

Element-targeting tools (`click`, `hover`, element-form `take_screenshot`, `evaluate_script` with `args`) require a `uid` from a `take_snapshot` call — there is no CSS-selector form. Always snapshot first, find the `uid`, then act.
