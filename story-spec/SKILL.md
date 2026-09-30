---
name: story-spec
description: "Generates one engineering-ready issue-tracker story (scope, deps, repos, sizing, AC, regression checklist, diagram). Invoke with @story-spec."
version: 1.1.0
author: MonkeyMode Contributors
---

# Story Spec

## Intent

Turn a feature or task ask into **one** dev-ready story for your issue tracker: what to build, who else is affected, which repos/modules change, size, acceptance criteria, regression checks, and a flow diagram.

This skill is a **standalone utility**. It is not a MonkeyMode phase and must not write `.monkeymode/` state. It is narrower than `@scope` (multi-org blueprint) and `@monkeytriage` (full design to code). If `.scope/{feature}/blueprint.md` or `.monkeymode/{feature}/` design already exists, reuse it.

**Invoke:** `@story-spec for [feature/task]` or `@story-spec for [ISSUE-KEY]`.

**How to draft:** `templates/story.md`. Sizing: `references/sizing.md`.

## Workspace setup

Stateless. Keep the draft in chat (or a path the user names). Do not create a skill state directory or `state.json`. Do not write to the issue tracker until phase 2 confirmation.

## Phases

Run in order. Read each phase file before executing it.

| Phase | File | What to do |
|---|---|---|
| 0 Intake | `phases/00-intake.md` | Confirm task, project, issue type; reuse blueprint/existing issue if present |
| 1 Draft | `phases/01-draft.md` | Investigate code; fill `templates/story.md`; present for review |
| 2 Sync | `phases/02-sync.md` | Optional create/update in your issue tracker after explicit confirmation |

## Guardrails

- Never invent repo or team ownership. Ask if a sitemap/blueprint does not cover it.
- Never write to the issue tracker without showing the exact payload and getting explicit confirmation.
- Never mark regression coverage complete without naming real existing tests or suites.
- Do not create extra stories, epics, or `.monkeymode/` artifacts. One story per run.
- Do not nest a mermaid fence inside another markdown fence in the story body (see `templates/story.md`).
- Match the tracker's native markup. Many trackers do not render Markdown or Mermaid; convert the body and attach a rendered diagram image instead (phase 2).
- Never put literal `{...}` placeholders in prose destined for trackers that treat braces as macros. Use concrete examples or plain text.
