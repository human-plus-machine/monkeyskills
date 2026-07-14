---
name: monkeysolve
description: MonkeySolve - Design a Solution, Implement It, Verify It, Ship It - A lean, autonomous pipeline for a single problem or bug. Surfaces unknowns before building (per Anthropic's "Finding Your Unknowns" field guide for Claude Fable), then uses subagents to implement and verify, remembers each repo's verification method, and can finish with a PR. Lighter than MonkeyMode: one plan, not a story/code-spec pipeline.
author: MonkeyMode Contributors
---

# MonkeySolve - Design, Implement, Verify, Ship

## Intent

MonkeySolve takes a **single problem** (a feature, a bug, a refactor — not a multi-story epic) from an idea to a shipped PR through four phases, built around the "Finding Your Unknowns" methodology: the quality of agentic work is bottlenecked by how well ambiguity is surfaced and resolved *before* code gets written, not after.

Where [MonkeyMode](../monkeymode/SKILL.md) decomposes a feature into parallel stories with code specs and TDD gates, MonkeySolve is the lighter, faster sibling for a single unit of work: one plan, subagents for implement/verify, and a repo-remembered verification method so you're never re-asked "how do I verify this?" twice.

**User invokes:** `/monkeysolve for [problem]` or `@monkeysolve [problem]`

**Agent guides through:**
1. **Phase 1: Design** — Surface unknowns (blind spots, ambiguities, references), produce a plan, get explicit approval
2. **Phase 2: Implement** — a `solve-implementer` subagent builds the plan; deviations are logged, not silently absorbed
3. **Phase 3: Verify** — `solve-verifier` subagent checks the work using this repo's remembered (or freshly bootstrapped) verification method
4. **Phase 4: Finish** — Generate a PR-ready explainer and an understanding-check quiz, then commit/push/PR

## Workspace Setup

### On First Invocation

When `/monkeysolve` is invoked, **ALWAYS**:

1. **Extract problem name** from the user's request (convert to kebab-case, e.g. "fix the double-charge bug on checkout" → `checkout-double-charge`)
2. **Check for state file:** Read `{workspace}/.monkeysolve/{problem-name}/state.json`
3. **If state file doesn't exist:**
   - Ask about Q&A logging (see [Q&A Logging](#qa-logging))
   - Create `.monkeysolve/{problem-name}/` directory in workspace
   - Create initial `state.json` with `current_phase: "design"`
   - Start Phase 1 (Design)
4. **If state file exists:**
   - Read current phase and resume from there
   - Load artifacts for continuity

### Q&A Logging

Ask once, on first invocation, before Phase 1 begins:

```
"Would you like me to save a log of all our questions and answers during this process?
This creates a qa-log.md file that tracks decisions and context.

1. Yes - Save Q&A log (recommended for team projects)
2. No - Skip Q&A logging"
```

Store `context.save_qa_log` in state. If `true`, append every Q&A exchange to `qa-log.md` immediately (not batched at the end).

### State File Schema

`{workspace}/.monkeysolve/{problem-name}/state.json`:

```json
{
  "problem_name": "string (kebab-case)",
  "current_phase": "design",
  "phase_status": {
    "design": "not_started|in_progress|completed",
    "implement": "not_started|in_progress|completed",
    "verify": "not_started|in_progress|completed",
    "finish": "not_started|in_progress|completed"
  },
  "execution_mode": "in-place|branch|worktree",
  "branch_name": null,
  "worktree_path": null,
  "artifacts": {
    "plan": ".monkeysolve/{problem-name}/plan.md",
    "unknowns_log": ".monkeysolve/{problem-name}/unknowns.md",
    "qa_log": ".monkeysolve/{problem-name}/qa-log.md",
    "implementation_notes": ".monkeysolve/{problem-name}/implementation-notes.md",
    "verify_report": ".monkeysolve/{problem-name}/verify-report.md",
    "explainer": ".monkeysolve/{problem-name}/explainer.md",
    "quiz": ".monkeysolve/{problem-name}/quiz.md"
  },
  "verify": {
    "method_source": "repo-memory|discovered|user-specified|default-generated-tests",
    "command": null,
    "rework_attempts": 0
  },
  "rework_history": [],
  "context": {
    "save_qa_log": true
  },
  "last_updated": "ISO8601 timestamp"
}
```

### Workspace Artifact Structure

```
{workspace}/
├── .monkeysolve/
│   ├── verify.md                    # repo-level: remembered verification method (see Phase 3)
│   ├── config.json                  # repo-level: remembered defaults (e.g. execution_mode)
│   └── {problem-name}/
│       ├── state.json
│       ├── qa-log.md                # OPTIONAL
│       ├── plan.md                  # Phase 1 output
│       ├── unknowns.md              # Phase 1 output: blind spots, open questions, references
│       ├── implementation-notes.md  # Phase 2 output: deviations from the plan
│       ├── verify-report.md         # Phase 3 output
│       ├── explainer.md             # Phase 4 output: PR-ready summary
│       └── quiz.md                  # Phase 4 output: understanding-check
└── src/
    └── [actual production code]     # Phase 2: code written here (or in a branch/worktree)
```

`.monkeysolve/verify.md` and `.monkeysolve/config.json` live at the **repo level**, not per-problem — they are memory shared across every MonkeySolve run in this repo, including ones happening concurrently in another session. **Before writing either file, re-read it first** — if it changed since you last read it, merge your update in (add the missing key/section) rather than overwriting the whole file. See [Phase 3](phases/03-verify.md) for the bootstrap logic and [Phase 2](phases/02-implement.md) for execution-mode defaults.

## Phase Flow & State Management

### Phase Detection Logic

| `current_phase` | `phase_status` key | Phase Guide |
|-----------------|--------------------|--------------|
| `"design"` | `design` | `phases/01-design.md` |
| `"implement"` | `implement` | `phases/02-implement.md` |
| `"verify"` | `verify` | `phases/03-verify.md` |
| `"finish"` | `finish` | `phases/04-finish.md` |
| `"completed"` | — | Problem shipped |

```
1. Extract problem name from user's request (convert to kebab-case)
2. Read {workspace}/.monkeysolve/{problem-name}/state.json
3. If file doesn't exist:
   → Create .monkeysolve/{problem-name}/ directory
   → Create state.json with current_phase: "design"
   → Start Phase 1
4. If file exists:
   → Read current_phase field
   → If "completed": announce done, ask if user wants to revisit or start a new problem
   → Otherwise: resume from that phase, load artifacts for continuity
```

### Phase Transitions

**CRITICAL: Never auto-advance phases. Always ask user for confirmation.**

1. Save the artifact to workspace
2. Update `state.json` with completed status
3. **Ask user:** "Phase [N] complete. Ready to move to Phase [N+1]?"
4. If yes → update `state.json` `current_phase`, start next phase
5. If no → stay in current phase for refinements

**Approval is per-phase, never cumulative.** "Yes", "proceed", "let's go", "continue" grants approval to advance to the **immediately next phase only**. After that phase completes, stop and ask again. No phrasing grants blanket approval to skip future checkpoints.

**Exception — autonomous run:** if the user explicitly asks for an autonomous end-to-end run (e.g. "design this, then implement, verify, and open a PR without stopping"), you may chain Phases 2→3→4 without per-phase confirmation, **but**:
- Phase 1→2 (Design → Implement) always requires explicit approval of the plan — never skip this gate, even in autonomous mode. A plan nobody read is not a plan.
- PR *creation* (`gh pr create`) still always requires explicit permission per the [Finish phase](phases/04-finish.md) — autonomous mode may push the branch and hand you the PR link, but never opens the PR itself unless the user said so up front.
- If anything fails (verification fails 3 rework cycles, a spike contradicts an assumption baked into the plan), autonomous mode stops and reports rather than guessing forward.

## Phase Reference Guides

Read these from the skill directory for detailed methodology:

- **Phase 1:** `phases/01-design.md` — Blind spot pass, brainstorm/prototype, interview, references, plan with flagged unknowns
- **Phase 2:** `phases/02-implement.md` — Execution mode (in-place/branch/worktree), `solve-implementer` subagent, implementation notes
- **Phase 3:** `phases/03-verify.md` — Repo verify-memory bootstrap, `solve-verifier` subagent, rework loop
- **Phase 4:** `phases/04-finish.md` — Explainer + quiz, commit/push/PR
- **Rework:** `phases/rework.md` — Structured rework when verification fails repeatedly or requirements change mid-flight

### When to Load the Rework Guide

- `solve-verifier` returns `fail` and the rework loop (Phase 3) has exhausted its attempts
- The user says "change", "rework", "redo", "fix", "revise" about a **completed** phase
- New requirements emerge that contradict a decision already baked into `plan.md`

## Orchestrator Responsibilities

### Phase 1 — Design

The orchestrator (main agent) runs this phase directly — no subagents. It is inherently conversational: interview the user, run spikes, present the plan. **FIRST read `phases/01-design.md`.**

### Phase 2 — Implement

**FIRST read `phases/02-implement.md`.** The orchestrator must spawn a `solve-implementer` subagent — it must not write the implementation itself.

1. Resolve `execution_mode` (ask once per problem, or reuse `.monkeysolve/config.json` default)
2. Spawn one `solve-implementer` subagent for the whole plan
3. Collect `implementation-notes.md` content from the subagent (deviations from plan, not silently absorbed)
4. Update `state.json` — only the orchestrator writes state; subagents never touch it
5. Report results, ask to proceed to Phase 3

### Phase 3 — Verify

**FIRST read `phases/03-verify.md`.** The orchestrator must spawn a `solve-verifier` subagent — it must not verify the work itself.

1. Resolve the verification method (repo memory → discovery → ask user, defaulting to "generate minimal tests, then refine")
2. Persist the resolved method to `.monkeysolve/verify.md` if it wasn't already there
3. Spawn `solve-verifier` with the resolved method embedded in its prompt
4. Triage: `pass` → Phase 4; `pass-with-warnings` → ask user; `fail` → rework loop (max 3 attempts, then escalate)
5. Report results, ask to proceed to Phase 4

### Phase 4 — Finish

**FIRST read `phases/04-finish.md`.**

1. Generate `explainer.md` (stakeholder-ready summary) and `quiz.md` (understanding-check)
2. Present both to the user
3. Run the git workflow (branch already exists if `execution_mode` was `branch`/`worktree`; otherwise create one) — this reuses the same rules as the [`commit`](../commit-skill/SKILL.md) skill: never commit on `main`/`develop`/`master`, `feat/`/`bugs/` prefix, push the topic branch, never auto-create a PR
4. Mark `current_phase: "completed"`

## Never Do

- ❌ Auto-advance phases without user confirmation (except the explicit autonomous-run exception above, which still gates Design→Implement and PR creation)
- ❌ Skip Phase 1 or start Phase 2 without an approved `plan.md`
- ❌ Implement or verify directly — always spawn `solve-implementer` / `solve-verifier` subagents
- ❌ Let subagents write to `state.json` — only the orchestrator updates state
- ❌ Silently assume a verification method — check repo memory, then discover, then ask (default: generate-and-refine minimal tests)
- ❌ Re-ask for the verification method once `.monkeysolve/verify.md` exists — read and use it
- ❌ Auto-create a PR without explicit user request
- ❌ Commit or push on `main`/`develop`/`master`
- ❌ Pass a `model` parameter when spawning subagents — they inherit the parent's model
- ❌ Overwrite `.monkeysolve/verify.md` or `.monkeysolve/config.json` without re-reading them first — merge in, don't clobber

## Always Do

- ✅ Extract problem name first
- ✅ Spike (verify empirically) any load-bearing assumption about library/API/runtime behavior instead of guessing — same discipline as MonkeyMode's Phase 1 (see `phases/01-design.md`)
- ✅ Read state from `.monkeysolve/{problem-name}/state.json`
- ✅ Read `.monkeysolve/verify.md` and `.monkeysolve/config.json` before asking questions those files already answer
- ✅ Save all artifacts to workspace
- ✅ Log Q&A exchanges to `qa-log.md` immediately (if enabled)
- ✅ Ask user before phase transitions (except the autonomous-run exception)
- ✅ Track implementation deviations in `implementation-notes.md` — never silently absorb a change of approach
- ✅ Persist a newly-resolved verification method to `.monkeysolve/verify.md` so the next run doesn't re-ask

## Quality Standards

- **Design:** Every claim about third-party/library/API/runtime behavior is spike-verified or flagged as an explicit open decision — no unverified "probably works" caveats in the plan
- **Implement:** Production-ready, follows existing repo patterns, deviations from the plan are logged with a reason
- **Verify:** Uses the repo's actual verification method (or a justified default); every acceptance criterion from the plan is checked
- **Finish:** Explainer is accurate and short enough to read in 30 seconds; PR never opens without explicit permission
