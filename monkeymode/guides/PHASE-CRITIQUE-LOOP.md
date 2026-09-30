---
name: phase-critique-loop
description: Optional user-invoked critique-and-fix loop for a completed MonkeyMode phase. Normative for Full and Lite (Lite resolves this guide as sibling from the active skill install root).
---

# MonkeyMode Phase Critique Loop

Normative for MonkeyMode and Lite. Lite resolves this guide as a sibling from the active skill install root; do not duplicate under `monkeymode-lite/`.

This loop is **optional**. If the user never asks, Full and Lite behave as they did without this guide: finish the phase, update state, checkpoint or auto-advance as those skills already specify. **NEVER** start this loop on your own. **NEVER** prompt after every phase asking whether to critique. **NEVER** block `current_phase` advance, `phase_status: completed`, user checkpoints, or Lite auto-advance on critique.

---

## Tune: max fix cycles (single knob)

**`MAX_FIX_CYCLES = 1`**

Change **only this number** to retune how many fix cycles this loop may run. Do not hardcode a cycle count anywhere else in this guide or in SKILL/phase files.

- Initial critique and confirming clean critique are **not** counted against `MAX_FIX_CYCLES`.
- Loop condition: `fix_iteration < MAX_FIX_CYCLES`.
- When `fix_iteration` reaches `MAX_FIX_CYCLES` with unwaived Critical/High still open → `CRITIQUE_ESCALATE`.

---

## Purpose

When the **user asks**, run a fresh critique of the phase that just finished. The user must opt in with an explicit phrase (see **Invocation**). Do not invent a thorough-critique pass they did not request.

The loop exists to catch:

- missing unit tests
- missing null, empty, invalid, error, and boundary cases
- incomplete required phase deliverables (files, contracts, errors, test plans)
- unfinished TODOs or placeholders that leave the phase incomplete
- documentation inconsistent with code
- contradictions between design, stories, acceptance criteria, code specs, code, and tests
- dead or unused code
- weak assertions and untestable acceptance criteria

This loop is **additive**. Do not replace or weaken existing phase checklists, tests/linters, Phase 5 verification/rework, Phase 6 post-integration verification, Phase 7 acceptance/human-UI checks, or user confirmation checkpoints. It does **not** replace those checks even when the user invokes it.

Do not add product requirements or expand MonkeyMode's scope.

---

## When to Run

**Default: do not run.** Start this guide only when the user opts in (Invocation phrases below) **and** you have an explicit eligible `completed_phase_key`.

### Full — eligible `completed_phase_key` values

| Phase | `completed_phase_key` |
|-------|----------------------|
| 1A Discovery | `design_1a` |
| 1B Contracts | `design_1b` |
| 1C Operations | `design_1c` |
| 2 User Stories | `user_stories` |
| 2B Acceptance Checklist | `acceptance_checklist` |
| 3 Code Spec | `code_spec` |
| 4 Implementation | `implementation` |
| 5 Verification | `verification` |
| 6 Integration | `integration` |
| 7 Acceptance | `acceptance` |

### Lite — eligible `completed_phase_key` values

| Phase | `completed_phase_key` |
|-------|----------------------|
| Design | `design` |
| Code Spec | `code_spec` |
| Implementation | `implementation` |
| Verification | `verification` |

---

## Placement (only after the user asked)

1. Phase normal work and existing checks may already be finished (or the user asks right after they finish).
2. Run this guide with an explicit `completed_phase_key`.
3. Existing Full/Lite checkpoints and auto-advance are **independent** of this loop. If the user never asked, skip this guide entirely.

**MUST:** Pass the explicit `completed_phase_key` for the phase the user wants critiqued (the phase that just finished).

**NEVER:** Infer the completed phase from `current_phase` (some guides advance it early). If which phase is ambiguous, **ask the user** — do not guess.

### Timing special cases (when the user asked)

| Phase | When to run, if asked |
|-------|----------------------|
| Full Phase 3 (`code_spec`) | Once after **all** story specs are ready — not per story |
| Full Phase 4 (`implementation`) | Once after **all** stories and normal test/lint checks finish — **not per batch** |
| Full Phase 5 (`verification`) | Existing verifier/reworker runs **first**; critique afterward |
| Full Phase 6 (`integration`) | Post-integration verification runs **first**; critique afterward |
| Full Phase 7 (`acceptance`) | Unconfirmed human/UI checks stay in the existing human flow; failed automated/security checks remain blocking |
| Feature-level clean pass | Do not run while an unwaived story remains `verification_failed` |

---

## Invocation

**Orchestrator starts this guide only on these user phrases**:

- `run phase critique`
- `critique this phase`
- `critique the phase we just finished`

Map the request to the phase that **just finished** and pass that key explicitly. If more than one phase could apply, ask which — do not infer from `current_phase`.

Phase files do **not** install a mandatory stub. At most a one-liner: critique is optional — only if the user asks; see this guide.

Shared rules when the user **did** ask:

- `feature` comes from `state.json` → `feature_name`.
- Do not intentionally log secrets, tokens, credentials, or unredacted PII.
- Lite: missing sibling guide → `CRITIQUE_ESCALATE` with install hint; safe fixes inline; earlier-phase defects return to Design or Code Spec.
- If the user asked **before** they are ready to leave the phase, finish or resolve this loop (PASS, user skip, or ESCALATE resolved) before you treat critique as done. That does **not** mean the default pipeline waits on critique.

### Required inputs

| Input | Source | Notes |
|-------|--------|-------|
| `feature` | `state.json` → `feature_name` | Kebab-case feature name |
| `completed_phase_key` | User request + eligible table | Must be allowlisted under **When to Run**; never inferred from `current_phase` |
| Guide path | `guides/PHASE-CRITIQUE-LOOP.md` | Relative to Full skill root; Lite resolves sibling Full path |

### Lite guide resolution

From the active Lite skill install root, resolve the sibling Full guide relatively (same parent directory). Canonical repo source: `monkeymode/guides/PHASE-CRITIQUE-LOOP.md` (install may map to `monkeymode/guides/`). **NEVER** hardcode user-home install paths, absolute Windows paths, or mirror-sync instructions in skill text.

---

## Three Critique Lenses

Every critique pass reads current artifacts and approved baselines from disk and applies all three lenses.

### Completeness

- Everything required by the current phase guide is present.
- Applicable requirements, acceptance criteria, and approved design decisions are covered.
- Required files, contracts, errors, tests, documentation, and operational concerns are present.
- Assumptions and open questions are explicit.

### Consistency

- Current artifacts agree with approved earlier artifacts.
- Design ↔ stories ↔ acceptance criteria ↔ code spec ↔ code ↔ tests agree where applicable.
- Names, signatures, types, behavior, errors, defaults, nullability, examples, and documentation are not stale or contradictory.

### Defect and quality hunt

For docs/specs: ambiguous or untestable criteria; missing null/empty/invalid/error/boundary/negative/required-security cases; incomplete file lists, contracts, or test plans.

For code/tests: missing tests required by spec/AC; missing null/empty/invalid/error/boundary tests; dead or unused code; documentation that no longer matches behavior; weak assertions; unfinished TODOs or placeholders.

---

## Findings vs Improvements

A **finding** is a concrete defect, omission, contradiction, or verifiable quality gap against an applicable requirement, approved baseline, phase checklist, or existing implementation contract.

Do **not** report stylistic preferences, speculative improvements, or "this could be better" ideas as blocking findings.

**False-positive discipline:** When evidence is insufficient, omit the finding or mark it uncertain/non-blocking — never Critical/High. Do not block on guesses (e.g. "there may be a concurrency issue"). Critical/High require exact baseline evidence (path + requirement text).

---

## Severity

| Severity | Blocks PASS? | Summary |
|----------|--------------|---------|
| Critical | Yes | Missing/wrong required behavior, broken approved contract, security defect, contradiction that invalidates the phase, or missing tests for an explicit acceptance criterion |
| High | Yes | Material completeness or likely-defect gap — required null/error cases, behavioral doc/code mismatch, misleading dead code, untestable criteria |
| Medium | No | Useful clarity or maintainability improvement that does not invalidate the phase |
| Low | No | Wording, style, or optional polish |

- Critical and High block **critique PASS**. They do **not** extra-block phase advance, user checkpoints, or Lite auto-advance. **Medium and Low are logged but do not keep the loop running.**
- Every Critical/High finding cites the baseline path and exact supporting requirement or checklist item.
- If uncertain between High and Medium, use **High**.
- **Security defects are never Medium/Low.**
- Medium/Low still need **concrete evidence**; prefer omitting low-value notes over log noise. Do not emit optional recommendations or style spam.

---

## Approved Baselines

| `completed_phase_key` | Approved baselines |
|-----------------------|-------------------|
| `design_1a` | Codebase conventions + architect context if present |
| `design_1b` | 1A |
| `design_1c` | 1A–1B |
| `user_stories` | 1A–1C |
| `acceptance_checklist` | stories + 1A–1C |
| `code_spec` | stories, acceptance checklist, design |
| `implementation` | relevant code specs + design |
| `verification` | code specs, AC, design, source, tests, verifier results |
| `integration` | all story specs, design contracts, integration code/tests |
| `acceptance` | acceptance checklist, persisted results, known issues, design |
| Lite `design` / `code_spec` / `implementation` / `verification` | earlier Lite artifacts + current source/tests when applicable |

**Persist before critic:** If verifier or acceptance evidence exists only in chat or tool output, persist it to `critique-log.md` **before** launching the critic.

---

## Primacy, Safe Fixes, and Earlier-Phase Defects

**Approved artifact > current-artifact consistency.**

- **NEVER** silently modify an approved baseline merely to make the current phase pass.
- Even a restorative typo/wording fix in an already-approved earlier artifact needs explicit user/architect re-approval first.
- Do **not** weaken, delete, or contradict an earlier requirement merely to make the current phase pass.

A **safe fix** restores consistency, completeness, test coverage, or hygiene **without** introducing new product requirements, changing an approved architectural/design decision, or expanding the current phase's scope.

Apply **only** safe fixes that belong to the **current phase**. Otherwise escalate for user/architect approval, or route as an earlier-phase defect.

**Earlier-phase defect:** the earlier approved artifact is incorrect (not merely that the current artifact is inconsistent with a still-correct baseline).

Do **not** modify the current artifact merely to conceal that inconsistency.

| Track | Action |
|-------|--------|
| **Full** | Invoke existing `phases/rework.md` cascade |
| **Lite** | Return inline to **Design** or **Code Spec** with user notification |

---

## Independent Critic and Model Policy

For every critique pass, spawn a **fresh** independent critic. The fixer **never** self-certifies; a new critic pass always rechecks fixes.

### Spawn contract

```text
Task:
  subagent_type: general-purpose
  model: inherit
  NEVER pass another model slug (unknown model names may be skipped, not substituted)
  read-only: MUST NOT edit files
```

- Critic is **read-only** — reports findings only; does **not** edit files.
- Orchestrator or existing Full rework flow applies fixes. Lite fixes remain inline.
- If an independent critic cannot run → **ESCALATE** (never self-certify).
- Malformed/incomplete critic response → retry once → still unusable → **ESCALATE**; **never** treat as CLEAN.

### Model policy

For critic Tasks and any spawned critique-fixer Task: pass **`inherit` only**. Do not hardcode model slugs.

Lite inline fixes may use the orchestrator model; a fresh independent critic (`inherit`) must recheck them.

---

## Critic Request and Response

### Request (orchestrator → critic)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `feature` | string | yes | Kebab-case feature name |
| `phase_key` | string | yes | `completed_phase_key` |
| `pass_number` | int | yes | Critique pass index |
| `confirming_pass` | bool | yes | `true` for confirming clean pass |
| `target_paths` | string[] | yes | Current-phase artifacts |
| `baseline_paths` | string[] | yes | Approved predecessor artifacts |
| `open_findings` | object[] | yes | Permanent IDs still open |
| `waived_findings` | string[] | yes | IDs not to reopen as blockers |

### Response (critic → orchestrator)

```text
- New findings: temporary ID | severity | location | baseline evidence | issue | recommended action
  (safe current-phase fix | earlier-phase rework | escalate for approval)
- Recheck each open permanent ID: fixed | still open | regressed
- Verdict: CLEAN | FINDINGS
```

`CLEAN` only when no unwaived Critical/High remains; otherwise `FINDINGS`.

---

## Critic Prompt Template

Use this template for every critic Task. Populate placeholders from the request fields.

```text
You are the read-only MonkeyMode Phase Critic. Do not modify files.

Feature: {feature}
Completed phase: {phase_key}
Pass: {pass_number}
Confirming pass: {true_or_false}

Current artifacts:
{target_paths}

Approved baselines:
{baseline_paths}

Open Critical/High findings:
{open_findings}

User-waived findings (audit only, not blocking):
{waived_findings}

Read the files from disk and apply all three lenses:
1. Completeness
2. Consistency
3. Defect and quality hunt

Focus on missing tests, null/empty/invalid/error/boundary cases,
incomplete required deliverables, unfinished TODOs/placeholders,
doc/code drift, dead code, weak assertions, and untestable criteria.

Do not invent requirements.
Do not propose new features, requirements, architecture, or behavior merely to improve quality.
Evaluate only against existing requirements, approved decisions, phase expectations, and implemented contracts.

A finding must be a concrete defect, omission, contradiction, or verifiable quality gap.
Do not report stylistic preferences or speculative improvements as blocking findings.
Medium/Low findings also need concrete evidence; do not emit optional recommendations or style notes just to fill the log.
When evidence is insufficient, omit the finding or mark it uncertain/non-blocking—never Critical/High.

Approved baselines outrank current-phase convenience.
If an earlier approved artifact appears incorrect, say so explicitly as an earlier-phase defect.
Do not recommend concealing that by changing the current artifact alone, and do not recommend weakening or deleting the earlier requirement merely to make the current phase pass.
Do not recommend silently editing an approved baseline merely so the current phase can pass.

Critical/High findings require exact baseline evidence.

Return:
- New findings: temporary ID | severity | location | baseline evidence | issue | recommended action (safe current-phase fix | earlier-phase rework | escalate for approval)
- Recheck each open permanent ID: fixed | still open | regressed
- Verdict: CLEAN only when no unwaived Critical/High remains; otherwise FINDINGS
```

If the response is malformed or incomplete, retry once. If still unusable, **ESCALATE**; never treat it as CLEAN.

---

## Critique Loop

The **`MAX_FIX_CYCLES` limit applies to fix cycles, not critique passes**. Initial critique and final confirming critique are **outside** that count. Read the number from [Tune: max fix cycles](#tune-max-fix-cycles-single-knob) — never substitute a different literal.

A **fix cycle** is: apply safe current-phase fixes → run applicable tests/linters if needed → run a new critique.

```text
run initial fresh critique          # NOT a fix cycle

while Critical/High remain AND fix_iteration < MAX_FIX_CYCLES:
    apply only safe current-phase fixes
    else escalate OR route earlier-phase defect
    if code/tests changed → run applicable tests/linters
    run new critique                # counts with that fix cycle

if Critical/High remain → ESCALATE
else:
    run confirming clean critique   # NOT a fix cycle
    PASS only if also no Critical/High
```

### Loop rules

- `fix_iteration` counts **fix cycles only**; initial and confirming critiques are **not counted**.
- Earlier findings remain open until fixed, waived, or correctly routed as earlier-phase defects; "no new findings" is **not** enough.
- A regressed finding reopens under the **same ID**.
- Same or substantially equivalent finding repeatedly reopens after fixes → **ESCALATE** (oscillation). No separate oscillation framework — use judgment from finding IDs and logs.
- After code/test fixes, test or lint failures are **Critical** findings.
- If a Phase 3/4 target is too large for one critic context, **split by story**, review every story, share the same `MAX_FIX_CYCLES` phase budget, and confirm each split is clean. Do **not** add a separate batching framework.

---

## Confirming Clean Pass

After all Critical/High are resolved (or routed/waived), run one **confirming clean critique**:

- Must be **independent and fresh** (fixer cannot self-certify).
- Same phase scope and baseline context as the preceding clean critique.
- **Not counted** as a fix cycle.
- Do not unnecessarily repeat expensive non-critic work (e.g. full test suite) unless the confirming pass itself requires new code/test changes.
- **PASS** only if confirming pass also finds no unwaived Critical/High.

Set `confirming_clean_pass_completed: true` in state when the confirming pass completes cleanly.

---

## Finding IDs and Waivers

- Orchestrator assigns permanent IDs: `C/{phase-key}/{number}` (e.g. `C/code_spec/3`)
- IDs are **never reused**
- Critic labels new findings `NEW-1`, `NEW-2`, …; orchestrator assigns permanent IDs
- Repeated findings retain the existing ID

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `C/{phase-key}/{number}` |
| `severity` | enum | Critical \| High \| Medium \| Low |
| `location` | string | file/section |
| `baseline_evidence` | string | exact path + requirement text |
| `issue` | string | concrete defect/omission/contradiction |
| `action` | enum | safe_fix \| earlier_phase_rework \| escalate |
| `status` | enum | open \| fixed \| waived \| regressed |

**Waivers:** User says `waive <finding IDs>` — log in `waived_findings`; remain in audit log but do **not** block PASS; pass waived IDs to each new critic so they are not reopened as blockers.

---

## State (`phase_critique`)

Minimal addition to `.monkeymode/{feature}/state.json`:

```json
{
  "phase_critique": {
    "<completed-phase-key>": {
      "status": "running|pass|escalate|skipped|waived",
      "fix_iteration": 0,
      "next_finding_number": 1,
      "confirming_clean_pass_completed": false,
      "open_findings": [],
      "waived_findings": [],
      "model_used": null,
      "last_run_at": null
    }
  }
}
```

Resume an in-progress critique from this state and the logs. Absence of `phase_critique` for a phase means "not yet run."

---

## Logging

Append every critique pass and fix result to:

1. `.monkeymode/{feature}/qa-log.md`
2. `.monkeymode/{feature}/critique-log.md`

| Field | Content |
|-------|---------|
| Completed phase | `completed_phase_key` |
| Pass/fix cycle | pass number and/or `fix_iteration` |
| Model used | critic model from model policy |
| Findings and fixes | IDs, severity, actions taken |
| Tests/linters | commands run and result |
| Remaining Critical/High | count or list |
| Verdict | `CONTINUE`, `PASS`, or `ESCALATE` |

Do not paste secrets, tokens, credentials, or PII into logs.

---

## User Controls

| Phrase | Effect |
|--------|--------|
| `skip critique for this phase` | Log skip; set status `skipped`; critique is done. Existing checkpoints / Lite advance still own leaving the phase |
| `waive <finding IDs>` | Audit in `waived_findings`; non-blocking |
| `continue critique` | After ESCALATE, authorize another bounded cycle |

Skip and waive must be **user-initiated** — the orchestrator cannot skip or waive on its own.

---

## Terminal Outcomes

| Outcome | Code | When | Orchestrator action |
|---------|------|------|---------------------|
| PASS | `CRITIQUE_PASS` | No unwaived Critical/High after confirming clean pass | Critique complete; do not extra-block the existing checkpoint / Lite advance |
| CONTINUE | `CRITIQUE_CONTINUE` | Critical/High remain; fix cycle applied | Loop while `fix_iteration < MAX_FIX_CYCLES` |
| ESCALATE | `CRITIQUE_ESCALATE` | `MAX_FIX_CYCLES` fix cycles exhausted, oscillation, critic unavailable/malformed after retry, or non-safe fix needed | Stop; ask user |
| SKIPPED | `CRITIQUE_SKIPPED` | User said `skip critique for this phase` | Log skip; critique is done; do not extra-block advance |
| WAIVED | `CRITIQUE_WAIVED` (partial) | User waived named finding IDs | Keep in audit log; do not block |

---

## Explicitly Out of Scope

Do **not** add: separate finding DB/workflow engine; complicated finding lifecycle beyond this guide; separate critic skill; automatic severity scoring; configurable rules engine; elaborate batching framework/state machine; another orchestration abstraction; new approval vocabulary elsewhere in MonkeyMode.

Resume from `phase_critique` state + logs only.

---

## Security

- Critic is read-only; does not edit files.
- Evaluate only against approved baselines and existing requirements — **do not invent** requirements.
- **NEVER** silently edit approved baselines to pass.
- Security defects are never Medium/Low.
- Do not paste secrets, tokens, credentials, or PII into `qa-log.md` or `critique-log.md`.
