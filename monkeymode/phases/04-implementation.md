---
name: implementation-skill
description: Guides the orchestration of Phase 4 implementation — parallel subagent spawning, conflict detection, batching, state management, and sequential fallback.
---
 
# Implementation Phase — Orchestrator Guide
 
## Purpose
Orchestrate the implementation of user stories from code specs into working, tested, production-ready code.

## Language-Specific Coding Standards

Before writing any code, load the appropriate coding guidelines from `guides/` based on `context.detected_stack` in state.json (populated during Phase 1A discovery). Guides load in three tiers: base language guide, then framework/cloud supplement, then any platform supplement. Later tiers take precedence where they conflict with earlier ones.

### Step 1: Load the base language guide

| Language | Base Guide | Key Standards |
|----------|-----------|---------------|
| Python | `guides/PYTHON-CODING-GUIDELINES.md` | PEP 8, Black (88 char), strict type hints, Clean Architecture, pytest, OWASP |
| Java | `guides/JAVA-CODING-GUIDELINES.md` | Google Java Style, generics, Javadoc, Clean Architecture, JUnit + Mockito + AssertJ, OWASP |
| Angular | `guides/ANGULAR-CODING-GUIDELINES.md` | Hyphenated files, TypeScript strict, feature-based dirs, signals, Jasmine/Karma, ESLint |
| .NET / C# | `guides/DOTNET-CODING-GUIDELINES.md` | Allman braces, PascalCase, Clean Architecture, xUnit + Moq + FluentAssertions, OWASP |
| React | `guides/REACT-CODING-GUIDELINES.md` | Server Components, hooks, React Compiler, Vitest/RTL, ESLint |
| Terraform | `guides/TERRAFORM-CODING-GUIDELINES.md` | `terraform fmt`, module structure, `terraform test`, tfsec/checkov |

### Step 2: Load the framework / cloud-provider supplement

Read `context.detected_stack.framework` (and `cloud_provider` for IaC) from state.json and load the matching supplement:

| Language + Framework | Supplement |
|---------------------|------------|
| Java + Spring Boot | `guides/JAVA-SPRING-BOOT-SUPPLEMENT.md` |
| Java + Quarkus | `guides/JAVA-QUARKUS-SUPPLEMENT.md` |
| Python + FastAPI | `guides/PYTHON-FASTAPI-SUPPLEMENT.md` |
| Python + Django | `guides/PYTHON-DJANGO-SUPPLEMENT.md` |
| Terraform + AWS (`cloud_provider: "aws"`) | `guides/TERRAFORM-AWS-SUPPLEMENT.md` |
| Terraform + GCP (`cloud_provider: "gcp"`) | `guides/TERRAFORM-GCP-SUPPLEMENT.md` |

If no supplement exists for the detected framework or cloud provider, follow the base guide plus established conventions found in the existing codebase.

### Step 3: Load any platform supplement

If `context.detected_stack.platform_supplement_loaded == true` (set during Phase 1A; the supplement is `guides/{PLATFORM}-PLATFORM-SUPPLEMENT.md`, see `guides/_PLATFORM-SUPPLEMENT-TEMPLATE.md` for the format), load it last. If `platform_supplement_loaded` is `false`, skip this step (never key on `platform != null` alone; re-surface any `platform_supplement_warnings`). Platform supplements take precedence over framework supplements, which take precedence over base guides.

### Other Languages

For languages without a dedicated guide, follow existing codebase patterns and industry best practices for that language.

## Per-Story Implementation Instructions

The detailed per-story implementation process (TDD loop, code quality standards, code review self-check, reporting format) is provided to each `implementer` subagent via its prompt. The orchestrator spawns `implementer` subagents (up to 10 in parallel) using `subagent_type: "implementer"` via your tool's subagent mechanism (e.g. the Task / subagent tool).

For detailed code examples and common patterns, see `guides/IMPLEMENTATION-PATTERNS.md`.
 
## Parallel Execution — Orchestrator Workflow

Phase 4 runs as a **two-step pipeline per batch**: test-writer subagents first, then implementer subagents. This enforces real TDD — tests are written and confirmed red before any implementation code exists.

The main agent acts as the **orchestrator** — it never writes tests or implementation code directly. It spawns `test-writer` and `implementer` subagents via your tool's subagent mechanism (e.g. the Task / subagent tool).

### Architecture Overview

```
User
  |
  v
Orchestrator (main agent)
  |  - Reads state.json, code specs, design docs
  |  - Detects file conflicts between stories
  |  - Batches independent stories (max 10 per batch)
  |
  |  ── Step 1: Test-Writer Pass (parallel per batch) ──
  |---> test-writer 1  -> Story A (writes test files, all red)
  |---> test-writer 2  -> Story B (writes test files, all red)
  |---> ...up to 10   -> Story N (writes test files, all red)
  |
  |  Orchestrator confirms: all new tests fail, no regressions
  |
  |  ── Step 2: Implementer Pass (parallel per batch) ──
  |---> implementer 1  -> Story A (makes red tests pass, lint clean)
  |---> implementer 2  -> Story B (makes red tests pass, lint clean)
  |---> ...up to 10   -> Story N (makes red tests pass, lint clean)
  |
  v
Orchestrator — full test suite passes, update state, report to user
  |
  v
Next batch (if more stories remain) or Phase complete
```

### Orchestrator Step-by-Step

#### Step O1: Analyze Stories for Readiness

Read `state.json` and identify stories ready for implementation:

```
For each story in state.stories:
  IF story.status == "code_spec" (code spec completed)
     AND story.status != "implementation_complete"
     AND story.status != "failed"
     AND story.type != "integration"   # Integration story runs in Phase 6, not Phase 4
  THEN -> eligible for implementation
```

**Note:** The integration story (if present, `type: "integration"`) is excluded from Phase 4 batching. It is implemented during Phase 6 after all component stories are verified.

If ZERO stories are eligible, inform the user and ask which stories need code specs (Phase 3) first.

#### Step O2: Detect File Conflicts

**CRITICAL: Stories that create or modify the same files MUST NOT run in the same batch.**

Build a file conflict map:

```
1. For each eligible story, read its code spec
2. Extract all files from "Files to Create" and "Files to Modify" sections
3. Store in state.json as files_to_create and files_to_modify per story
4. Build a conflict graph:
   - For each pair of stories (A, B):
     - If A.files_to_create intersection B.files_to_create is not empty -> CONFLICT
     - If A.files_to_create intersection B.files_to_modify is not empty -> CONFLICT
     - If A.files_to_modify intersection B.files_to_modify is not empty -> CONFLICT
5. Conflicting stories go in separate batches
```

**Present conflicts to user:**
```
"Stories 2 and 4 both modify src/app/config.py — they cannot run in parallel.
I'll put Story 2 in Batch 1 and Story 4 in Batch 2.

Batch 1: Story 1, Story 2, Story 3 (no conflicts)
Batch 2: Story 4 (conflicts with Story 2)

Proceed?"
```

#### Step O3: Create Batches

Group eligible, non-conflicting stories into batches of up to 10:

```
batches = []
remaining = [all eligible stories]

WHILE remaining is not empty:
  batch = []
  batch_files = set()
  
  FOR story in remaining:
    story_files = story.files_to_create + story.files_to_modify
    IF story_files intersection batch_files == empty:   # No conflict with batch
      batch.append(story)
      batch_files = batch_files union story_files
    IF len(batch) == 10:
      BREAK
  
  batches.append(batch)
  remaining = remaining - batch
```

Update state.json with the batch plan before executing.

#### Step O4: Spawn Test-Writer Subagents

For each story in the current batch, spawn a `test-writer` subagent (`subagent_type: "test-writer"` via your tool's subagent mechanism (e.g. the Task / subagent tool with the named subagent)).

**How to build the test-writer prompt:**
1. Include the story-specific context (code spec, design context, file boundaries, language guidelines) in the subagent's `prompt` parameter

**CRITICAL RULES:**
- Launch all test-writer subagents for a batch in a **single message** (parallel tool calls)
- Never exceed 10 concurrent subagents
- Each subagent gets a **complete, self-contained prompt** — subagents have NO access to the conversation history
- **Do NOT pass a `model` parameter** — omit it so subagents inherit the parent's model

#### Step O4b: Confirm Tests Are Red

After all test-writer subagents complete:

1. **Verify red state** — Confirm each new test fails (ImportError, NotImplementedError, or assertion failure are all acceptable). If any new test passes before implementation exists, it is a false positive — flag it to the user and ask the test-writer to fix it.
2. **Verify no regressions** — Run the existing test suite (excluding new test files). It must still pass.
3. **Update state.json** — Set each story's status to `tests_written`
4. **Report to user** — List test files created and test counts per story before proceeding

**Do not proceed to Step O5 until all new tests are confirmed red.**

#### Step O5: Spawn Implementer Subagents

For each story in the current batch, spawn an `implementer` subagent (`subagent_type: "implementer"` via your tool's subagent mechanism (e.g. the Task / subagent tool with the named subagent)).

**How to build the implementer prompt:**
1. Include the story-specific context (code spec, design context, file boundaries, language guidelines, and the list of test files already written) in the subagent's `prompt` parameter

**CRITICAL RULES:**
- Launch all implementer subagents for a batch in a **single message** (parallel tool calls)
- Never exceed 10 concurrent subagents
- Each subagent gets a **complete, self-contained prompt** — subagents have NO access to the conversation history
- **Do NOT pass a `model` parameter** — omit it so subagents inherit the parent's model. Do not select a fast/cheap model (if your tool supports selecting one); otherwise omit the model. Implementation requires the full-capability model.

#### Step O5b: Monitor and Collect Results

After spawning implementer subagents:

1. Each subagent returns a structured result when done
2. The orchestrator reads each result and determines:
   - **Success:** Story completed, all tests pass, code review checklist done
   - **Partial:** Story partially implemented, some tasks remain
   - **Failed:** Story failed with errors
3. **Review any test corrections** — If the implementer's report lists test corrections made under the Option B escape hatch, log them in state.json under `verification.test_corrections` for the verifier to audit in Phase 5

#### Step O6: Reconcile and Verify

After ALL implementer subagents in a batch complete:

1. **Update state.json** — Set each story's status based on subagent results
2. **Run full test suite** — Execute ALL tests (not just new ones) to catch cross-story regressions
3. **Run linter** — Ensure no linting errors across the entire project
4. **Run security checks** — Use tools detected in Phase 1A Step 0c, or stack defaults:
   - Secret scan (gitleaks / trufflehog) — **block on any finding**
   - SCA / dependency audit — **block on critical/high** (threshold from 1C)
   - SAST if configured in project CI (e.g., Semgrep, CodeQL) — report critical/high
   - For IaC stories: tfsec/checkov (run at orchestrator level)
5. **Security self-check per story** (from 1C Security Design):
   - Input validated at boundary
   - Authz enforced before business logic
   - No hardcoded secrets
   - No sensitive data in logs/errors
6. **Check for unexpected file overlaps** — Verify no two subagents modified the same file
7. **Collect test corrections** — Aggregate any test corrections from all implementer reports into `verification.test_corrections` in state.json
8. **Record batch results** in `parallel_execution.batches`

```json
{
  "parallel_execution": {
    "current_batch": null,
    "batches": [
      {
        "batch_number": 1,
        "stories": ["story-1-embeddings", "story-2-vector-store", "story-3-storage"],
        "status": "completed",
        "started_at": "2024-01-16T09:00:00Z",
        "completed_at": "2024-01-16T09:15:00Z",
        "results": {
          "story-1-embeddings": "implementation_complete",
          "story-2-vector-store": "implementation_complete",
          "story-3-storage": "failed"
        }
      }
    ]
  }
}
```

#### Step O7: Report to User

After each batch, present a summary:

```
"Batch 1 complete (3 stories):

Test-Writer Pass:
  Story 1: Embeddings Component — 12 tests written, all red ✓
  Story 2: Vector Store — 8 tests written, all red ✓
  Story 3: Storage Component — 6 tests written, all red ✓

Implementer Pass:
  Story 1: Embeddings Component — completed (12/12 tests passing, 0 test corrections)
  Story 2: Vector Store — completed (8/8 tests passing, 1 test correction logged)
  Story 3: Storage Component — failed (error: object-store mock setup issue in Task 2)

Full test suite: 20/20 passing
Linter: clean
Test corrections to audit in Phase 5: 1 (Story 2)

Story 3 will be retried in Batch 2. Ready to proceed?"
```

**CRITICAL: Always ask user for confirmation before launching the next batch.**

#### Step O8: Handle Failures

When a subagent fails:

1. **Mark story as `failed`** in state.json
2. **Log the error** — Record which task failed and the error message
3. **Do NOT retry automatically** — Present the failure to the user
4. **User decides:** Retry in the next batch, skip the story, or escalate for spec/design review
5. If retrying, include the failure context in the retry subagent's prompt so it can learn from the error

#### Step O9: Continue or Complete

```
IF more eligible stories remain:
  -> Go to Step O3 (create next batch)
IF failed stories need retry AND user approved:
  -> Include failed stories in next batch
IF all stories implementation_complete:
  -> Update current_phase to "5" (Verification)
  -> Report to user: "All stories implemented. Ready for Phase 5 (Verification)?"
```

### Subagent Prompt Templates

Each subagent receives a self-contained prompt with all necessary story-specific context.

#### Test-Writer Prompt Template

```
## Your Story

**Story:** {story_title}
**Story ID:** {story_key}
**Feature:** {feature_name}

## Files to Read on Startup

Before writing any tests, read these files to load context. Do NOT expect the code spec pasted here; read it from disk.

**Code spec** (read FIRST — task breakdown, signatures, test cases, SEC-* security test cases):
- {workspace}/.monkeymode/{feature-name}/code_specs/story-N-spec.md

**Design context:**
- {workspace}/.monkeymode/{feature-name}/design/1a-discovery.md — sections: {list relevant section names}
- {workspace}/.monkeymode/{feature-name}/design/1b-contracts.md — sections: {list relevant section names} (include "Authorization Matrix")
- {workspace}/.monkeymode/{feature-name}/design/1c-operations.md — "Security Design" section

**Language-specific coding guidelines** (base guide + framework/cloud supplement + platform supplement, per `context.detected_stack`):
- Base guide: {skill_dir}/monkeymode/guides/{LANGUAGE}-CODING-GUIDELINES.md
- Framework supplement (if applicable): {skill_dir}/monkeymode/guides/{LANGUAGE}-{FRAMEWORK}-SUPPLEMENT.md
- Cloud provider supplement (if IaC): {skill_dir}/monkeymode/guides/TERRAFORM-{PROVIDER}-SUPPLEMENT.md
- Platform supplement (only if `detected_stack.platform_supplement_loaded == true`): {skill_dir}/monkeymode/guides/{PLATFORM}-PLATFORM-SUPPLEMENT.md

The orchestrator fills in the actual paths (e.g. Python + FastAPI -> PYTHON-CODING-GUIDELINES.md + PYTHON-FASTAPI-SUPPLEMENT.md; Angular, React, .NET -> base guide only). Supplements take precedence over the base guide.

**Codebase pattern references** (read these to match existing test conventions exactly):
- {path to similar existing test file, e.g., tests/users/test_repository.py}

## File Boundaries (CRITICAL)

You may ONLY create these files:

**Test files to create:**
{list of test files from code spec}

**Stub files to create (minimal interface skeletons only):**
{list of stub source files needed for imports — empty class/method bodies, no logic}

Do NOT write implementation logic in stubs.
Do NOT modify any existing source files.
Do NOT modify state.json.
Do NOT commit any changes.

**Security tests (mandatory):**
Write a failing test for every SEC-* row in the code spec's "SEC-* Security Test Cases" and "Security Implementation" sections.
```

#### Implementer Prompt Template

```
## Your Story

**Story:** {story_title}
**Story ID:** {story_key}
**Feature:** {feature_name}

## Test Files Already Written

The following test files were written by the test-writer subagent and are currently failing (red).
Your job is to write the implementation that makes them pass — do NOT rewrite the tests unless
you are correcting a genuine spec mismatch (see escape hatch rules in your base instructions).

**Test files:**
{list of test files created by test-writer, with path}

## Files to Read on Startup

Before writing any code, read these files to load context. The code spec is passed by file path (not pasted) — read it FIRST.

**Code spec** (your implementation plan):
- {workspace}/.monkeymode/{feature-name}/code_specs/story-N-spec.md

**Design context:**
- {workspace}/.monkeymode/{feature-name}/design/1a-discovery.md — sections: {list relevant section names}
- {workspace}/.monkeymode/{feature-name}/design/1b-contracts.md — sections: {list relevant section names}
- {workspace}/.monkeymode/{feature-name}/design/1c-operations.md — sections: {list relevant section names}

**Language-specific coding guidelines** (base guide + framework/cloud supplement + platform supplement, per `context.detected_stack`):
- Base guide: {skill_dir}/monkeymode/guides/{LANGUAGE}-CODING-GUIDELINES.md
- Framework supplement (if applicable): {skill_dir}/monkeymode/guides/{LANGUAGE}-{FRAMEWORK}-SUPPLEMENT.md
- Cloud provider supplement (if IaC): {skill_dir}/monkeymode/guides/TERRAFORM-{PROVIDER}-SUPPLEMENT.md
- Platform supplement (only if `detected_stack.platform_supplement_loaded == true`): {skill_dir}/monkeymode/guides/{PLATFORM}-PLATFORM-SUPPLEMENT.md

The orchestrator fills in the actual paths (e.g. Python + FastAPI -> PYTHON-CODING-GUIDELINES.md + PYTHON-FASTAPI-SUPPLEMENT.md; Angular, React, .NET -> base guide only). Supplements take precedence over the base guide.

**Codebase pattern references:**
- {path to similar existing source file, e.g., src/users/repository.py}

## File Boundaries (CRITICAL)

You may ONLY create or modify these files:

**Files to create:**
{list of source files from code spec "Files to Create"}

**Files to modify:**
{list of files from code spec "Files to Modify"}

Tests are already written — do NOT create new test files.
Do NOT modify state.json.
Do NOT modify files belonging to other stories.
Do NOT commit any changes.

**Security requirements (mandatory):**
Read 1c-operations.md "Security Design" and 1b-contracts.md "Authorization Matrix".
Implement security controls BEFORE feature logic in each task.
Security test cases (SEC-*) in the code spec are blocking — make them pass.
```

### Conflict Detection — Detailed Rules

#### What Counts as a Conflict

| Scenario | Conflict? | Resolution |
|----------|-----------|------------|
| Story A creates `src/foo.py`, Story B creates `src/foo.py` | YES | Separate batches |
| Story A creates `src/foo.py`, Story B modifies `src/foo.py` | YES | Separate batches (B must run after A) |
| Story A modifies `src/bar.py`, Story B modifies `src/bar.py` | YES | Separate batches |
| Story A creates `src/foo.py`, Story B creates `src/bar.py` | NO | Same batch OK |
| Story A modifies `src/__init__.py` (adds export), Story B modifies `src/__init__.py` (adds export) | YES | Separate batches |
| Story A creates `tests/test_foo.py`, Story B creates `tests/test_bar.py` | NO | Same batch OK |

#### Common Shared Files to Watch For

These files are frequently modified by multiple stories — always check:
- **Python:** `__init__.py` (exports), `main.py` / `app.py` (router registration), `config.py` / `settings.py`, `requirements.txt` / `pyproject.toml`
- **Java:** `Application.java` (Spring Boot main), `*Config.java` (Spring configuration), `pom.xml` / `build.gradle`, `module-info.java`
- **Angular:** `app.routes.ts` (route registration), `app.config.ts` (providers), `index.ts` barrel files (exports), `angular.json`, `package.json`
- **.NET / C#:** `Program.cs` (DI registration, middleware), `*.csproj` (package references), `DependencyInjection.cs` (service registration), `appsettings.json`
- **Terraform:** `main.tf` (shared module calls), `variables.tf` / `outputs.tf` (shared variables), `versions.tf` (provider constraints), `backend.tf`
- **All languages:** Dependency injection/service registration files, router/routing files, configuration files, migration files (order-dependent)

**If shared files are detected:** Put the conflicting stories in sequential batches. The orchestrator handles shared-file reconciliation during Phase 6 by reading each story's intent and applying the combined changes.

### Resuming Parallel Execution

If the session is interrupted during Phase 4 parallel execution:

1. **Read state.json** — Check `parallel_execution.current_batch`
2. **If current_batch exists and status is "in_progress":**
   - Check each story's status in the batch
   - Stories marked "implementation_complete" -> skip
   - Stories at "tests_written" (red tests exist, implementer not finished) -> re-run only the implementer step in a new batch
   - Stories still at "code_spec" (test-writer not finished) -> re-run from the test-writer step in a new batch
   - Stories marked "failed" -> present to user for decision
3. **If current_batch is null:**
   - Look at `parallel_execution.batches` history
   - Find stories not yet implementation_complete
   - Continue with next batch

## Update Story State During Implementation

**CRITICAL:** In parallel execution mode, **only the orchestrator** updates `state.json`. Subagents do NOT touch state.json.

### Orchestrator State Updates

#### When Starting a Batch

```json
{
  "parallel_execution": {
    "enabled": true,
    "current_batch": {
      "batch_number": 1,
      "stories": ["story-1-embeddings-component", "story-2-vector-store"],
      "started_at": "2024-01-16T09:00:00Z",
      "status": "in_progress"
    }
  },
  "stories": {
    "story-1-embeddings-component": {
      "status": "tests_written",
      "current_task": "Implementer subagent executing",
      "last_updated": "2024-01-16T09:00:00Z"
    },
    "story-2-vector-store": {
      "status": "tests_written",
      "current_task": "Implementer subagent executing",
      "last_updated": "2024-01-16T09:00:00Z"
    }
  }
}
```

#### When a Batch Completes

```json
{
  "parallel_execution": {
    "current_batch": null,
    "batches": [
      {
        "batch_number": 1,
        "stories": ["story-1-embeddings-component", "story-2-vector-store"],
        "status": "completed",
        "started_at": "2024-01-16T09:00:00Z",
        "completed_at": "2024-01-16T09:12:00Z",
        "results": {
          "story-1-embeddings-component": "implementation_complete",
          "story-2-vector-store": "implementation_complete"
        }
      }
    ]
  },
  "stories": {
    "story-1-embeddings-component": {
      "status": "implementation_complete",
      "current_task": null,
      "last_updated": "2024-01-16T09:12:00Z",
      "verification": {
        "test_corrections": []
      }
    },
    "story-2-vector-store": {
      "status": "implementation_complete",
      "current_task": null,
      "last_updated": "2024-01-16T09:12:00Z",
      "verification": {
        "test_corrections": [
          {
            "test_name": "test_add_favorite_raises_conflict_when_duplicate",
            "reason": "Spec defines ConflictError but test expected DuplicateError — corrected to match spec",
            "changed_from": "pytest.raises(DuplicateError)",
            "changed_to": "pytest.raises(ConflictError)"
          }
        ]
      }
    }
  }
}
```

#### When a Story Fails

```json
{
  "stories": {
    "story-3-storage-component": {
      "status": "failed",
      "current_task": "Failed at Task 2: object-store mock setup error",
      "last_updated": "2024-01-16T09:10:00Z"
    }
  }
}
```

**Note on full conflicts:** If all eligible stories share files with each other (every story conflicts), they will be placed in sequential single-story batches. The orchestrator spawns one implementer subagent per batch in that case, waiting for each to complete before the next. Use the same subagent prompt template (base instructions + story-specific context). Update state.json after each story completes.