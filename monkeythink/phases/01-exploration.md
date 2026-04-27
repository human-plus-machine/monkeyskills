---
name: exploration
description: Phase 1 - Exploration. Dispatches the LLM Council with the same problem framing, using the mode set in context.council_mode (auto/sequential/manual). Parallel mode spawns 3 subagents (Cursor only). Sequential mode runs 3 persona passes in sequence (any IDE). Manual mode exports prompts for the user to run externally. Raw responses are saved before synthesis begins.
---

# Phase 1: Exploration (LLM Council)

## Purpose

Explore the solution space by getting three independent perspectives — Claude-style (analytical), GPT-style (pragmatic), and Gemini-style (expansive) — on the same problem framing. In parallel mode these come from genuinely different LLMs; in sequential and manual mode they come from the same LLM using different reasoning biases.

The orchestrator collects all responses and saves them verbatim. Synthesis happens in Phase 1b.

## When This Phase Begins

Phase 1 begins after:
- Phase 0 (Problem Framing) is `completed` and `framing.md` exists in the workspace
- User preferences are set (`context.council_enabled`, `context.council_mode`, `context.save_qa_log`)

If `context.council_enabled` is `false`, skip to [Solo Exploration Fallback](#solo-exploration-fallback).

---

## Step 0: Detect Execution Mode

Read `context.council_mode` from state.json:

- **`"sequential"`** → Skip to [Sequential Persona Fallback](#sequential-persona-fallback)
- **`"manual"`** → Skip to [Manual Export](#manual-export)
- **`"auto"`** → Attempt to detect Task tool availability:
  - Attempt a minimal Task tool probe (e.g. a no-op generalPurpose task with a short description)
  - If it **succeeds**: proceed with parallel mode (Steps 1–6 below)
  - If it **fails or is unavailable**: announce fallback and skip to [Sequential Persona Fallback](#sequential-persona-fallback):
    ```
    "Parallel multi-model dispatch isn't available in this environment.
    Falling back to sequential persona mode — I'll run the council brief three times,
    each with a different reasoning bias. Note: this is the same underlying model
    wearing three hats, not three genuinely different LLMs."
    ```
    Update `context.council_mode: "sequential"` in state.json.

---

## Step 1: Announce Council Dispatch

Before spawning subagents, announce what's happening:

```
"I'm dispatching the LLM Council now. Three independent agents — Claude, GPT, and Gemini —
will each explore your problem framing and propose solution directions.

They all receive the same input and work independently. I'll synthesize their responses
once all three report back."
```

Update state:
```json
{
  "current_phase": "1",
  "phase_status": { "exploration": "in_progress" },
  "council": {
    "exploration_responses": {
      "claude": "pending",
      "gpt": "pending",
      "gemini": "pending"
    }
  }
}
```

---

## Step 2: Construct the Council Brief

Read `{workspace}/.monkeythink/{topic-name}/framing.md` and construct the council brief. The brief is the identical prompt sent to all three council members.

**Council Brief Structure:**

```
You are participating in a structured solution exploration exercise.

PROBLEM FRAMING:
---
{full contents of framing.md}
---

TASK:
Explore this problem space and propose 2-3 distinct solution directions.
Do NOT try to combine all ideas into one solution — propose genuinely different approaches
that make different trade-offs.

OUTPUT FORMAT:
You MUST respond using exactly the structure defined in the Council Output Template below.
Do not deviate from this format. The orchestrator that reads your response depends on it.

{full contents of templates/exploration-output-template.md}
```

**Critical:** All three council members receive this **exact same brief**. Do not customize, abbreviate, or modify the brief per member.

---

## Step 3: Spawn Council Subagents in Parallel

Spawn all three subagents simultaneously using the Task tool. Pass the council brief from Step 2 as each subagent's `prompt`.

```
Task 1: council-claude subagent
  - prompt: [council brief from Step 2]
  - subagent_type: council-claude
  - description: "Council member Claude — solution exploration"

Task 2: council-gpt subagent
  - prompt: [council brief from Step 2]
  - subagent_type: council-gpt
  - description: "Council member GPT — solution exploration"

Task 3: council-gemini subagent
  - prompt: [council brief from Step 2]
  - subagent_type: council-gemini
  - description: "Council member Gemini — solution exploration"
```

**CRITICAL rules for spawning:**
- All three are launched **simultaneously** (same message, parallel Task calls)
- Do NOT pass a `model` parameter in the Task call — each subagent's LLM is already configured independently
- Do NOT pass any workspace context beyond the council brief — council members are stateless
- Council members must NOT read or write any workspace files

---

## Step 4: Receive and Save Responses

As each subagent completes, immediately:

1. **Save the raw response** to the workspace:
   - Claude → `.monkeythink/{topic-name}/council-responses/claude-exploration.md`
   - GPT → `.monkeythink/{topic-name}/council-responses/gpt-exploration.md`
   - Gemini → `.monkeythink/{topic-name}/council-responses/gemini-exploration.md`

2. **Update state.json** for that member:
   ```json
   {
     "council": {
       "exploration_responses": {
         "claude": "received"
       }
     }
   }
   ```

3. **If a member fails** (error, timeout, malformed response):
   - Mark as `failed` in state.json
   - Log the error in the raw response file: `# COUNCIL MEMBER FAILED\n\nError: {error message}`
   - Continue waiting for remaining members

---

## Step 5: Validate Minimum Viable Council

After all three have either responded or failed:

**If 3 of 3 received:** Proceed to Phase 1b.

**If 2 of 3 received:** Announce to user:
```
"Two of three council members responded successfully ({names}). {failed_member} did not respond.
I'll proceed with two perspectives — the synthesis will note the missing member.
Ready to continue?"
```
If yes, proceed to Phase 1b with available responses.

**If 1 of 3 or fewer received:** Stop and notify user:
```
"Only one council member responded successfully. This is not enough for a meaningful synthesis.

Options:
1. Retry the council — attempt to re-spawn the failed members
2. Proceed with solo exploration — I'll explore the problem space myself
3. Wait and retry later"
```

Do not proceed to synthesis with fewer than 2 successful responses.

---

## Step 6: Transition to Phase 1b

After saving all available responses and confirming minimum viable council:

1. Update state:
   ```json
   {
     "phase_status": { "exploration": "completed", "synthesis_review": "in_progress" },
     "current_phase": "1b"
   }
   ```
2. Immediately proceed to Phase 1b (Synthesis Review) — no user confirmation required for this transition
3. Read `phases/01b-synthesis-review.md` and follow its methodology

---

## Sequential Persona Fallback

Used when `council_mode` is `"sequential"` or when auto-detection fails.

### Announce limitation

```
"Running in sequential persona mode. I'll explore this problem three times, each from a
different reasoning perspective. This is the same underlying model with different reasoning
biases — not three genuinely different LLMs. The diversity is stylistic, not architectural."
```

### Run 3 persona passes in sequence

For each pass, prepend the persona system prompt below to the standard council brief (from Step 2 of the parallel flow), then generate a full council response using the structured format from `templates/exploration-output-template.md`.

**Pass 1 — Analytical (Claude-style)**
```
You are reasoning in an analytical, structured mode. Focus on:
- Systematic decomposition of the problem into components
- Correctness, completeness, and edge cases
- Architecture, data models, and implementation constraints
- What could go wrong technically
Be thorough and precise. Favor structured lists and explicit reasoning chains.
```
Save to: `.monkeythink/{topic-name}/council-responses/analytical-exploration.md`

**Pass 2 — Pragmatic (GPT-style)**
```
You are reasoning in a pragmatic, outcome-oriented mode. Focus on:
- What users actually need and will adopt
- Fastest path to value — what ships first
- Real-world trade-offs between options
- Organizational feasibility and stakeholder concerns
Be direct and practical. Favor concrete recommendations over exhaustive analysis.
```
Save to: `.monkeythink/{topic-name}/council-responses/pragmatic-exploration.md`

**Pass 3 — Expansive (Gemini-style)**
```
You are reasoning in a broad, exploratory mode. Focus on:
- Adjacent opportunities and non-obvious angles
- What the problem space looks like from the outside
- Creative directions that break conventional assumptions
- Long-term possibilities beyond the immediate scope
Be generative and wide-ranging. Surface directions others might not consider.
```
Save to: `.monkeythink/{topic-name}/council-responses/expansive-exploration.md`

### Update state after all 3 passes

```json
{
  "council": {
    "exploration_responses": {
      "analytical": "received",
      "pragmatic": "received",
      "expansive": "received"
    }
  }
}
```

Proceed to Phase 1b. The synthesis step will note "sequential persona mode" in the synthesis header and skip true consensus/divergence analysis (since all three came from one model).

---

## Manual Export

Used when `council_mode` is `"manual"`.

### Announce

```
"I'll generate 3 council prompts for you to run in separate tools (ChatGPT, Claude.ai, Gemini.ai).
This gives you true model diversity. Once you have the 3 responses, paste them back here
and I'll synthesize them."
```

### Generate prompt files

Construct the council brief (Step 2 of the parallel flow). Then generate 3 prompt files, each combining the persona system prompt with the council brief:

Save to `.monkeythink/{topic-name}/council-prompts/`:
- `01-analytical-prompt.md` — Analytical persona + council brief
- `02-pragmatic-prompt.md` — Pragmatic persona + council brief
- `03-expansive-prompt.md` — Expansive persona + council brief

Each file starts with:
```markdown
# Council Prompt [N]: [Persona Name]

**Instructions:** Copy everything below the line and paste it into [recommended tool].
Run it and paste the full response back to your AI IDE.

---

[persona system prompt]

[council brief]
```

### Pause and wait

```
"3 council prompt files saved to .monkeythink/{topic-name}/council-prompts/.

Steps:
1. Open 01-analytical-prompt.md → paste into Claude.ai (or any tool)
2. Open 02-pragmatic-prompt.md → paste into ChatGPT
3. Open 03-expansive-prompt.md → paste into Gemini
4. Paste all 3 responses back here

I'll synthesize them once I have all three."
```

Wait for the user to paste all 3 responses. Save each verbatim to `council-responses/`:
- `analytical-exploration.md`
- `pragmatic-exploration.md`
- `expansive-exploration.md`

Then proceed to Phase 1b normally.

---

## Solo Exploration Fallback

When `context.council_enabled` is `false`, the orchestrator performs exploration itself:

1. Announce: "Exploring the problem space from a single perspective."
2. Read `framing.md` and generate 3 solution directions using the structured format from `templates/exploration-output-template.md`
3. Save to `.monkeythink/{topic-name}/council-responses/solo-exploration.md`
4. Update state: `council.enabled: false`, all `exploration_responses` set to `"skipped"`
5. Proceed to Phase 1b — synthesis will note this was solo exploration and skip consensus/divergence analysis

---

## State Updates Summary

| Event | State Update |
|-------|-------------|
| Phase 1 begins | `current_phase: "1"`, `phase_status.exploration: "in_progress"`, all `exploration_responses: "pending"` |
| Council member responds | `exploration_responses.{member}: "received"` |
| Council member fails | `exploration_responses.{member}: "failed"` |
| Phase 1 complete | `phase_status.exploration: "completed"`, proceed to `"1b"` |

---

## Definition of Done

Phase 1 is complete when:
- [ ] Execution mode determined (parallel / sequential / manual) and noted in state
- [ ] Council brief constructed from `framing.md`
- [ ] **Parallel:** All 3 subagents spawned simultaneously; ≥2 of 3 responses received
- [ ] **Sequential:** All 3 persona passes completed; limitation disclosed to user
- [ ] **Manual:** All 3 prompt files exported; all 3 user-pasted responses received
- [ ] Raw responses saved to `council-responses/` before synthesis
- [ ] Response status updated in state.json
- [ ] `phase_status.exploration` set to `"completed"`
- [ ] Transition to Phase 1b initiated
