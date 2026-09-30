# Phase 4 — Sync (optional)

Skip this phase entirely if the user only wanted tests and a local report.

This phase is tool-neutral. Use whatever CLI or MCP is available for the user's issue tracker or Git host (for example `gh`, `glab`, or a tracker integration). If none is available, hand the drafts to the user to paste. This skill drafts the payload; every write happens only after the user confirms.

If the tracker does not render Markdown, convert drafts to its native markup before writing. Do not paste Markdown or mermaid fences into a tracker that does not render them.

## Step 1: Ask what to share

```
"Do you want me to share these results? Options:
  1. Attach the run report to an issue or pull request
  2. Draft defect tickets for the failed cases
  3. Both
  4. Nothing — stop here"
```

Stop the skill if the answer is nothing. Only after that answer, if they chose 4: set `phase_status.sync` to `skipped` and `current_phase` to `"completed"`.

Ask which tracker/Git host and which project, repo, or issue key to use if not already known.

## Step 2: Attach the report

1. Show the exact attachment path (`run-report.md`) and the target issue or PR.
2. Draft a **short** summary comment (counts only). Do not paste the full report into a comment.
3. Show the **exact command or tool call** with the real target and path substituted.

   Example summary:

   ```
   QA automation run
   Passed: 8
   Failed: 1 (application defects)
   Blocked: 2
   Report: attached run-report.md
   ```

4. **Wait for explicit confirmation.** Then run only what was displayed. Attach the report file; do not paste it into a comment.

## Step 3: Draft defects

One ticket per **application defect** (`fail`). Never file a ticket for a `blocked` case caused by environment or missing test ids — those are follow-ups for the team, not product defects.

For each draft include:

- Summary — the user-visible failure, not the test name
- Steps to reproduce — the case steps from `plan.md`
- Expected and actual result
- Evidence — screenshot or trace path
- Reference — the `QA-00N` id and the acceptance criterion

Present every draft **and** the exact create command. Wait for explicit confirmation **once per ticket**, not once for the batch. After create succeeds, attach evidence if a screenshot/trace file exists and the tracker supports attachments.

## Step 4: Record and finish

Ask to mark the skill complete. **Only after confirmation:** write the created issue keys and the attachment target into `state`, set `phase_status.sync` to `completed`, and `current_phase` to `"completed"`.

Report what was created, with links.

## Guardrails

- Never write to the tracker without showing the exact command/payload and receiving confirmation.
- Never file a defect for a blocked or flaky case.
- Never attach screenshots that contain credentials, tokens, or unmasked personal data.
- Never transition an existing issue's status. Reporting results is not a workflow decision.
