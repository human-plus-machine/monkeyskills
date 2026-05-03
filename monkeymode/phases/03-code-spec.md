---
name: code-spec-skill
description: Phase 3 - Code Spec. Orchestrator guide for spawning code-spec-writer subagents in parallel, collecting drafts, resolving open questions, getting user approval, and committing specs to disk.
---

# Phase 3: Code Spec — Orchestrator Guide

## Purpose

Orchestrate the creation of code specs for all user stories before Phase 4 begins. The orchestrator spawns `code-spec-writer` subagents (up to 10 in parallel) to investigate the codebase and draft specs. The orchestrator then resolves open questions, presents specs for user approval, and commits approved specs to disk.

## Per-Story Spec Instructions

The detailed spec-writing process (codebase investigation, task decomposition, function signatures, test case tables, quality checklist, anti-patterns) is provided to each `code-spec-writer` subagent via its prompt. The orchestrator spawns subagents using `subagent_type: "generalPurpose"` with the `code-spec-writer` system prompt via the Task tool.

## Parallel Execution — Orchestrator Workflow

Phase 3 runs as a **two-step pipeline across all stories**: subagents draft specs in parallel, then the orchestrator presents each draft to the user sequentially for approval before writing anything to disk.

The main agent acts as the **orchestrator** — it never writes specs directly. It spawns `code-spec-writer` subagents via the Task tool, collects their structured output, and manages the approval and commit flow.

### Architecture Overview

```
User
  |
  v
Orchestrator (main agent)
  |  - Reads state.json and user_stories.md
  |  - Builds self-contained prompts per story
  |  - Spawns up to 10 code-spec-writer subagents in parallel
  |
  |  ── Step 1: Drafting Pass (parallel, all stories at once) ──
  |---> code-spec-writer 1  -> Story A (investigates codebase, drafts spec)
  |---> code-spec-writer 2  -> Story B (investigates codebase, drafts spec)
  |---> ...up to 10        -> Story N (investigates codebase, drafts spec)
  |
  |  ── Step 2: Review Pass (sequential, one spec at a time) ──
  |  Orchestrator resolves open_questions with user
  |  Orchestrator presents each spec for approval
  |  Orchestrator writes approved spec to disk + updates state.json
  |
  v
All stories have status: "code_spec" and files_to_create/files_to_modify populated
  |
  v
Phase 4 (Implementation) — conflict detection uses the file lists
```

### Orchestrator Step-by-Step

#### Step O1: Collect Stories

Read `state.json`. Identify all stories that need code specs — status is `not_started` or `code_spec` not yet complete. This is typically every story from Phase 2.

If ZERO stories need specs, check whether all are already `code_spec` status and advance to Phase 4.

#### Step O2: Build Subagent Prompts

For each story, assemble a self-contained prompt containing:
- Full user story text (from `user_stories.md`)
- All acceptance criteria (from `2b-acceptance.md`)
- Paths to the three design docs (`1a-discovery.md`, `1b-contracts.md`, `1c-operations.md`)
- Language guidelines path (e.g. `guides/PYTHON-CODING-GUIDELINES.md`)
- Specific codebase reference files to investigate (similar services, repositories, test files — identified from Phase 1 design docs)
- Any conventions already confirmed in Phase 1 (or instruct subagent to discover them)
- Explicit out-of-scope items from the user story

Use the prompt template below.

#### Step O3: Spawn code-spec-writer Subagents (Parallel)

Launch one `code-spec-writer` subagent per story using the Task tool (`subagent_type: "generalPurpose"` — there is no registered `"code-spec-writer"` type; `generalPurpose` is correct). The subagent's system prompt comes from `subagents/code-spec-writer.md` — include its contents in the `prompt` parameter.

**CRITICAL RULES:**
- Launch all subagents in a **single message** (parallel tool calls)
- **Max 10 concurrent subagents** — if there are more than 10 stories, batch them 10 at a time; complete each batch before spawning the next
- Each subagent gets a **complete, self-contained prompt** — subagents have NO access to conversation history
- **Do NOT pass a `model` parameter** — omit it so subagents inherit the parent's model

#### Step O4: Collect Drafts and Resolve Open Questions

For each subagent result, read the **Structured Output JSON** at the end of the response:

```
spec_ready        true | false
files_to_create   list of file paths
files_to_modify   list of file paths
open_questions    list of { id, question, blocking, default_if_not_blocking }
```

**If `spec_ready: true`** — no blocking questions; present the spec draft to the user for approval.

**If `spec_ready: false`** — surface each `blocking: true` question to the user, collect answers, apply them to the draft, then present the updated spec for approval.

Non-blocking questions with defaults may be accepted as-is unless the user wants to override.

#### Step O5: Present Specs for User Approval (Sequential)

Even though drafting is parallel, present specs to the user **one at a time**. For each spec:
1. Show the full draft
2. Ask: "Approve this spec, or request changes?"
3. If changes requested → apply edits inline and re-present
4. On approval → proceed to O6

#### Step O6: Write Spec to Disk

After user approves a spec, write it to:

```
{workspace}/.monkeymode/{feature-name}/code_specs/{story-id}-spec.md
```

#### Step O7: Update state.json

After writing the spec file, update that story's entry:

```json
{
  "stories": {
    "story-1-example": {
      "status": "code_spec",
      "code_spec_path": ".monkeymode/{feature-name}/code_specs/story-1-spec.md",
      "files_to_create": [
        "src/example/service.py",
        "tests/example/test_service.py"
      ],
      "files_to_modify": [
        "src/example/__init__.py"
      ],
      "last_updated": "2024-01-15T14:30:00Z"
    }
  }
}
```

**Only update the story's own entry** — do not modify other stories or top-level fields.

**Why `files_to_create` and `files_to_modify`?** Phase 4 uses these lists for conflict detection when running stories in parallel. Stories that share files cannot be in the same batch. These lists must be complete and accurate before Phase 4 begins.

#### Step O8: Complete Phase

Once all stories have approved specs written to disk and `state.json` updated, confirm:
- Every story has `status: "code_spec"`
- Every story has `files_to_create` and `files_to_modify` populated (even if empty lists)

Then ask user: "All [N] code specs approved and saved. Ready to move to Phase 4 (Implementation)?"

#### Step O9: Handle Failures

If a `code-spec-writer` subagent fails or returns an unusable draft:
1. Log the error in state
2. Fall back: write that story's spec directly — read `subagents/code-spec-writer.md` for the methodology to follow
3. Continue processing other stories normally

### Subagent Prompt Template

Each subagent receives a self-contained prompt with all necessary story-specific context.

```
## Your Story

**Story:** {story_title}
**Story ID:** {story_key}
**Feature:** {feature_name}

## User Story Text

{paste full user story text from user_stories.md}

## Acceptance Criteria

{paste all acceptance criteria for this story from 2b-acceptance.md}

## Files to Read on Startup

Read ALL of these before writing the spec:

**Design context:**
- {workspace}/.monkeymode/{feature-name}/design/1a-discovery.md
- {workspace}/.monkeymode/{feature-name}/design/1b-contracts.md
- {workspace}/.monkeymode/{feature-name}/design/1c-operations.md
- {workspace}/.monkeymode/{feature-name}/stories/user_stories.md

**Language-specific coding guidelines (pick ONE):**
- Python: {skill_dir}/monkeymode/guides/PYTHON-CODING-GUIDELINES.md
- Java: {skill_dir}/monkeymode/guides/JAVA-CODING-GUIDELINES.md
- Angular: {skill_dir}/monkeymode/guides/ANGULAR-CODING-GUIDELINES.md
- .NET/C#: {skill_dir}/monkeymode/guides/DOTNET-CODING-GUIDELINES.md
- React: {skill_dir}/monkeymode/guides/REACT-CODING-GUIDELINES.md
- Terraform: {skill_dir}/monkeymode/guides/TERRAFORM-CODING-GUIDELINES.md

## Codebase References (Investigate These Before Planning)

Read these existing files to understand patterns you must follow:

{list of existing files to investigate — e.g. similar service, repository, test files.
 Be specific: include file paths identified from the Phase 1 design docs.}

## Conventions Seed (Pre-Filled by Orchestrator)

{Any conventions already confirmed in Phase 1, or "Discover from codebase references above."}

## Out of Scope

{Explicit out-of-scope items from the user story and design docs}
```

**CRITICAL:** Subagents do NOT write files or update `state.json`. They return a draft and structured JSON output. The orchestrator commits everything after user approval.

### Resuming Phase 3

If the session is interrupted during Phase 3:

1. **Read state.json** — check each story's status
2. Stories already `code_spec` → skip (spec committed and approved)
3. Stories still `not_started` → re-run subagents for those stories
4. Re-present any drafts that were collected but not yet approved
