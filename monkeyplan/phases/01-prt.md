---
name: prt-generation
description: Phase 1 - PRT Generation. Phase 1A drafts a 10-section PRT through clarifying questions and structured generation. Phase 1B provides section-by-section review with the user.
---

# Phase 1: PRT Generation

## Purpose

Produce a structured Product Requirements Tracker that gives Product, Engineering, and Design a shared understanding of what is being built, why, and for whom — before a single line of code is written.

This phase is designed for **anyone with an idea** — PMs, designers, stakeholders — not just engineers. The output becomes the authoritative source of truth for all downstream phases.

## Sub-Phases

| Sub-Phase | Description |
|-----------|-------------|
| **1A: Draft** | Clarify + generate 10-section PRT |
| **1B: Review** | Section-by-section review, iterate on flagged sections |

Transition from 1A → 1B is **automatic** (no user confirmation needed). The agent generates the draft, saves it, and immediately presents the review summary.

## Output

A user-approved PRT saved to `.monkeyplan/{feature-name}/prt.md` covering all 10 sections from `templates/prt-template.md`.

## Core Principles

### Phase 0 As Source of Truth

Phase 1A relies on the structured intake data collected in Phase 0. If `intake.status` is `"completed"`, all discovery is done — skip ad-hoc clarifying questions and generate directly from the intake fields. Only ask targeted questions if intake is missing or incomplete (edge case / legacy flow).

### Complete Every Section

- Do NOT write "TBD" without a clear explanation of what decision is pending and who owns it
- Do NOT skip sections — if data is unavailable, write a reasonable assumption and flag it explicitly as `[ASSUMPTION]`
- Aim for actionable detail without fluff
- Use tables for requirements (Requirement ID | Description | Priority | Acceptance Criteria)

### Tone

Professional, neutral, fact-based. Like a senior PM writing for an engineering + stakeholder audience. No jargon, no padding, no vague language.

### Design System for All UI References

For any UI-facing feature, **always reference real design system components**. Never name generic HTML elements or made-up component names. If a required component doesn't exist in the project's design system, flag it explicitly as a custom component need.

---

## Phase 1A: Draft the PRT

### Step 1: Load Intake Data

Read `intake` from state.json. The intake object contains structured context gathered in Phase 0.

**If `intake.status` is `"completed"`:**
- Load all intake fields (problem_statement, users, stakeholders, business_goals, in_scope, out_of_scope, additional_context)
- Map intake fields to PRT sections (see mapping table in `phases/00-intake.md`)
- **Skip clarifying questions** — all discovery was done in Phase 0
- Proceed directly to Step 2

**If `intake.status` is `"skipped"` (detailed input provided upfront):**
- The intake object will still have fields populated from the user's original description
- Proceed directly to Step 2, noting any gaps as `[ASSUMPTION]` inline

**If intake data is missing or incomplete (legacy/edge case):**
- Fall back to the original clarification pattern: evaluate whether problem, users, scope, and goals are clear
- If 2 or more are unclear, ask 1-3 targeted questions before proceeding to Step 2
- If input is reasonably detailed, proceed directly to Step 2 and note assumptions inline

### Step 2: Generate the Draft PRT

Read `templates/prt-template.md` and fill every section. Follow the section-by-section guidance below.

#### Section 1 — Business Objectives

- State the primary goal in one sentence
- List 2-4 KPIs or business outcomes this drives (quantify where possible: "reduce processing time by 40%", "increase approval rate to 95%")
- Map to company priorities or OKRs if known; if not, flag as `[ASSUMPTION: maps to operational efficiency goals]`

#### Section 2 — Problem Statement / User Needs

- Describe current pain points concretely — what does the user have to do today that is broken, slow, or missing?
- Name the user personas/roles affected (e.g., "Finance Ops Analyst", "Campaign Manager", "Platform Admin")
- Include any supporting evidence: metrics, support tickets, user feedback, NPS data. If none available, flag as `[ASSUMPTION: based on stakeholder input]`

#### Section 3 — Scope

**In Scope:** List the core capabilities this feature delivers in this phase.
**Out of Scope:** Explicitly list exclusions. This is critical for managing expectations. Example: "Bulk approval is out of scope for Phase 1."

Be specific — vague scope leads to scope creep.

#### Section 4 — User Stories / Scenarios

**This is the most important section.** It connects business needs to concrete user actions.

Format every story as:
```
As a [role], I want [goal] so that [benefit].
```

Rules:
- Write at minimum 3-5 stories per feature
- Each story should be independently testable
- Assign a priority using the [Prioritization Heuristics](#prioritization-heuristics) below
- Include 1-2 high-level user journey flows as bullet steps (not full UX specs — that comes in Phase 2)

Example:
```
Story 1 (Must): As a Finance Ops Analyst, I want to view all pending invoices in a list so that I can prioritize which ones need immediate action.

Story 2 (Must): As a Finance Ops Analyst, I want to approve or reject an invoice with a single click so that I can process invoices without navigating to a separate screen.

Story 3 (Should): As a Finance Manager, I want to filter invoices by status, date range, and vendor so that I can find specific invoices quickly.

Journey: View list → Filter by status → Select invoice → Review details → Approve/Reject → Confirmation modal → Return to list
```

#### Section 5 — Functional Requirements

Use a requirements table:

| Requirement ID | Description | Priority | Acceptance Criteria |
|----------------|-------------|----------|---------------------|
| FR-001 | Users can view pending invoices in a sortable list | Must | Table shows invoice #, amount, due date, status; sortable columns; filter by status/date |
| FR-002 | Users can approve or reject an invoice | Must | Approve/Reject buttons visible; confirmation modal before action; status updates immediately |

Apply [Prioritization Heuristics](#prioritization-heuristics) to every requirement. See the dedicated section below.

#### Section 6 — UI/UX Requirements

- List layout and responsiveness expectations (e.g., "desktop-first, responsive to 1024px minimum")
- List key interactions (e.g., "Approve/Reject buttons trigger a confirmation modal before submitting")
- **Reference design system components by name** — use the project's actual design system catalog
  - Example: "Use the data table component for the invoice list with sortable columns"
  - Example: "Use the modal component for confirmation dialogs"
  - Example: "Use the button (primary variant) for the Approve action"
- Flag any interaction patterns not covered by the design system as custom component needs

#### Section 7 — Non-Functional Requirements

Address each of these explicitly:
- **Performance:** Target load time, concurrent user expectation (e.g., "page load < 2s; support 200 concurrent users")
- **Security:** Role-based access, data sensitivity, audit logging requirements
- **Accessibility:** WCAG 2.1 AA compliance using the design system's accessibility patterns
- **Browser/Device Support:** (e.g., "Chrome, Firefox, Edge — latest 2 versions; desktop only")
- **Data/Integrations:** API endpoints, mock data needs for prototype, downstream service dependencies

#### Section 8 — Design System & Implementation Notes

Always include for UI features:
```
- Design system: [name and version]
- Package: [package name]
- Documentation: [link]
```

List expected components by name (from the project's design system catalog).
List any tokens or styling rules that apply.
Flag custom component needs for the design team.

#### Section 9 — Success Metrics & Acceptance

- How will we measure success post-launch? (quantified where possible)
- Definition of Done: What must be true for this PRT → prototype → implementation to be considered complete?
- Who signs off at each stage? (PM, Design, Engineering Lead, QA)

#### Section 10 — Risks / Dependencies / Assumptions / Open Questions

- **Risks:** What could go wrong? What assumptions could be invalidated?
- **Dependencies:** Other features, teams, APIs, data sources that must be ready first
- **Assumptions:** Any assumption that if wrong would change the scope or approach
- **Open Questions:** Specific decisions still pending, with an owner and target date if possible

#### Appendix

The template includes an Appendix after Section 10. Fill it with:
- Links to related PRDs, epics, Jira tickets, or Confluence pages
- Links to Figma mockups/wireframes (or note "Wireframes to be created in Phase 2")
- Path to `ux-ideation.md` (placeholder until Phase 2 completes)
- Reference to source document if intake used Path B (import)

### After Step 2: Save Draft & Transition to 1B

1. Save the draft PRT to `.monkeyplan/{feature-name}/prt.md`
2. Update state.json: `current_phase: "1b"`, `prt_draft: "completed"`, `prt_review: "in_progress"`
3. **Immediately** proceed to Phase 1B (no user confirmation needed for this transition)

---

## Phase 1B: Section-by-Section Review

### Step 3: Present Draft Summary

After generating the draft, present a **one-line-per-section summary table** so the user can quickly see what's in each section without re-reading the entire document:

```
"Here's the draft PRT. I've summarized each section below:

| # | Section | Key Decisions / Content |
|---|---------|------------------------|
| 1 | Business Objectives | [1-line summary of goal and KPIs] |
| 2 | Problem Statement | [1-line summary of pain points and personas] |
| 3 | Scope | [1-line summary: N items in scope, M exclusions] |
| 4 | User Stories | [N stories: X Must, Y Should, Z Could] |
| 5 | Functional Requirements | [N requirements: X Must, Y Should, Z Could] |
| 6 | UI/UX Requirements | [1-line summary of layout and key components] |
| 7 | Non-Functional Requirements | [1-line summary of perf, security, a11y] |
| 8 | Design System | [Module variant, N components listed] |
| 9 | Success Metrics | [1-line summary of key metrics] |
| 10 | Risks / Open Questions | [N risks, M open questions] |

The full PRT is saved at .monkeyplan/{feature-name}/prt.md.

Which sections would you like me to revise? (List section numbers, or say 'looks good' to proceed to quality review.)"
```

### Step 3 Rules

- **Always** show this summary table — never skip it, even if the user seemed satisfied during intake
- The summary should highlight key decisions and assumptions, not repeat the full section text
- If the draft contains any `[ASSUMPTION]` flags, call them out explicitly: "Sections 2 and 10 contain assumptions I flagged — you may want to review those."

### Step 4: Iterate on Flagged Sections

For each section the user flags:

1. **Ask what needs changing** — "What specifically should change in Section [N]? (Missing info, wrong assumption, scope change, different priority, etc.)"
2. **Regenerate ONLY that section** — do not rewrite the entire PRT
3. **Show the updated section** inline in the conversation
4. **Ask if it's acceptable** — "Does this look right for Section [N]?"

Repeat until the user confirms all flagged sections are satisfactory.

**If the user says "looks good" immediately:**
- Proceed directly to quality review (Step 5)

**If the user flags multiple sections:**
- Address them one at a time in the order listed
- After all are resolved, present an updated summary table and ask: "All flagged sections updated. Anything else, or ready for quality review?"

### Step 5: Quality Review

Run through the quality checklist below. If any items fail, fix them before asking the user to advance.

---

## Prioritization Heuristics

When assigning Must/Should/Could/Won't to user stories and functional requirements, apply these rules:

### Must — Assign when ANY of these are true:
- The feature is non-functional without this requirement (core user journey blocker)
- The user story is on the critical happy path (user cannot complete the primary task without it)
- It's a security, compliance, or data integrity requirement
- The user explicitly called it out as essential or "must have"

### Should — Assign when ANY of these are true:
- It enhances the core journey but the journey still works without it (e.g., filtering, sorting, bulk actions)
- It's an efficiency/convenience feature for the primary persona
- It addresses a known pain point but has a manual workaround
- The user mentioned it without strong emphasis

### Could — Assign when ANY of these are true:
- It serves a secondary persona or a less common use case
- It's a polish/delight feature (animations, advanced customization, export options)
- It has value but is clearly deferrable to a later phase without impacting launch
- The user mentioned it as "nice to have" or "eventually"

### Won't (this phase) — Assign when ANY of these are true:
- The user explicitly excluded it
- It requires infrastructure, APIs, or dependencies not yet available
- It significantly expands scope beyond the stated problem
- It was mentioned as a "future" or "Phase 2" concern

### Sanity Check

**If more than 60% of requirements are marked Must, reconsider.** A PRT where everything is critical is a PRT where nothing is prioritized. Re-evaluate whether some Must items are actually Should — ask the user if needed.

### Tie-Breaking Rule

When in doubt between two priority levels, **ask the user:**
```
"I've marked [requirement] as [priority]. Should this be higher or lower?"
```

Do not guess priority for genuinely ambiguous requirements — surface the decision to the user.

---

## Quality Checklist for Phase 1

Before marking Phase 1 complete, verify:

#### Completeness
- [ ] All 10 sections filled — no empty sections
- [ ] Every "TBD" or assumption is explicitly flagged and explained
- [ ] At least 3 user stories written in correct format with priorities
- [ ] Functional requirements table has IDs, priorities, and acceptance criteria
- [ ] Section 8 includes design system package details (for UI features)

#### Quality
- [ ] Problem statement is concrete — not "improve the user experience" but specific pain points
- [ ] User stories are independently testable
- [ ] Scope exclusions are explicit (not just implied)
- [ ] Success metrics are measurable, not vague
- [ ] All UI component references are real design system components — no made-up names
- [ ] Prioritization follows heuristics — no more than 60% of requirements are Must

#### Clarity
- [ ] Could a developer read this and understand what to build?
- [ ] Could a designer read this and know what to wireframe?
- [ ] Could a QA engineer write test cases from the acceptance criteria?

#### Review Completeness
- [ ] Section-by-section summary was presented to the user in Phase 1B
- [ ] All user-flagged sections were revised and re-approved
- [ ] User explicitly approved the final PRT ("looks good" / "ready to proceed")

---

## Output Document

Save the completed PRT to `.monkeyplan/{feature-name}/prt.md` following the structure in `templates/prt-template.md`.

Update state.json:
```json
{
  "current_phase": "2",
  "phase_status": {
    "prt_draft": "completed",
    "prt_review": "completed"
  },
  "artifacts": {
    "prt": ".monkeyplan/{feature-name}/prt.md"
  }
}
```

Then ask: "Phase 1 (PRT) complete. [If ui_facing: true] Ready to move to Phase 2 (UX Ideation)? [If ui_facing: false] Would you like to proceed to the MonkeyMode handoff?"

---

## Anti-Patterns to Avoid

❌ **Generating without clarifying**
```
User: "PRT for a dashboard"
Agent: [generates 10-section PRT]
→ Wrong. Ask: "What kind of dashboard? Who uses it? What decisions does it support?"
```

❌ **Vague user stories**
```
"As a user, I want a better experience so that I can work faster."
→ Wrong. Name the role, be specific about the goal and the concrete benefit.
```

❌ **Made-up UI components**
```
"Use a table component with filters"
→ Wrong. Reference the actual component from the project's design system by its real name.
```

❌ **Missing scope exclusions**
```
Scope: "Build an invoice approval workflow"
→ Wrong. Explicitly call out: "Bulk approval, email notifications, and mobile support are out of scope for Phase 1."
```

❌ **Unmeasurable success metrics**
```
"Users will find the feature useful"
→ Wrong. "95% of invoices processed within same business day; task completion time reduced from 8 min to < 2 min"
```

❌ **Skipping the review cycle**
```
Agent: [generates PRT] "Phase 1 complete. Ready for Phase 2?"
→ Wrong. Always present the section summary table and let the user flag sections for revision.
```

❌ **Everything is Must**
```
FR-001: Must | FR-002: Must | FR-003: Must | FR-004: Must | FR-005: Must
→ Wrong. If >60% are Must, re-evaluate. Ask: "Are filtering and export truly blockers, or could they be Should?"
```

---

## Definition of Done

Phase 1 is complete when:
- [ ] All 10 PRT sections are filled
- [ ] Prioritization heuristics applied — no more than 60% Must
- [ ] Section-by-section review completed with user in Phase 1B
- [ ] All user-flagged sections revised and approved
- [ ] Quality checklist passes
- [ ] PRT saved to `.monkeyplan/{feature-name}/prt.md`
- [ ] state.json updated with `prt_draft: "completed"`, `prt_review: "completed"`
- [ ] User approves: "Yes, this PRT is ready to move forward"
