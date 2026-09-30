---
name: agent-authoring
description: Author agent-facing docs so the process is predictable.
version: 1.0.0
author: MonkeyMode Contributors
disable-model-invocation: true
---

# Agent Authoring

**User invokes:** `@agent-authoring` / `/agent-authoring`

Author documents an agent consumes. Packaging differs; the levers do not. **Predictability** is the root virtue: the same _process_ every run, not the same output.

**Bold terms** are defined in [GLOSSARY.md](GLOSSARY.md). Look a term up when it is doing work.

This skill is the quality bar. Your agent host's skill scaffolder (e.g. a `create-skill` command) covers directories and frontmatter shape. Shape of a review: [examples/invocation.md](examples/invocation.md).

Edit **only** the named target. If the path is missing or ambiguous, ask. Do not rewrite `GLOSSARY.md`, `LEVERS.md`, sibling files, or any other path unless it is the named target.

## Pass

1. **Target.** Name the path. If it does not exist, ask; do not invent it. Pick one **branch**: **skill** · **agent doc** (`AGENTS.md`, `CLAUDE.md`, or another pointed doc).
   Skill branch only: read [SKILL-MECHANICS.md](SKILL-MECHANICS.md). Agent-doc branch: skip SKILL-MECHANICS.
   **Done when:** the path exists and is named, the branch is named, and (skill branch only) mechanics are in context.

2. **Write.** Read [LEVERS.md](LEVERS.md) and apply it to the target until **Close** is true. Apply each lever; do not summarize LEVERS.md back to the user.
   **Done when:** every item in **Close** that applies to this **branch** is true of the saved target.

## Close

All targets:

- Every **step** (if any) ends on a checkable **completion criterion**.
- Every heading in LEVERS.md has a visible effect on the target, or an explicit N/A.
- Each meaning has one **single source of truth**.
- **Negation** appears only as a hard guardrail, paired with the positive target.

Skill branch only (N/A on **agent doc**):

- Every **context pointer** front-loads a **leading word** and lists one trigger per **branch**.
- Skill **invocation** matches SKILL-MECHANICS: **model-invoked** only if the agent or another skill must fire it.
- A split exists only where the invocation or sequence cut earns it.

If the draft still rushes, sprawls, or points weakly, diagnose from the _failure mode_ entries in GLOSSARY.md.
