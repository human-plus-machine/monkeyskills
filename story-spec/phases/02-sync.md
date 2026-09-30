# Phase 2 — Tracker sync (optional)

Skip this phase if the user only wanted a draft.

This phase is tool-neutral. Use whatever CLI or MCP is available for the user's issue tracker (for example `gh issue`, `glab issue`, or a Jira, Linear, or other tracker integration). If none is available, hand the finished draft to the user to paste. The chat draft is Markdown; convert it to the tracker's native markup if it does not render Markdown.

1. Ask which tracker, project/repo, and issue type to use if not already known.
2. Create an isolated temporary work directory. Keep every generated artifact there and register cleanup immediately:

   ```bash
   WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/story-spec.XXXXXX")" || exit 1
   MERMAID_SOURCE="$WORK_DIR/diagram.mmd"
   DIAGRAM_PNG="$WORK_DIR/diagram.png"
   BODY="$WORK_DIR/body.txt"
   PUPPETEER_CFG="$WORK_DIR/puppeteer.json"
   cleanup() {
     rm -f -- "$MERMAID_SOURCE" "$DIAGRAM_PNG" "$BODY" "$PUPPETEER_CFG"
     rmdir "$WORK_DIR" 2>/dev/null || true
   }
   trap cleanup EXIT
   ```

3. Map sections: Summary becomes the title; remaining sections become the body. Complexity becomes a label or estimate field if the tracker has one. Dependencies become linked issues only when those issues exist. Convert to the tracker's markup if needed, write the complete body to `$BODY`, then run `test -s "$BODY"`. Stop before any write if the file is missing or empty.
4. If the tracker does not render Mermaid, write the unfenced source to `$MERMAID_SOURCE` and render it locally:

   ```bash
   render_mermaid() {
     if command -v mmdc >/dev/null 2>&1; then
       mmdc -i "$MERMAID_SOURCE" -o "$DIAGRAM_PNG" "$@"
     else
       npx --yes @mermaid-js/mermaid-cli@10.9.1 \
         -i "$MERMAID_SOURCE" -o "$DIAGRAM_PNG" "$@"
     fi
   }
   if ! render_mermaid; then
     CHROME=""
     for candidate in \
       "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
       "/usr/bin/google-chrome" \
       "/usr/bin/chromium" \
       "/usr/bin/chromium-browser"; do
       if [ -x "$candidate" ]; then CHROME="$candidate"; break; fi
     done
     if [ -z "$CHROME" ]; then
       echo "Mermaid render failed: Chromium is not installed and no system Chrome was found." >&2
       exit 1
     fi
     printf '{"executablePath":"%s","args":["--no-sandbox"]}\n' "$CHROME" > "$PUPPETEER_CFG"
     render_mermaid -p "$PUPPETEER_CFG"
   fi
   test -s "$DIAGRAM_PNG"
   ```

   `npx` does not always download Puppeteer's Chromium; if render fails, retry with a local Chrome/Chromium via `-p puppeteer.json`. Do not send diagram source to a third-party rendering service. If rendering still fails or the PNG is empty, show the error and stop before any tracker write; the exit trap removes temporary artifacts.
5. Reference the diagram in `$BODY` with the tracker's image syntax and attach `$DIAGRAM_PNG`.
6. Show the **exact command or tool call** with the actual project, type, title, issue key, and temporary paths substituted, before running it. Include any agreed labels, estimate field, or links in the displayed payload.
7. **Wait for explicit confirmation.** After confirmation, run only the displayed create or edit call. Capture the returned issue key for a create, then run the attachment step if the tracker supports it.
8. Verify the updated issue renders headings, tables, and the diagram, and that the attachment exists.
9. Run `cleanup` and then `trap - EXIT`. Cleanup also runs automatically on errors or interruption.

## Markup conversion

Chat drafts are Markdown. If the tracker uses different markup, convert headings, bold, inline code, code fences, and tables to its native syntax. Do not paste Markdown or a Mermaid fence into a tracker that does not render them. Avoid literal `{...}` placeholders in prose when the tracker treats braces as macros; use concrete examples or plain text.
