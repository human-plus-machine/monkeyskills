---
name: integration
description: Phase 6 - Integration. Wires independently-implemented stories together — shared files, router registrations, dependency injection, configuration, and end-to-end testing.
---

# Phase 6: Integration

## Purpose

Wire independently-implemented and verified stories together into a cohesive, working feature. During Phases 4-5, each story was implemented and verified in isolation. Phase 6 handles the cross-story concerns that couldn't be done in parallel:

- Shared file merges (`__init__.py`, router registrations, config)
- Dependency injection wiring
- Cross-story contract validation
- End-to-end integration testing
- Final feature-level verification

## Integration Story

Phase 6 is driven by the **integration story** created during Phase 2 (Step 6). Unlike other phases where the orchestrator works ad-hoc, Phase 6 follows the integration story's code spec and acceptance criteria — just like any other story.

**The integration story has its own code spec** (generated during Phase 3) that specifies:
- Exactly which shared files to merge and what changes to apply
- Which cross-story interfaces to wire together
- Which DI/config registrations to add
- What integration tests to write, with specific test cases

**The orchestrator implements the integration story** using the same `implementer` subagent as component stories. The integration story's code spec is the single source of truth for Phase 6 work.

## When This Phase Runs

Phase 6 begins when:
- All **component** stories (non-integration) have status `verified` from Phase 5
- The integration story has a completed code spec (from Phase 3)
- The full test suite passes
- The user confirms readiness to proceed

## Orchestrator Workflow

### Step I1: Load Integration Story Code Spec

Read the integration story's code spec from `.monkeymode/{feature-name}/code_specs/story-N-integration-spec.md`. This code spec (generated during Phase 3) contains the complete integration plan:

- Shared file merges with exact changes
- Cross-story wiring with specific import paths
- DI/config registrations
- Integration test specifications

**If the integration story has no code spec**, generate one now by running Phase 3 for the integration story before proceeding. The integration story MUST have a code spec — do not proceed with ad-hoc integration.

Present the integration story's checklist to the user before proceeding.

### Step I2 (Pre-check): Validate Component Stories

Before implementing the integration story, verify all component stories are ready:

```
For each non-integration story:
  IF story.status != "verified":
    STOP — cannot integrate until all component stories pass verification
```

### Step I3: Implement Integration Story

Spawn an `implementer` subagent for the integration story, using the same prompt template as component stories. The subagent receives:

**Pipeline:** Follow the same two-step pipeline as Phase 4 — spawn a `test-writer` subagent first for the integration story's tests (confirm they are red), then the `implementer` subagent to wire the code. Set the integration story's status to `tests_written` between the steps and log any implementer test corrections under `verification.test_corrections`, to be audited in Step I7.

1. The integration story's code spec, passed by file path (`{workspace}/.monkeymode/{feature-name}/code_specs/story-N-integration-spec.md`) — the subagent reads it on startup
2. Design context references
3. Coding guidelines as resolved absolute paths (`{skill_dir}/monkeymode/guides/...`: base guide, framework/cloud supplement, and the `{PLATFORM}-PLATFORM-SUPPLEMENT.md` only if `detected_stack.platform_supplement_loaded == true`), assembled exactly as in Phase 4
4. File boundaries from the code spec

The subagent handles shared file merges, DI wiring, and integration test writing — all guided by the code spec.

**If manual orchestrator implementation is preferred** (e.g., simple integration with only 1-2 shared file changes), the orchestrator can implement directly. For each shared file, apply changes from all stories:

1. **Read the integration story's code spec** for the exact changes to apply
2. **Apply changes in story order** (Story 1 first, then Story 2, etc.)
3. **Resolve any conflicts** — If two stories add to the same section, combine them logically
4. **Run tests after each merge** to catch issues early

**Common shared files:**

| File | Typical Changes |
|------|----------------|
| `__init__.py` | Add exports for new modules |
| `app.py` / `main.py` | Register new routers, middleware |
| `routes.py` / `urls.py` | Add new route handlers |
| `config.py` / `settings.py` | Add new config entries |
| DI container setup | Register new services, repositories |
| Migration files | Create/order migration chain |

### Step I4: Wire Cross-Story Dependencies

Verify that cross-story interfaces work correctly:

1. **Import verification** — Can Story B import Story A's exports?
2. **Type compatibility** — Do the types match across story boundaries?
3. **Contract compliance** — Does Story A's implementation satisfy the interface that Story B expects?

```python
# Example: Verify Story 2 can use Story 1's interface
from src.embeddings.interface import EmbeddingsInterface
from src.vector_store.service import VectorStoreService

# This should work without type errors:
embeddings: EmbeddingsInterface = get_embeddings_service()
vector_store = VectorStoreService(embeddings=embeddings)
```

### Step I5: Write Integration Tests

Write end-to-end tests that exercise the full feature flow across multiple stories:

```python
class TestFeatureIntegration:
    """End-to-end integration tests for the complete feature."""
    
    async def test_full_flow(self, client, auth_token):
        """Test the complete feature flow across all stories."""
        # Step 1: Use Story 1's functionality
        # Step 2: Use Story 2's functionality (depends on Story 1)
        # Step 3: Use Story 3's functionality (depends on Story 2)
        # Verify the end-to-end result
        pass
    
    async def test_error_propagation_across_stories(self, client, auth_token):
        """Test that errors in one story's component propagate correctly."""
        pass
```

Integration tests should cover:
- Happy path through the full feature
- Error propagation across story boundaries
- Edge cases at integration points (e.g., Story B handles Story A returning empty results)
- Performance of the combined flow (no N+1 issues at integration points)

### Step I6: Run Tests & Lint

After all integration work is complete, run a mechanical pass:

1. **Run the full test suite** — All unit tests + new integration tests
2. **Run linter** across the entire project
3. **Run type checker** across the entire project
4. **Verify no regressions** — All previously passing tests still pass

If any tests fail or linter errors appear, fix them before proceeding to Step I7.

### Step I7: Post-Integration Verification

> **Why a separate verification?** Phase 5 verified each story in isolation — but many real bugs only appear when stories are wired together: contract mismatches, missing DI registrations, incorrect import paths, event ordering issues, N+1 queries at integration points. A structured verification of the integrated result catches what per-story verification cannot.

Spawn a `verifier` subagent via the Task tool (`subagent_type: "verifier"`) with a **cross-story verification scope**. Unlike Phase 5 (which verifies one story at a time), this verification checks the feature as a whole.

**Post-integration verifier prompt:**

```
## Post-Integration Verification

**Feature:** {feature_name}
**Scope:** Full feature — all stories integrated

This is a POST-INTEGRATION verification. All component stories have already
passed individual verification in Phase 5. Your job is to verify that the
integrated feature works correctly AS A WHOLE — checking the seams between
stories, not re-verifying individual story internals.

## Files to Read on Startup

**Integration story code spec:**
- {workspace}/.monkeymode/{feature-name}/code_specs/story-N-integration-spec.md

**Design contracts (the source of truth for cross-story interfaces):**
- {workspace}/.monkeymode/{feature-name}/design/1b-contracts.md

**Coding guidelines** (resolved absolute paths, assembled as in Phase 5; platform supplement only if `detected_stack.platform_supplement_loaded == true`):
- {skill_dir}/monkeymode/guides/{LANGUAGE}-CODING-GUIDELINES.md

**All component story code specs** (for interface/contract reference):
- {workspace}/.monkeymode/{feature-name}/code_specs/story-1-spec.md
- {workspace}/.monkeymode/{feature-name}/code_specs/story-2-spec.md
- [... all component specs]

## Verification Checklist

Check each of these categories:

### 1. Cross-Story Contract Compliance
- Do all cross-story imports resolve correctly?
- Do function signatures at integration points match the contracts from Phase 1B?
- Are return types, error types, and exception handling consistent across boundaries?

### 2. Dependency Injection & Wiring
- Are all services registered in the DI container?
- Are real implementations injected (not mocks) in production config?
- Do constructors receive the correct dependencies?

### 3. Shared File Integrity
- Do all shared files (`__init__.py`, routes, config) include entries from every story?
- Are there any duplicate or conflicting registrations?
- Is the import/export order correct (no circular dependencies)?

### 4. End-to-End Flow
- Does the happy path work through the full feature (not just individual components)?
- Do errors propagate correctly across story boundaries?
- Are edge cases at integration points handled (e.g., empty results from one story consumed by another)?

### 5. Integration Test Coverage
- Do integration tests exist for the full feature flow?
- Do they test real implementations (not mocks)?
- Do they cover error propagation across stories?

### 6. No Regressions
- Do all pre-existing tests still pass?
- Are there any new linter or type checker warnings?

### 7. Security at Integration Seams
- Is auth context (user ID, tenant ID, roles) propagated correctly across all wired components?
- Can a request pass Story A's auth but bypass Story B's authz at the integration point?
- Are security headers / middleware applied to all integrated routes?
- Do integration tests include at least one IDOR scenario across story boundaries?
- Are mocks replaced with real auth/authz in production wiring (not bypassed)?

## Files to Verify

**Shared files (merged during integration):**
{list of shared files from integration.shared_files_merged}

**Integration test files:**
{list of integration test files}

**Cross-story import points:**
{list of files where one story imports from another}
```

**Handling results:**

- **Pass** → Proceed to the report (Step I8) — the feature is NOT marked complete here; that happens only after Phase 7 (see Step I9)
- **Pass with warnings** → Present warnings to user. If user accepts, proceed. If user wants fixes, enter rework loop on the integration story.
- **Fail** → Enter rework loop:
  - If the failure is in the integration wiring → spawn `reworker` for the integration story
  - If the failure traces back to a component story's implementation → send that component story back through Phase 5 verification + rework
  - If the failure is a contract mismatch from Phase 1B → load `phases/rework.md` for design-level rework


### Step I8: Report to User

```
"Phase 6 — Integration complete:

Shared files merged:
  - src/__init__.py — exports from 3 stories
  - src/app.py — 3 routers registered
  - src/config.py — 2 new config entries

Cross-story wiring:
  - Story 2 -> Story 1 (EmbeddingsInterface): verified
  - Story 3 -> Story 2 (VectorStoreInterface): verified

Integration tests: 5 new tests, all passing
Full test suite: 45/45 passing
Linter: clean

All stories implemented, verified, and integrated. Ready for Phase 7 (Acceptance)."
```

**CRITICAL: Always ask user for confirmation before proceeding to Phase 7.**

### Step I9: Update State

After integration completes, update state — do **not** mark the feature `completed` until Phase 7 passes:

```json
{
  "current_phase": "7",
  "phase_status": {
    "integration": "completed"
  },
  "stories": {
    "story-1-embeddings": { "status": "integrated" },
    "story-2-vector-store": { "status": "integrated" },
    "story-3-storage": { "status": "integrated" },
    "story-4-integration": { "status": "integrated", "type": "integration" }
  },
  "integration": {
    "status": "completed",
    "shared_files_merged": ["src/__init__.py", "src/app.py", "src/config.py"],
    "integration_tests_added": 5,
    "post_integration_verification": "pass",
    "completed_at": "ISO8601 timestamp"
  }
}
```

## Handling Integration Failures

### Import/Type Errors

If cross-story imports fail:
1. Check if the exporting story's `__init__.py` was properly merged
2. Check if the function signatures match the contract from Phase 1B
3. If signatures don't match, this is a contract mismatch — load `phases/rework.md`

### Test Failures at Integration Points

If integration tests fail:
1. Determine which story's component is at fault
2. If the component works correctly per its spec but the integration fails, the issue is in the integration contract (Phase 1B/2)
3. If the component is wrong per its spec, send it back through Phase 5 (Verification + Rework)

### Shared File Merge Conflicts

If two stories' changes to a shared file conflict:
1. Read both stories' code specs for their intended changes
2. Determine the correct combined state
3. Apply both changes logically (usually additive — both add exports, both add routes)
4. If the changes are contradictory, escalate to the user
