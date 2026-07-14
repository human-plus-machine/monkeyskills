---
name: design
description: Phase 1 - Design. Surfaces unknowns before any code is written, using the "Finding Your Unknowns" methodology - blind spot pass, brainstorm/prototype, interview, references, and a plan that flags decisions most likely to change. Ends with explicit user approval.
---

# Phase 1: Design

## Purpose

The quality of agentic work is bottlenecked by how well ambiguity is resolved *before* implementation starts, not after. This phase exists to close the gap between the map (the user's request) and the territory (the actual codebase and problem constraints) — so Phase 2 builds the right thing instead of a plausible guess.

Unknowns come in four flavors. Name the one you're chasing — it changes what to do about it:

| Type | What it means | What to do |
|---|---|---|
| **Known knowns** | Stated explicitly in the request | Just use it |
| **Known unknowns** | A gap you can see | Ask the user, or spike it |
| **Unknown knowns** | Obvious to the user, unstated because it's "obvious" | Draw it out with specific questions, not open-ended ones |
| **Unknown unknowns** | Neither of you has named it yet | Run a Blind Spot Pass (Step 1) |

## Step 1: Blind Spot Pass

Before asking the user anything, spend a few minutes finding **unknown unknowns** — gaps neither of you would think to mention because they're not on either of your radars yet.

Read the relevant part of the codebase (the area the problem touches) and ask, silently, of yourself:
- What would surprise me about this codebase if I started implementing right now?
- What existing behavior might this change break that isn't mentioned in the request?
- Is there a naming/pattern/convention here that contradicts what a generic solution would do?
- Are there tests, feature flags, config, or docs that imply a constraint nobody stated?
- Does this touch auth, money, PII, or anything else where "probably fine" isn't good enough?

Write down what you find as candidate unknowns — don't resolve them yet, just surface them. This becomes the seed of `unknowns.md`.

## Step 2: Interview

Ask the user questions **one at a time** — never stack multiple questions into one message; users answer only the first or give abbreviated answers to both. Skip any question the user's original request already answered.

Cover, in order, only what's still open after the Blind Spot Pass:

**The problem**
- What's broken, missing, or slow today? What does "solved" look like?
- What's explicitly out of scope?

**Constraints**
- Any technical constraints (must integrate with X, backend is Y)?
- Any constraints from the Blind Spot Pass you need confirmed or denied?

**References** *(see Step 4 — ask for these explicitly, don't assume none exist)*
- Is there an existing feature, file, or pattern that does something similar I should match?

**Unknown knowns** — for anything you suspect is "obvious" to the user but unstated, ask a *specific* question rather than an open one:
- Bad: "Any other requirements?"
- Good: "When this fails partway through, should it roll back completely or leave partial state?"

If the user's initial request is already detailed enough to answer most of these, say so, present what you extracted, and only ask about what's still missing — don't force a full interview on a fully-specified request.

## Step 3: Verify with a Spike

**Never let an unverified assumption about third-party/library/API/runtime behavior become load-bearing in the plan.** If you're about to write "I believe X" or "this probably works," that's a spike trigger, not a caveat to ship.

**How to spike (in priority order):**
1. Inspect the actual installed code/types for the pinned version — highest confidence
2. Run a minimal reproduction
3. Read official docs/changelogs for the pinned version
4. Web search last, and distrust it — if a source contradicts the installed code, the installed code wins

**Record every spike result in `plan.md`:** what was verified, the evidence, and the implication. If a spike retires a prior assumption, say so explicitly rather than leaving a stale caveat elsewhere in the doc.

Keep it time-boxed — a spike answers one factual question. If it balloons into open-ended exploration, stop and surface the uncertainty to the user as an explicit open decision instead.

## Step 4: References

Prefer pointing at existing code over describing desired behavior in prose — source is richer and more precise than a description. Before finalizing the plan:
- Ask the user (Step 2) for anything they know matches the desired pattern
- Independently search the codebase for the closest existing analog (similar endpoint, similar component, similar migration)
- List every reference in `plan.md` with a one-line note on what to copy from it and what to deviate from

## Step 5: Brainstorm / Prototype (only if the approach is genuinely open)

Skip this step if there's one obvious approach (most bug fixes, small features). Use it when there are 2-3 materially different ways to solve the problem.

Present each approach briefly:
```markdown
### Approach A: [name]
**How it works:** [1-2 sentences]
**Pros:** ...
**Cons:** ...

### Approach B: [name]
...

**Recommendation:** [which, and why]
```

Get the user's pick before writing the full plan — don't let this become a full MonkeyMode-style ADR unless the decision genuinely warrants it (irreversible, expensive, affects other teams).

## Step 6: Write the Plan

The plan is the "Implementation Plan" from the Fable methodology: a document that **explicitly flags the decisions most likely to change** during implementation, rather than presenting everything with false confidence. This is what solve-implementer and solve-verifier will work from — treat it as the spec.

Save to `.monkeysolve/{problem-name}/plan.md`:

```markdown
# Plan: {problem-name}

## Problem
{1-3 sentences — what's broken/missing, for whom, and what "solved" looks like}

## Out of Scope
{explicit non-goals}

## Approach
{the chosen approach, 1 paragraph. If Step 5 ran, link to the rejected alternatives and why.}

## References
{existing code to follow: path — what to copy, what to deviate from}

## Spikes
{for each: the question, the evidence, the implication. "None needed" if the plan has no
third-party/library/runtime claims that needed verification.}

## Work Breakdown
{The files this problem touches and the acceptance criteria for each. MonkeySolve implements
this as one piece of work by one subagent (see phases/02-implement.md) — if the breakdown
genuinely splits into independent parallel streams, this problem has outgrown MonkeySolve;
use @monkeymode instead.}

- Files to create: [...]
- Files to modify: [...]
- Acceptance criteria: [...]

## Decisions Most Likely to Change
{Fable's core idea: don't hide uncertainty behind false confidence. List every decision in
this plan you're least sure about, and what would make you reconsider it. This is what
solve-implementer checks against when something doesn't fit during implementation — see
"Conservative Pivoting" in phases/02-implement.md.}

- {decision}: confident because {evidence}, would reconsider if {signal}

## Open Questions
{anything genuinely unresolved that isn't blocking — carried into unknowns.md too}
```

Also save `.monkeysolve/{problem-name}/unknowns.md` — the running log from Steps 1-2, kept even after the plan is approved (Phase 2/3 append to it if new unknowns surface).

## Step 7: Approval Gate

Present the plan summary (not necessarily the full file) and ask explicitly:

```
"Plan complete for '{problem-name}'. Summary:
- Approach: {one line}
- Files touched: {count} create, {count} modify
- Spikes run: {count}
- Open questions: {count, or 'none'}

Ready to move to Phase 2 (Implement)?"
```

**Do not start Phase 2 without explicit approval.** If the user wants changes, update `plan.md` and re-present.

## Definition of Done

Phase 1 is complete when:
- [ ] Blind Spot Pass run and findings folded into the interview or the plan
- [ ] All open questions from the interview resolved (asked one at a time) or explicitly deferred to `unknowns.md`
- [ ] Every load-bearing third-party/library/runtime claim is spike-verified or flagged as an open decision — no unverified "probably works" in `plan.md`
- [ ] At least one reference cited, or "no existing analog found" stated explicitly
- [ ] "Decisions Most Likely to Change" section is non-empty unless the plan is genuinely low-risk
- [ ] User approves: "Yes, this plan makes sense"
- [ ] `plan.md` and `unknowns.md` saved to `.monkeysolve/{problem-name}/`
