---
name: framing
description: Phase 0 - Framing. Define the problem, constraints, and 2-4 candidate approaches to spike.
---

# Phase 0: Framing

## Purpose

Establish what you're exploring and which directions are worth spiking — before writing POC code.

## Welcome

```
"Welcome to Explore. We'll frame the problem, build throwaway POCs to learn,
iterate until you're confident, then capture a full design for @monkeytriage.

What feature or problem are you exploring?"
```

## Interview (one topic per message)

### Step 1: Problem

Capture in the user's words. Store as `framing.problem`.

### Step 2: Constraints

```
"What constraints matter for this exploration?
- Tech stack, existing services, timelines
- Must integrate with X, cannot change Y
- Performance, compliance, team skills"
```

Store as `framing.constraints`.

### Step 3: Success signal

```
"If exploration goes well, how will you know you picked the right direction?
- Measurable outcome, demo scenario, or risk removed"
```

Store as `framing.success_signal`.

### Step 4: Candidate approaches

```
"Let's name 2–4 approaches worth spiking — not final designs, just directions.
For each: a short name and one sentence on how it would work."
```

Help the user if they only have one idea — suggest variants (sync vs async, push vs pull, etc.).

Store as `framing.candidate_approaches[]` with `{ name, summary, spike_question }`.

## Output

Write `{workspace}/.explore/{feature-name}/options.md` using `templates/options-template.md`.

Update state:
```json
{
  "current_phase": "0",
  "phase_status": { "framing": "completed" },
  "framing": { ... }
}
```

## Exit

Ask preferences (POC location, prototype skill — see main SKILL.md), then:

```
"Framing complete. Ready to build POCs for: [list approaches]?"
```

On yes → `current_phase: "1"`, start `phases/01-spike.md`.
