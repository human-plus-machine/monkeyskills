---
name: browser-mcp
description: How this skill observes a live application before writing locators. Uses Chrome DevTools MCP if the user has configured it, otherwise falls back to Playwright MCP if registered. Otherwise codegen.
---

# Browser Observation

Locators are only written after the real page has been observed. This guide decides **how** the skill sees the page.

This skill uses the **Chrome DevTools MCP** if the user has configured it, and otherwise falls back to **Playwright MCP** if that is registered (then codegen, Step 4). Neither is installed by this skill.

To configure Chrome DevTools MCP, add this server to your MCP config (Claude Code: `.mcp.json` or `claude mcp add`; Cursor: `~/.cursor/mcp.json`), then restart the agent/IDE:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

## Step 1: Probe, in this order

| Priority | Server | When to use |
|---|---|---|
| 1 | **Chrome DevTools MCP** (`chrome-devtools` / `user-chrome-devtools`) | When the user has configured it; also the documented attach flow for signed-in Chrome (`--browser-url=http://127.0.0.1:9222`) |
| 2 | **Playwright MCP** (`Playwright` / `user-Playwright`) | Fallback: only if it is registered and its tools list successfully — snapshots map cleanly onto Playwright locators |
| 3 | **None** | Fall back to user-recorded codegen (Step 4) |

Probe by listing the tools on each server. Write the outcome to `context.browser_mcp` as `playwright`, `chrome-devtools`, or `none`.

Pick **one** server for the whole feature. Do not drive two browsers in one session.

If a server is registered but its tools fail to list, treat it as unavailable and fall through to the next option.

## Step 2: Open the application

Navigate to `context.env_url` and wait for the application to be interactive — the target screen is present, not a spinner, login redirect, or error page.

Before reading any element, confirm the screen is the one the case is about. Reading a login page and calling its fields "the checkout form" is the most common cause of wrong locators.

## Step 3: Authenticated pages

**The skill never types credentials and never automates a login form on the user's behalf.**

For a page behind sign-in, the user signs in and the skill attaches to that session:

1. The user quits Chrome completely.
2. The user starts Chrome with remote debugging on a dedicated profile:

```bash
# Windows (PowerShell)
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:USERPROFILE\.chrome-debug-profile"

# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile"

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug-profile"
```

3. The user signs in to the target application in that window.
4. The skill attaches to the running browser:
   - Playwright MCP — connect to the existing browser over CDP at `http://127.0.0.1:9222` if the server supports it
   - Chrome DevTools MCP — configure it with `--browser-url=http://127.0.0.1:9222`

When the URL looks internal or SSO-gated, offer this setup **before** navigating, rather than capturing a login screen and continuing.

For public pages with no sign-in, an isolated browser profile is fine and preferred.

Observing an authenticated page this way does not make the generated suite runnable unattended. Phase 2 handles reusable session state for that.

## Step 3b: Keep snapshots small

A full-page accessibility snapshot of an enterprise screen can run to thousands of nodes. Every one of those nodes is read before the next decision, so an unscoped snapshot is the single largest cause of slow authoring.

Do this instead:

1. Snapshot once to locate the **region** the cases live in (form, dialog, table, panel).
2. From then on, snapshot **that region only** when the MCP supports a scoped or element-ref snapshot.
3. Read the returned tree once and write down every locator you need from it. Do not re-snapshot to confirm a locator you already have evidence for.
4. Prefer an accessibility snapshot over a screenshot. Screenshots cost more and cannot be read for names or roles.

Re-snapshot only after a real state transition: a new route, dialog, tab, iframe, or changed virtualized content.

If a snapshot comes back too large to work with, narrow the scope — open the specific dialog, filter the table, or collapse unrelated panels. Do not page through the whole tree.

## Step 4: No MCP available

Do not guess selectors. Ask the user for one of these:

1. **Recorded flow** — the user runs `npx playwright codegen {env_url}`, performs the flow, and pastes the generated code. Treat the pasted locators as observed, then improve them against `guides/locator-strategy.md` priority.
2. **Accessibility snapshot or DOM extract** for the specific screen.
3. **Known test ids** — the user supplies the `data-testid` values for the controls in scope.

Until one arrives, authoring is blocked. Say so directly:

```
"I can't see the running app — no browser MCP is available. To write locators
I need one of: a `npx playwright codegen {env_url}` recording, a snapshot of
the screen, or the test ids for these controls. Which is easiest for you?"
```

Setting up an MCP server is a user action outside this skill. Offer it, do not attempt it.

## What not to do

- Do not extract design tokens, computed styles, or full-page screenshots for visual design — that is `@prototype`, not this skill.
- Do not screenshot or log pages containing credentials or unmasked personal data.
- Do not treat a cached snapshot from an earlier phase as current after the application has been redeployed.
