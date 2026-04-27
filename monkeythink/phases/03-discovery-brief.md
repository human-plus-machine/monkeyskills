---
name: monkeythinky-brief
description: Phase 3 - Discovery Brief. Produces the discovery-brief.md handoff artifact from all prior phases. Structured to be directly consumed by MonkeyPlan Phase 0 Path C (Discovery Import), enabling MonkeyPlan to skip redundant questions.
---

# Phase 3: Discovery Brief

## Purpose

Produce the discovery brief — a single, structured document that captures everything learned in the MonkeyThink and hands it off to `@monkeyplan` in a format MonkeyPlan can consume directly. The discovery brief replaces MonkeyPlan's Phase 0 interview for users who have completed the Discover flow.

A good discovery brief answers the questions MonkeyPlan would ask in Phase 0, so MonkeyPlan can skip straight to requirements generation.

## When This Phase Begins

Phase 3 begins after:
- Phase 2a (Direction Setting) is `completed` and direction data is in state.json
- Phase 2b (UI Concept) is either `completed` or `skipped`
- Phase 2c (Risk Challenge) is either `completed` or `skipped`

---

## Step 1: Load All Prior Artifacts

Before generating the discovery brief, read:
- `{workspace}/.monkeythink/{topic-name}/state.json` — framing data, direction data, phase statuses
- `{workspace}/.monkeythink/{topic-name}/framing.md` — full problem framing
- `{workspace}/.monkeythink/{topic-name}/exploration-synthesis.md` — council synthesis
- `{workspace}/.monkeythink/{topic-name}/risk-challenge.md` — risk findings (if exists)
- `{workspace}/DESIGN.md` — design token file (if `phase_status.design_md` is `loaded` or `generated`)

This ensures the brief is comprehensive and nothing from earlier phases is lost.

---

## Step 2: Generate the Discovery Brief

Produce `{workspace}/.monkeythink/{topic-name}/discovery-brief.md` following the template at `templates/discovery-brief-template.md`.

The brief must be self-contained — a reader who has not been part of the Discover session should be able to understand the problem, the chosen direction, the key decisions made, and the risks acknowledged by reading only this document.

**Section guidance:**

**1. Problem Statement**
Synthesize `framing.raw_description` and `framing.pain_points` into a clear, concise 3-5 sentence problem statement. This is not a copy-paste of the framing — it is a refined statement that a stakeholder can act on.

**2. Who Is Affected**
From `framing.who_is_affected`. List primary users, secondary stakeholders, and rough scale.

**3. Opportunity**
From `framing.opportunity`. What becomes possible if this is solved well.

**4. Chosen Direction**
From `direction.chosen` and `direction.rationale`. Describe the selected approach clearly — what it is, why it was chosen over alternatives.

**5. What Was Considered and Rejected**
From the exploration synthesis — document other directions that were surfaced but not chosen, with brief rationale for why they were set aside. This is valuable for future readers and prevents "but what about X?" questions in requirements review.

**6. Key Trade-offs Resolved**
From `direction.resolved_contradictions`. Document each architectural or product decision that was made, the options considered, and the rationale for the choice.

**7. Scope Sketch**
From `direction.scope_sketch`. MVP definition and explicit exclusions.

**8. Success Criteria**
From `direction.success_criteria`. How success will be measured or observed.

**9. Constraints**
Combine `framing.constraints` and `direction.constraints`. All constraints in one place.

**10. Risks Acknowledged**
Summarize top risks from `risk-challenge.md` (if exists), or note "Risk challenge not performed." Include the mitigation signals. This section lets MonkeyPlan reference risks that were already identified during discovery.

**11. Council Insights Summary**
Brief note on the council process: how many LLMs participated, key consensus themes, and any unique insights that didn't make it into the chosen direction but are worth keeping in mind.

**12. Prior Art and Context**
From `framing.prior_art`. Links, references, related work.

**13. Open Questions**
What is still unknown or unresolved at the end of the Discover phase? These are the questions MonkeyPlan should address in requirements generation.

---

## Step 3: Review with User

Present a summary of the discovery brief:

```
"The discovery brief is ready. Here's a summary:

**Topic:** {topic_name}
**Chosen Direction:** {direction.chosen}

**Problem:** {2-sentence summary of problem statement}

**MVP Scope:** {scope_sketch — 1-2 sentences}

**Key decisions made:**
{resolved contradictions — as a 2-3 item bullet list}

**Top risks:** {top 2-3 risk names from risk challenge, or 'Risk challenge not performed'}

**Open questions for MonkeyPlan:** {count} open questions documented

Full brief at .monkeythink/{topic-name}/discovery-brief.md

Does this capture the outcome of our discovery session? Ready to finalize?

1. Looks good — finalize and offer MonkeyPlan handoff
2. I need to adjust something — (tell me what to change)"
```

---

## Step 4: Finalize and Offer MonkeyPlan Handoff

Once user approves:

1. Update state:
   ```json
   {
     "phase_status": { "discovery_brief": "completed" },
     "current_phase": "completed"
   }
   ```

2. Offer MonkeyPlan handoff (from SKILL.md MonkeyPlan Handoff section):
   ```
   "Would you like to hand this off to MonkeyPlan for structured requirements?
   I'll copy the discovery brief to .monkeyplan/{topic-name}/discovery-brief.md
   so MonkeyPlan Phase 0 can use it as context and skip questions already answered here.

   1. Yes - Set up MonkeyPlan handoff
   2. No - I'll handle the MonkeyPlan handoff manually"
   ```

3. If accepted:
   - Create `.monkeyplan/{topic-name}/discovery-brief.md` as a copy of the discovery brief
   - If `{workspace}/DESIGN.md` exists: note in the announcement that it's available at the workspace root and MonkeyPlan Phase 2 (UX Ideation) can reference it as the design token source
   - Update `monkeyplan_handoff` in state.json
   - Announce: "Discovery brief copied to .monkeyplan/{topic-name}/discovery-brief.md. When you're ready, invoke @monkeyplan for {topic-name} and it will load the discovery brief as context, skipping questions already answered here.[if DESIGN.md exists] Your DESIGN.md is also at the workspace root — MonkeyPlan's UX Ideation phase will use it as the design token source."

4. Offer export options:
   ```
   "Your discovery brief is saved at .monkeythink/{topic-name}/discovery-brief.md.

   1. Keep as-is — I'll use it directly in this workspace (default)
   2. Export to project root — Copy discovery-brief.md to {workspace}/{topic-name}-discovery-brief.md for easy sharing"
   ```

---

## What MonkeyPlan Receives

When MonkeyPlan's Phase 0 Path C detects `discovery-brief.md`, it maps sections to MonkeyPlan intake fields:

| Discovery Brief Section | MonkeyPlan Intake Field |
|------------------------|-----------------|
| Problem Statement | `intake.problem_statement` |
| Who Is Affected | `intake.users` |
| Chosen Direction | Informs problem framing and scope |
| Scope Sketch (MVP) | `intake.in_scope` |
| Scope Sketch (exclusions) | `intake.out_of_scope` |
| Success Criteria | `intake.business_goals` |
| Constraints | `intake.additional_context` |
| Risks Acknowledged | Referenced in MonkeyPlan Section 10 (Risks/Dependencies) |
| Open Questions | Flagged as `[ASSUMPTION]` items in MonkeyPlan |
| `DESIGN.md` (workspace root) | Read by MonkeyPlan Phase 2 (UX Ideation) as the design token source; no re-generation needed |

---

## Definition of Done

Phase 3 is complete when:
- [ ] All prior artifacts loaded (framing.md, exploration-synthesis.md, risk-challenge.md if applicable, DESIGN.md if generated)
- [ ] `discovery-brief.md` generated with all 13 sections complete
- [ ] No sections left as TBD without explanation
- [ ] Summary presented to user and approved
- [ ] MonkeyPlan handoff offered (including DESIGN.md note if applicable)
- [ ] `phase_status.discovery_brief` set to `"completed"`
- [ ] `current_phase` set to `"completed"`
