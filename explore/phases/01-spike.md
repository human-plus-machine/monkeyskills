---
name: spike
description: Phase 1 - Spike/POC. Build throwaway runnable POCs for each candidate approach.
---

# Phase 1: Spike / POC

## Purpose

Build the smallest **runnable** artifacts that answer each candidate's `spike_question`.

Inspired by common throwaway-prototype practice: the code is disposable; the verdict is what matters.

## POC Rules (Non-Negotiable)

1. **Throwaway from day one** — live under `pocs/{feature-name}/{variant}/` or agreed branch `prototype/{feature}`
2. **One question per POC** — from `options.md`; state it in a `README.md` inside the POC folder
3. **One command to run** — document in POC README and `state.json` `pocs[].run_command`
4. **No production imports** — production code must not import from `pocs/`; POCs may copy snippets, not vice versa
5. **Minimal polish** — no tests unless verifying test behavior; no shared libraries; in-memory or local-only deps unless persistence is the question
6. **Surface state** — logs, CLI output, or UI must show what happened so the user can judge
7. **README header** — first line: `# THROWAWAY POC — NOT PRODUCTION`

## Steps

### 1. Plan spikes

For each active candidate in `framing.candidate_approaches`, confirm:
- Folder path
- Spike question (falsifiable)
- Expected run command
- Which repo (if multi-repo workspace)

Present plan; user confirms which to build now (may not build all at once).

### 2. Build POCs

For each confirmed variant:
- Create folder and minimal runnable code
- Add `README.md` with question, how to run, what to observe
- Update `state.json` `pocs[]`

**Logic / integration spikes:** Runnable service, script, or main-class — whatever answers the question fastest.

**UI-only spikes:** If `context.prototype_skill_enabled`, invoke `@prototype for {feature}` with mode greenfield and variant names from options. Record HTML paths in state; do not duplicate in `pocs/` unless also testing integration.

### 3. Verify runnable

Agent runs or asks user to run each `run_command`. If it fails, fix until runnable or document blocker in `iteration-log.md`.

### 4. Hand off to iteration

When at least one POC runs:
```json
{
  "current_phase": "2",
  "phase_status": { "spike": "completed", "iteration": "in_progress" }
}
```

Announce: "POCs are ready. Run them and we'll iterate in Phase 2."

Start `phases/02-iteration.md` — **do not** ask for phase confirmation for 1→2.

## Spike vs tracer bullet

| | Explore POC | Tracer bullet / @monkeytriage |
|---|-------------|------------------------|
| Purpose | Answer a question | Become production |
| Quality | Disposable | Production-grade |
| Survives | Verdict only | The code |

If the user wants production code, stop Explore and hand off to `@monkeytriage`.
