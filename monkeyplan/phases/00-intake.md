---
name: intake
description: Phase 0 - Intake. Structured interview or document import that gathers all context before PRT generation begins. Ensures the agent has enough information to produce a high-quality PRT without back-and-forth during Phase 1.
---

# Phase 0: Intake

## Purpose

Gather all the context the agent needs to produce a high-quality PRT — **before** generation starts. This replaces the ad-hoc "clarify if vague" pattern with a structured process that works for any starting point: a rough idea, a detailed description, or an existing document.

## Why This Phase Exists

Without structured intake, the agent either:
- Generates a PRT from sparse input and fills it with assumptions, or
- Interrupts the user repeatedly during Phase 1A with clarifying questions

Phase 0 front-loads all discovery so Phase 1A can generate in a single pass with high confidence.

## Entry Points

Phase 0 begins by **checking for upstream artifacts**, then presenting a welcome message.

### Blueprint Detection (Path D Check — highest priority)

Before any other check, look for a technical blueprint from the `@scope` skill:

```
Read {workspace}/.monkeyplan/{feature-name}/blueprint.md
```

**If the file exists:** Skip the welcome message and go directly to [Path D: Blueprint Import](#path-d-blueprint-import).

### Explore Design Detection (Path E Check — after Path D, before Path C)

If no blueprint is found, check for a technical design handoff from the `@explore` skill:

```
Read {workspace}/.monkeyplan/{feature-name}/explore-handoff.json
```

**If the file exists** (and `explore-design/design.md` is present): Skip the welcome message and go directly to [Path E: Explore Design Import](#path-e-explore-design-import).

### Discovery Brief Detection (Path C Check)

If neither a blueprint nor an explore handoff is found, check for a discovery brief from the `@monkeythink` skill:

```
Read {workspace}/.monkeyplan/{feature-name}/discovery-brief.md
```

**If the file exists:** Skip the welcome message and go directly to [Path C: Discovery Brief Import](#path-c-discovery-brief-import).

**If none of these files exist:** Present the welcome message below.

### Welcome Message (when no upstream artifact is present)

```
"Welcome to MonkeyPlan. I'll help you create a structured Product Requirements Tracker.

How would you like to get started?

1. Guided interview — I'll walk you through a series of questions to capture your requirements step by step (best when starting from a rough idea)
2. Import existing document — Paste or attach an existing PRD, PRT, epic, spec, or requirements document and I'll extract the key information (best when you already have written material)"
```

Store the choice in state:
```json
{
  "intake": {
    "entry_point": "interview|import|direct|monkeythink|scope|explore",
    "status": "in_progress"
  }
}
```

---

## Path A: Guided Interview

A structured, step-by-step interview that collects the core inputs for PRT generation. Each step asks one focused question, waits for the answer, then moves to the next.

### Interview Sequence

#### Step 1: Scope Type

```
"What type of work is this?

1. New feature — net-new capability that doesn't exist today
2. Enhancement — improvement to an existing feature or flow
3. Internal tooling — ops tool, admin panel, or internal workflow
4. Integration — connecting two systems or adding a new data source
5. Other (describe briefly)"
```

Store as `intake.scope_type`.

#### Step 2: Feature Name

```
"What should we call this feature? (A short name I'll use for file naming and tracking — e.g., 'invoice-approval', 'campaign-dashboard', 'vendor-onboarding')"
```

If the user already provided a name in the initial `@monkeyplan for [feature]` invocation, confirm it:
```
"I'll use '{feature-name}' as the project name. Sound right, or would you prefer a different name?"
```

Store as `feature_name` (convert to kebab-case).

#### Step 3: Core Problem

```
"What problem does this solve? Describe in 2-3 sentences:
- What is broken, slow, or missing today?
- What do users currently have to do as a workaround (if anything)?"
```

Store as `intake.problem_statement`.

#### Step 4: Stakeholders & Users

```
"Who are the key people involved?

- **Primary users:** Who will use this feature day-to-day? (role names, e.g., 'Finance Ops Analyst', 'Campaign Manager')
- **Stakeholders:** Who needs to sign off or cares about the outcome? (e.g., 'VP of Finance', 'Product Lead')
- **Affected teams:** Any other teams impacted? (e.g., 'Engineering', 'QA', 'Design')"
```

Store as `intake.users` and `intake.stakeholders`.

#### Step 5: Business Goals

```
"What are the business goals or outcomes you're hoping for?

Examples:
- 'Reduce invoice processing time from 8 min to under 2 min'
- 'Eliminate manual data entry for campaign setup'
- 'Enable self-service vendor onboarding without ops team involvement'

List 1-3 goals. It's OK if they're approximate — we'll refine them in the PRT."
```

Store as `intake.business_goals`.

#### Step 6: Scope Boundaries

```
"Let's define the boundaries for this phase:

- **Must include:** What are the 2-4 things that absolutely must be in the first release?
- **Explicitly excluded:** What should we NOT build in this phase? (Even if it comes up later — naming exclusions now prevents scope creep)"
```

Store as `intake.in_scope` and `intake.out_of_scope`.

#### Step 7: Additional Context (optional)

```
"Anything else I should know? (Optional — skip if nothing comes to mind)

Examples of useful context:
- Existing API endpoints or data sources this connects to
- Compliance or regulatory constraints
- Timeline or deadline pressures
- Prior art — similar features in other parts of the product
- Links to Figma mockups, Jira epics, or Confluence pages"
```

Store as `intake.additional_context`.

#### Step 8: Review Summary

After collecting all answers, present a summary:

```
"Here's what I've captured:

**Feature:** {feature_name}
**Type:** {scope_type}
**Problem:** {problem_statement — 1-2 sentences}
**Primary users:** {users}
**Business goals:**
- {goal 1}
- {goal 2}
**In scope:** {in_scope items}
**Out of scope:** {out_of_scope items}
**Additional context:** {additional_context or 'None'}

Does this look right? I'll use this as the foundation for generating your PRT.

1. Looks good — proceed to preferences and PRT generation
2. I need to change something — (tell me what to update)"
```

If the user wants changes, update the relevant fields and re-present the summary.

### After Interview: Transition

Once the user approves the summary:
1. Save intake data to state.json under `intake` object
2. Run the **Codebase Dependency Scan** (see section below) if applicable
3. Mark `intake.status: "completed"`
4. Proceed to Initial Preferences Setup (Q&A logging, UI-facing, framework) — see the "Initial Preferences Setup" section in `SKILL.md`
5. Then proceed to Phase 1A — the agent uses the intake data as its source material instead of asking clarifying questions

---

## Path B: Import Existing Document

For users who already have written requirements — a PRD, PRT, epic, capability doc, spec, or any existing requirements artifact.

### Step 1: Receive the Document

```
"Paste or share your existing document below. I can work with:

- Product Requirements Documents (PRDs)
- PRTs / capability documents / epic descriptions
- Technical specs or design docs
- Jira epic/story descriptions
- Meeting notes or stakeholder emails
- Any other written requirements material

Paste the content directly, or tell me the file path if it's already in this workspace."
```

### Step 2: Extract & Summarize

After receiving the document, the agent extracts key information and maps it to PRT inputs:

```
"I've read your document. Here's what I extracted:

**Feature name:** {extracted or suggested}
**Problem statement:** {extracted}
**Users/personas:** {extracted}
**Business goals:** {extracted}
**In scope:** {extracted}
**Out of scope:** {extracted or '[NOT FOUND — I'll ask you]'}
**Additional context:** {anything else relevant}

**Gaps I noticed:**
- {List any PRT-critical information not found in the source document}
- {e.g., 'No success metrics mentioned', 'Scope exclusions not defined', 'User personas not identified'}

For the gaps, I'll either ask you directly or flag them as [ASSUMPTION] in the PRT.

Does this extraction look right?

1. Looks good — proceed to preferences and PRT generation
2. I need to correct something — (tell me what's wrong)
3. Fill the gaps now — ask me about the missing items"
```

### Step 3: Fill Gaps (if user chooses option 3)

For each gap identified, ask a targeted question:
```
"I noticed the source document doesn't mention [gap]. Quick question:
[Targeted question about the gap]"
```

Ask gaps one at a time, max 3 per message.

### Step 4: Confirm & Transition

Once the user approves the extraction:
1. Save extracted data to state.json under `intake` object, with `entry_point: "import"` and `source_document: "inline|filepath"`
2. Run **Delivery Phase Detection** (see section below) — detect phases in the source and, if present, ask which phase to build now
3. Run the **Codebase Dependency Scan** (see section below) if applicable
4. Mark `intake.status: "completed"`
5. Proceed to Initial Preferences Setup (Q&A logging, UI-facing, framework) — see the "Initial Preferences Setup" section in `SKILL.md`
6. Then proceed to Phase 1A — the agent uses extracted data (scoped to the active delivery phase) as source material

---

## Path C: Discovery Brief Import

For users who have completed the `@monkeythink` skill and have a discovery brief at `.monkeyplan/{feature-name}/discovery-brief.md`. This path auto-populates intake fields from the discovery brief and skips redundant questions.

### Step 1: Announce Discovery Brief Found

```
"I found a discovery brief at .monkeyplan/{feature-name}/discovery-brief.md from the MonkeyThink skill.
I'll use it to populate the intake fields — you won't need to answer questions already covered there.

Let me extract the relevant information..."
```

### Step 2: Extract and Map to Intake Fields

Read the discovery brief and map each section to PRT intake fields:

| Discovery Brief Section | PRT Intake Field |
|------------------------|-----------------|
| Problem Statement | `intake.problem_statement` |
| Who Is Affected → Primary users | `intake.users` |
| Who Is Affected → Secondary stakeholders | `intake.stakeholders` |
| The Opportunity + Success Criteria | `intake.business_goals` |
| Scope Sketch → MVP (in scope) | `intake.in_scope` |
| Scope Sketch → Explicitly excluded | `intake.out_of_scope` |
| Constraints | `intake.additional_context` |
| Prior Art and Context | append to `intake.additional_context` |
| Open Questions | `intake.gaps_identified` |

Also store:
```json
{
  "intake": {
    "entry_point": "monkeythink",
    "source_document": ".monkeyplan/{feature-name}/discovery-brief.md"
  }
}
```

### Step 3: Present Extracted Summary

```
"Here's what I extracted from the discovery brief:

**Feature:** {feature_name}
**Problem:** {problem_statement — 1-2 sentences}
**Primary users:** {users}
**Business goals / success criteria:**
- {goal/criterion 1}
- {goal/criterion 2}
**In scope:** {in_scope items}
**Out of scope:** {out_of_scope items}
**Constraints:** {constraints or 'None identified'}

**Open questions from the MonkeyThink session:**
{gaps_identified — as bullet list, or 'None'}

Does this look right? I'll use this as the foundation for generating your PRT.
These open questions will be flagged as [ASSUMPTION] items in the PRT.

1. Looks good — proceed to preferences and PRT generation
2. I need to change something — (tell me what to update)
3. Fill the open questions now — ask me about the unresolved items"
```

### Step 4: Fill Open Questions (if user chooses option 3)

For each open question from the discovery brief, ask a targeted question:
```
"The MonkeyThink session left this unresolved: '{open question}'.

{targeted follow-up question to resolve it}"
```

Ask questions one at a time, max 3 per message.

### Step 5: Confirm and Transition

Once the user approves:
1. Save extracted data to state.json under `intake` object
2. Run **Delivery Phase Detection** (see section below) — detect delivery phases in the discovery brief; if present, ask which phase to build now
3. Run the **Codebase Dependency Scan** (see section below) if applicable
4. Mark `intake.status: "completed"` and `intake.completed_at` with current timestamp
5. Proceed to Initial Preferences Setup — see the "Initial Preferences Setup" section in `SKILL.md`
6. Then proceed to Phase 1A — intake data from the discovery brief serves as source material

**Note:** The discovery brief's "Risks Acknowledged" section should be referenced in PRT Section 10 (Risks/Dependencies). The agent should proactively include these risks rather than waiting for the user to mention them.

---

## Path D: Blueprint Import

For features that have completed the `@scope` skill and have a blueprint at `.monkeyplan/{feature-name}/blueprint.md`. This path pre-fills the richest intake possible — epic sizing, dependency mapping, scope boundaries, and PM questions are all already resolved.

### Step 1: Announce Blueprint Found

```
"I found a technical blueprint at .monkeyplan/{feature-name}/blueprint.md from the @scope skill
(Eng + Product + Design have already signed off on this).
I'll use it to populate intake — you won't need to answer questions already covered there.

Let me extract the relevant information..."
```

### Step 2: Extract and Map to Intake Fields

Read the blueprint and map each section to PRT intake fields:

| Blueprint Section | PRT Intake Field |
|-------------------|-----------------|
| §1.1 Conceptual Architecture | `intake.additional_context` (architecture pattern + justification) |
| §1.2 Core Components | `intake.additional_context` (component list with org + team ownership) |
| §1.3 Data Flow | `intake.additional_context` (data flow narrative) |
| §1.4 Data Storage Strategy | `intake.additional_context` (storage recommendations) |
| §2.1 Candidate Epics + sizes + owning org/team | `intake.additional_context` (seeds Phase 3 epic breakdown, grouped by owning org; tag `[BLUEPRINT-EPICS]`) |
| §2.3 Most Complex Epic | `intake.additional_context` (schedule risk callout) |
| §3.1 Internal Dependencies | `intake.code_dependencies` (type: `integration_point`; carry org + owning team; tag `[BLUEPRINT-DEP]`) |
| §3.2 External Dependencies | `intake.code_dependencies` (type: `integration_point`; tag `[BLUEPRINT-DEP]`) |
| §3.3 Blocking Dependencies | `intake.code_dependencies` (type: `integration_point`; mark `blocking: true`; tag `[BLUEPRINT-BLOCKING]`) |
| §3.4 Impacted Teams | `intake.impacted_teams` (one entry per row: org, team, why involved, repos, `must_join_planning`, confidence; tag `[BLUEPRINT-TEAMS]`) |
| §3.5 Per-Org Scopes + cross-org table | `intake.additional_context` (one slice per org — outcome, its epics, its repos, what it needs from other orgs; tag `[BLUEPRINT-ORG-SCOPE]`) |
| §4.2 Questions for the PM | `intake.gaps_identified` (each question becomes an open item for PRT Section 10) |
| §5.1 Technical Assumptions | `intake.additional_context` (tagged `[BLUEPRINT-ASSUMPTION]`) |
| §5.2 NOT in Phase 1 (boundaries) | `intake.out_of_scope` (each exclusion tagged `[BLUEPRINT-BOUNDARY]`) |
| §5.3 Pending PRT inputs | `intake.gaps_identified` (any `status: pending` items) |

Also store:
```json
{
  "intake": {
    "entry_point": "scope",
    "source_document": ".monkeyplan/{feature-name}/blueprint.md"
  }
}
```

### Step 3: Present Extracted Summary

```
"Here's what I extracted from the technical blueprint:

**Architecture:** {pattern from §1.1}
**Key components:** {top 3-4 components with owning org/team from §1.2}
**Orgs / teams in scope ({count}):** {from §3.4 — mark those with must_join_planning}
**Candidate epics ({N} total):** {list from §2.1 with sizes, grouped by owning org}
**Most complex epic:** {from §2.3}
**Dependencies:**
  - Internal ({count}): {list with org + team}
  - External ({count}): {list}
  - Blocking ({count}): {list with unblock conditions}
  - Cross-org blockers ({count}): {from §3.5 — from-org → to-org, blocking only}
**Out of scope (Phase 1):** {boundaries from §5.2}
**Open questions for you (PM):** {from §4.2 and §5.3 pending items}

The candidate epics will seed Phase 3's epic breakdown, grouped by owning org so
work isn't collapsed into one team. Dependency, blocking, and impacted-team
information will appear in PRT Section 10 (and Section 1 Stakeholders).
Scope boundaries from §5.2 will anchor the PRT's Out of Scope section.

Does this look right?

1. Looks good — proceed to preferences and PRT generation
2. I need to correct something — (tell me what to update)
3. Review the open PM questions now — I'll walk through each one"
```

### Step 4: Walk Through PM Questions (if user chooses option 3)

For each gap from §4.2 and any `pending` items from §5.3, ask a targeted question one at a time (max 3 per message). Use the blueprint's "Default if no answer" column to offer a sensible default so the session doesn't block:

```
"The blueprint flagged this unresolved: '{question}'.
Default if skipped: '{default from blueprint}'.

{targeted follow-up to get the PM's decision}"
```

Resolved answers update the relevant intake fields and are added to `qa-log.md`.

### Step 5: Codebase Dependency Scan

When a blueprint is present, the dependency interrogation has already been done by `@scope`. **Skip the codebase dependency scan by default** and set `intake.code_scan: "skipped"`. If the scope type is `enhancement` or `integration`, offer it once:

```
"The blueprint already covers known dependencies. Want me to also scan the
codebase for any implementation-level dependencies the blueprint may not
have captured? (optional — blueprint coverage is usually sufficient)"
```

If the user declines, set `intake.code_scan: "skipped"` and proceed.

### Step 6: Confirm and Transition

Once the user approves:
1. Save extracted data to state.json under the `intake` object
2. Run **Delivery Phase Detection** (see section below) — detect delivery phases in the blueprint or its source document; if present, ask which phase to build
3. Mark `intake.status: "completed"` and `intake.completed_at` with current timestamp
4. Proceed to Initial Preferences Setup → Phase 1A

**Note:** Blueprint dependencies tagged `[BLUEPRINT-DEP]` and `[BLUEPRINT-BLOCKING]` are mapped into PRT Section 10 (Dependencies) with their owning org and team and, for blocking deps, their unblock conditions. Phase 3 must attribute each `[BLUEPRINT-DEP]` to an owning epic.

**Multi-org blueprints:** when `[BLUEPRINT-ORG-SCOPE]` slices are present, Phase 3 groups epics by owning org rather than producing one flat list, and preserves the `[BLUEPRINT-EPICS]` org/team tag on each epic it creates. `@scope` already resolved ownership from its sitemap — do not reassign an epic to a different team without telling the user why, and never collapse another org's epics into the locally checked-out team's.

---

## Path E: Explore Design Import

For features that have completed the `@explore` skill and handed off a **technical design** (not a discovery brief). Triggered by `.monkeyplan/{feature-name}/explore-handoff.json` and files under `.monkeyplan/{feature-name}/explore-design/`.

**This is not Path C.** Path C is for the `@monkeythink` discovery brief at `discovery-brief.md`. Do not use discovery-brief section mapping or announce "from the MonkeyThink skill."

### Step 1: Announce Explore Design Found

```
"I found a technical design from the @explore skill at .monkeyplan/{feature-name}/explore-design/
(engineering exploration: components, APIs, data model, interactions).
I'll extract intake from that design — not from a product discovery brief.

Let me read the explore design files..."
```

Read all files under `explore-design/` and `explore-reference/decision.md`.

### Step 2: Extract and Map to Intake Fields

| Explore Design File | PRT Intake Field |
|---------------------|------------------------------|
| `design.md` — problem, goals, overview | `problem_statement`, `business_goals`, `additional_context` |
| `design.md` — non-goals | `out_of_scope` |
| `components.md` | `additional_context` (architecture/components; tag `[EXPLORE-COMPONENTS]`) |
| `interactions.md` | `additional_context` (flows; tag `[EXPLORE-FLOWS]`) |
| `api.md` | `additional_context` (contracts; tag `[EXPLORE-API]`) |
| `data.md` | `additional_context` (data model; tag `[EXPLORE-DATA]`) |
| `explore-reference/decision.md` — chosen direction | `additional_context` (tag `[EXPLORE-DECISION]`) |
| `explore-reference/decision.md` — rejected options | `out_of_scope` or `additional_context` |
| `design.md` — open questions | `gaps_identified` |

Infer `scope_type` from the design (default `new_feature` or `enhancement` if modifying existing systems).

Store:
```json
{
  "intake": {
    "entry_point": "explore",
    "source_document": ".monkeyplan/{feature-name}/explore-design/design.md"
  }
}
```

### Step 3: Present Extracted Summary

Use the same confirmation pattern as Path B (Import Existing Document) — show extracted fields, gaps, and ask:
1. Looks good — proceed
2. Correct something
3. Fill gaps now

### Step 4: Confirm and Transition

Follow Path B after approval:
1. Save `intake` to state.json
2. Run **Delivery Phase Detection** if the explore design mentions phasing
3. Run **Codebase Dependency Scan** (recommended for explore handoffs — design may not list all code-level deps)
4. Mark `intake.status: "completed"`
5. Proceed to Initial Preferences Setup → Phase 1A

**Note:** POC code under `pocs/` is reference only — do not treat it as production scope. Link to it in PRT risks/assumptions if relevant.

---

## Delivery Phase Detection (Phased Source Documents)

**Purpose:** Imported documents (PRDs, discovery briefs, roadmaps) frequently describe the work as **delivery phases** — Phase 1 / MVP now, Phase 2 / Phase 3 later. Without phase awareness, PRT flattens everything into one undifferentiated scope and breaks down future roadmap work as if it were immediate. This step detects those delivery phases and asks the user **which phase to build now**, so the PRT and epic breakdown stay scoped to the immediate phase while future phases are preserved as roadmap.

> **Terminology:** "Delivery phase" / "milestone" here means a *product roadmap phase* in the source document (e.g., "Phase 1 — MVP"). This is distinct from the MonkeyPlan skill's own workflow Phases (0–3).

### When to Run

Run this step in **Path B (Import)**, **Path C (Discovery Brief Import)**, and **Path E (Explore Design Import)**, immediately after the extraction summary and before the Codebase Dependency Scan. Skip it for **Path A (Guided Interview)** unless the user describes their own phasing during the interview.

### Step 1: Detect Phases in the Source

Scan the imported document for delivery-phase signals:
- Explicit headings or labels: "Phase 1", "Phase 2", "MVP", "V1 / V2", "Milestone 1", "Now / Next / Later", "Fast-follow"
- Roadmap or timeline sections that group capabilities by release
- Scope language like "in the first release… / later we will…"

**If no phases are detected:** set `intake.delivery_phases` to `[]` and `intake.active_phase` to `null`, then continue to the Codebase Dependency Scan (single-phase feature — normal flow).

### Step 2: Present Detected Phases and Ask Which to Build

If phases are detected, present them and ask the user to choose the active phase:

```
"This document describes the work in delivery phases:

| Phase | Name | Summary | Items |
|-------|------|---------|-------|
| 1 | {phase 1 name} | {1-line summary} | {count of features/stories} |
| 2 | {phase 2 name} | {1-line summary} | {count} |
| 3 | {phase 3 name} | {1-line summary} | {count} |

Which phase would you like to work on now? I'll build the PRT and epic breakdown for that phase, and keep the others as roadmap (if you sync to a tracker, future phases can become placeholder parent items for planning).

1. Phase 1 ({name})
2. Phase 2 ({name})
3. Phase 3 ({name})
4. All phases — treat as a single scope (no phasing)"
```

### Step 3: Record the Selection

- Store all detected phases in `intake.delivery_phases[]` with `phase`, `name`, `summary`, `is_active`, and the `items` (features/stories) belonging to each.
- Set `intake.active_phase` to the chosen phase number (or `null` if the user picked "All phases").
- Mark the chosen phase `is_active: true`; all others `is_active: false`.
- Populate `intake.in_scope` from the **active phase's** items; move future-phase items into `intake.out_of_scope` annotated as `[ROADMAP — Phase N]` so they are visible but not built now.

The active phase drives PRT generation (Phase 1A) and epic breakdown (Phase 3); future phases are carried as roadmap and can become placeholder parent items at tracker-sync time.

---

## Codebase Dependency Scan (Code-Aware Intake)

**Purpose:** Surface technical dependencies the PM does not know to mention. Interview, import, and discovery-brief intake all capture dependencies from human knowledge only — they miss the ones hiding in the existing code (shared services with other consumers, schemas other features read, auth/middleware, feature flags, event producers/consumers). This step makes intake **code-aware** so those dependencies land in the PRT instead of being discovered late during implementation.

### When to Run

Run this step **after intake data is collected and before Initial Preferences Setup**, in any of these cases:
- `intake.scope_type` is `"enhancement"` or `"integration"` — **always run** (these extend existing systems by definition)
- `intake.scope_type` is `"new_feature"`, `"internal_tooling"`, or `"other"` — **offer it**, run only if the user accepts

**Skip entirely (do not offer) when:**
- The workspace is not a code repository (no source files — e.g. a docs-only or empty workspace), OR
- The user is a legacy/PM-only consumer who has no code access

If skipping, set `intake.code_scan: "skipped"` and continue. Never block intake on this step.

### How to Run

1. **Identify search targets** from the intake data: system/service/API names, data sources, module or feature names mentioned in `problem_statement`, `in_scope`, `additional_context`, and (Integration scope) the systems being connected.

2. **Search the codebase** for each target using `Glob` (find files/modules by name) and `Grep` (find references, callers, imports, route definitions, schema/table names, event names). For promising hits, `Read` the relevant file to confirm what it is and who depends on it.

3. **Classify each finding** as one of:
   - **Existing consumer** — code that already calls/imports the system this feature touches (changing it may break them)
   - **Shared resource** — schema, table, model, config, or feature flag read/written by more than this feature
   - **Integration point** — internal service boundary or external API the feature must connect through
   - **Reuse opportunity** — existing component/util/endpoint the feature can build on instead of duplicating

4. **Record findings** in `intake.code_dependencies` (see schema below). Keep each finding to one line: what it is, the file path, and why it matters.

### Present Findings to User

```
"I scanned the codebase for systems this feature touches. Here's what I found that may not be in your notes:

**Existing consumers (changing these may affect others):**
- {finding} ({path})

**Shared resources:**
- {finding} ({path})

**Integration points:**
- {finding} ({path})

**Reuse opportunities:**
- {finding} ({path})

I'll add these to the PRT's Dependencies and Data/Integrations sections, tagged [CODE-DERIVED] so reviewers know they came from the code, not the interview.

1. Looks right — include these
2. Adjust — (tell me what to drop or correct)"
```

If the scan finds nothing relevant, note that explicitly ("No existing code dependencies found for the named systems") and set `intake.code_scan: "completed"` with an empty `code_dependencies` list — do not fabricate dependencies.

### After the Scan

1. Save findings to `intake.code_dependencies` and set `intake.code_scan: "completed"` (or `"skipped"`)
2. Proceed to Initial Preferences Setup → Phase 1A
3. Phase 1A maps `code_dependencies` into PRT Section 7 (Data/Integrations) and Section 10 (Dependencies), each tagged `[CODE-DERIVED]`

---

### Intake State Schema

The intake object stored in state.json:

```json
{
  "intake": {
    "entry_point": "interview|import|direct|monkeythink|scope|explore",
    "status": "not_started|in_progress|completed",
    "scope_type": "new_feature|enhancement|internal_tooling|integration|other",
    "problem_statement": "string",
    "users": ["string"],
    "stakeholders": ["string"],
    "business_goals": ["string"],
    "in_scope": ["string"],
    "out_of_scope": ["string"],
    "additional_context": "string|null",
    "source_document": "inline|filepath|null",
    "gaps_identified": ["string"],
    "delivery_phases": [
      {
        "phase": 1,
        "name": "string (e.g., MVP)",
        "summary": "string",
        "is_active": true,
        "items": ["string (feature/story belonging to this phase)"]
      }
    ],
    "active_phase": "integer|null (null = no phasing / all phases)",
    "code_scan": "not_started|completed|skipped",
    "code_dependencies": [
      {
        "type": "existing_consumer|shared_resource|integration_point|reuse_opportunity",
        "description": "string",
        "path": "string (file or module path)"
      }
    ],
    "impacted_teams": [
      {
        "org": "string",
        "team": "string|UNKNOWN",
        "why_involved": "string",
        "repos": ["string"],
        "must_join_planning": true,
        "confidence": "high|medium|low"
      }
    ],
    "completed_at": "ISO8601 timestamp"
  }
}
```

---

## How Phase 1A Uses Intake Data

When Phase 1A starts and `intake.status` is `completed`, the agent should:

1. **Load intake data from state.json and skip clarifying questions** — all discovery has already been completed in Phase 0 (see Phase 1A Step 1: Load Intake Data in `phases/01-prt.md`)
2. **Map intake fields to PRT sections:**

| Intake Field | PRT Section |
|-------------|-------------|
| `problem_statement` | Section 2: Problem Statement |
| `users` | Section 2: User personas |
| `business_goals` | Section 1: Business Objectives |
| `in_scope` | Section 3: In Scope |
| `out_of_scope` | Section 3: Out of Scope |
| `stakeholders` | Section 1: Stakeholders, Section 9: Sign-off |
| `scope_type` | Informs tone and depth across all sections |
| `additional_context` | Distributed across relevant sections |
| `source_document` | Referenced in Appendix |

3. **Generate the PRT** in a single pass — the intake provides enough material that no additional clarifying questions should be needed

---

## Skipping Phase 0

Phase 0 is **not mandatory**. If the user provides a highly detailed description in their initial `@monkeyplan for [feature]` invocation (covers problem, users, scope, and goals), the agent may:

1. Assess that all 4 intake criteria are met (problem clear, users identified, scope bounded, goals stated)
2. Skip Phase 0 entirely
3. Set `intake.status: "completed"` with `entry_point: "direct"` and populate intake fields from the description
4. Proceed directly to Initial Preferences Setup → Phase 1A

The agent should announce: "Your description is detailed enough to start generating. Proceeding directly to PRT generation."

If the description is thin, the agent **must** run Phase 0.

---

## Definition of Done

Phase 0 is complete when:
- [ ] Entry point chosen (interview or import)
- [ ] All required fields populated: problem_statement, users, business_goals, in_scope, out_of_scope
- [ ] Summary presented to user and approved
- [ ] Intake data saved to state.json
- [ ] `intake.status` set to `"completed"`
