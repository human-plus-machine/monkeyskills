---
name: lite-design
description: MonkeyMode Lite Phase 1 — Design. Produces a single design.md merging discovery and contracts. Equivalent to Full phases 1A + 1B condensed for a single-story feature.
---

# Lite Phase 1: Design

## Purpose

Produce a single `design.md` that answers the essential questions before any code is written:
- What problem are we solving?
- Where does this fit in the existing codebase?
- What are the key technical decisions?
- What does done look like?

This is a condensed merge of Full phases 1A (discovery) and 1B (contracts). Include an ops appendix only if there are genuine security, deployment, or performance considerations.

## Output

`{workspace}/.monkeymode/{feature-name}/design.md` (~100–200 lines)

---

## Core Principles

### Never Assume - Ask or Spike
```
If you don't know a technical detail, ASK or SPIKE — never silently assume.

ASK the user when the detail is a product/context decision only they hold:
- "What behavior is expected when [edge case]?"
- "Is [existing pattern] the right one to follow here?"
- "What's explicitly out of scope?"

SPIKE (verify empirically) when the detail is a verifiable fact about code,
a library, an API, or runtime behavior — the user usually can't answer these
reliably from memory, and a wrong guess silently corrupts the design:
- "Does this SDK's tool_result content accept a document block?"
- "What fields does this API response actually return?"
- "Does this adapter raise on an unknown type, or ignore it?"
- "Is this method async? What's its real signature?"
```

### Verify with a Spike

A **spike** is a small, time-boxed investigation that replaces an assumption with
**evidence** before the design depends on it. Spikes are first-class and encouraged in
any phase — design assumptions about external/library/runtime behavior are the most common
source of expensive rework, and they are cheap to disprove early.

**When to run a spike (instead of guessing or asking):**
- The design hinges on a **claim about third-party behavior** (SDK/library/API shape,
  error semantics, capability support, version differences).
- You're about to write "I believe X but I'm not certain" or "this may not be supported" —
  that uncertainty is a spike trigger, not a caveat to ship.
- A constraint would meaningfully change the architecture **if** it turned out to be true
  (or false).
- Two reasonable people could disagree about a factual detail that a 5-minute experiment
  settles.

**How to run a spike (ground in authoritative sources, in priority order):**
1. **Inspect the actual installed code/types.** Read the real SDK/library source or type
   definitions for the version the project pins (e.g. `uv run python -c "import X; ..."`,
   read the installed `.py`/`.d.ts`/`.pyi`). This is the highest-confidence evidence.
2. **Run a minimal reproduction.** A few lines that exercise the exact behavior in question.
3. **Read official docs / changelogs** for the pinned version — note version-specific
   caveats and beta/feature flags.
4. **Web search last, and distrust it.** Blog posts and forum answers are often outdated or
   wrong; only use them to find leads, then confirm against (1)–(3). If a source contradicts
   the installed code, the installed code wins.

**Record the result in `design.md`** so it's auditable and not re-litigated:
- State what was verified, the **evidence** (SDK version + type/source snippet, repro output),
  and the **implication** for the design.
- If the spike **retired** a prior assumption/constraint, say so explicitly (supersede it;
  don't leave the stale concern lurking elsewhere in the doc).
- Add a line to the design's **References** pointing at the artifact (file path, SDK version,
  symbol inspected).

**Keep it time-boxed.** A spike answers one factual question. If it balloons into open-ended
exploration, stop and surface the uncertainty to the user as an explicit open decision instead.

---

## Step 0: Stack Detection (Silent)

Before asking any questions, scan the codebase to detect the stack and write `detected_stack` to `state.json`. Follow the same detection logic as `monkeymode/phases/01a-design-discovery.md` Step 0a:

- Read top-level config files (`package.json`, `pyproject.toml`, `pom.xml`, `build.gradle`, `*.csproj`, `*.tf`, etc.)
- Identify language, framework, build tool, test framework, cloud provider, platform
- Check for `PLATFORM.md`, `monkeymode.config.yaml`, or a matching platform supplement in `{skill_dir}/monkeymode/guides/`
- Write detected values to `state.json` under `context.detected_stack`

### Step 0.5: Design Context (read-if-present)

If `{workspace}/.design-context/{feature-name}/design-context.md` exists, parse its single fenced ```json block (contract: `{skill_dir}/design-context/guides/consuming-design-context.md`) and use `semantic_axis.affected_components` and `semantic_axis.contract_delta` as design inputs (pre-fill "Files to Touch" and "Data Model / API Contract"; surface breaking contract changes to the user). Surface any `degradation_notes` verbatim and do not treat degraded axes as authoritative. If the file is absent or the JSON fails to parse, skip this step silently — never block.

---

## Step 1: Discovery Questions

Ask only the questions you cannot answer from the codebase. Standard lite discovery covers:

1. **Problem statement** — What behavior is missing or wrong? What does the user need?
2. **Acceptance criteria** — What does "done" look like in 2–3 bullet points?
3. **Scope boundaries** — What is explicitly out of scope?
4. **Existing patterns** — Is there an existing component/pattern to follow? (Often answered by codebase scan)
5. **Edge cases** — Any known edge cases or error scenarios to handle?

Skip questions the codebase analysis already answered. Do not ask about scale, infrastructure, or team unless there are signals in the codebase.

---

## Step 2: Write `design.md`

Use the following structure. Keep it concise — this is a single-story feature.

```markdown
# Design: {Feature Name}

## Problem
[1–2 sentences: what is broken or missing, and who is affected]

## Acceptance Criteria
- [ ] [criterion 1]
- [ ] [criterion 2]
- [ ] [criterion 3]

## Out of Scope
- [explicit exclusions to prevent scope creep]

## Architecture Approach
[How this fits into the existing codebase. Reference existing patterns, components, or modules.
Include a short diagram if the flow is non-trivial.]

## Key Technical Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| [e.g. storage] | [e.g. existing DB] | [e.g. no new infrastructure needed] |

## Data Model / API Contract (if applicable)
[Only include if the feature touches data or APIs. Keep it minimal.]

## Files to Touch (estimated)
| File | Change |
|------|--------|
| `src/...` | [add / modify / delete] |

## Ops Appendix (include only if applicable)
### Security
[Any auth, validation, or data protection concerns]

### Performance
[Any caching, query, or load concerns]
```

---

Critique is optional — only if the user asks; see `{skill_dir}/monkeymode/guides/PHASE-CRITIQUE-LOOP.md`.

---

## Step 3: Update State

After writing `design.md`:

```json
{
  "current_phase": "code_spec",
  "phase_status": {
    "design": "completed"
  },
  "artifacts": {
    "design_doc": ".monkeymode/{feature-name}/design.md"
  }
}
```

---

## User Checkpoint

Ask: "Design complete. Ready to move to Phase 2 (Code Spec)?"

Wait for confirmation before advancing.

---

## Definition of Done

- [ ] `design.md` saved to `.monkeymode/{feature-name}/`
- [ ] Acceptance criteria are specific and testable
- [ ] Files to touch list is populated
- [ ] Every claim about third-party/library/API/runtime behavior is either spike-verified (evidence recorded) or flagged as an explicit open decision — no unverified "I believe / this may not be supported" claims left in the design
- [ ] `state.json` updated: `design: completed`, `current_phase: code_spec`
- [ ] User confirmed to proceed

---

## Anti-Patterns to Avoid

❌ **Shipping an unverified library/API assumption as a caveat**
```
"The SDK probably doesn't allow a document block inside tool_result, so we'll
 add a text-only fallback (constraint for later)."
→ Spike it: inspect the installed SDK types / run a repro. The constraint was
 false — both content unions accept the block. A 5-minute spike removed an
 entire fallback path and the rework it would have caused.
```
