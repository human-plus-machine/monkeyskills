---
name: monkeymode-stack-detection-handoff
description: How @explore populates MonkeyMode detected_stack at handoff. Source of truth is MonkeyMode Phase 1A Step 0 — do not invent a parallel procedure.
---

# MonkeyMode stack detection at explore handoff

Required on **Handoff Path A (`@monkeytriage`)** before `state.json` is finalized. Skip for `@monkeyplan` Path E.

## Source of truth

Execute **MonkeyMode Phase 1A Step 0** (Codebase Analysis) from the installed skill:

- Installed: `{skill_dir}/monkeymode/phases/01a-design-discovery.md` (or `{skill_dir}/monkeymode/phases/01a-design-discovery.md`)
- Repo: `monkeymode/phases/01a-design-discovery.md` → **Step 0: Codebase Analysis**

That file owns the config-file table, cloud-provider rules, similar-module scan, and test/CI conventions. **Do not duplicate or invent a second detection checklist here.**

## What to write

Copy Step 0's `detected_stack` fields onto the handoff state (`templates/monkeymode-handoff-state.json` or `templates/monkeymode-lite-handoff-state.json`):

- `language`, `framework`, `framework_version`, `build_tool`, `test_framework`
- `cloud_provider`, `platform`, `platform_version`
- `platform_supplement_loaded`, `platform_supplement_warnings`

Leave a field `null` when it cannot be determined. Do not guess.

## Where to append conventions

- **Full:** append a `## Codebase Conventions` section to `.monkeymode/{feature-name}/design/1a-discovery.md` (Step 0 output).
- **Lite:** append the same section to `.monkeymode/{feature-name}/design.md`.

If the workspace has no detectable stack (empty repo, docs-only), keep `detected_stack` fields null and say so in the handoff announce — later MonkeyMode phases must still run Step 0 if values are missing.
