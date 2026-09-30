# Skill mechanics

The skill **branch** of [agent-authoring](SKILL.md): frontmatter, **invocation**, **router skill**. Writing the body is [LEVERS.md](LEVERS.md). Terms: [GLOSSARY.md](GLOSSARY.md).

## Invocation

- **Model-invoked** — keep a **description**. The agent can fire it; other skills can reach it; the human can still type the name. The **description** is the always-loaded **context pointer**: **context load** for discoverability. Omit `disable-model-invocation`. Write a model-facing **description** with trigger **branches** (pointer rules in LEVERS.md). An all-**reference** model-invoked skill can be the shared home other skills invoke.
- **User-invoked** — set `disable-model-invocation: true`. Only the human typing the name can reach it; no other skill can. Zero **context load**. The **description** is human-facing: one-line summary, trigger lists stripped.

Pick **model-invoked** only when the agent must fire it, or another skill must. Otherwise **user-invoked**.

Shared **reference** two **user-invoked** skills both need cannot live in either (neither can fire the other). Put it in **external reference** any skill can point at.

## Splitting by invocation

Split off a **model-invoked** skill when a distinct **leading word** should trigger it on its own (a word you actually use), or another skill must reach it. That **description** is permanent **context load**; the independent reach has to be worth it. The sequence cut lives in LEVERS.md.

## Router skills

When **user-invoked** skills multiply past what the human can remember, one **router skill** names the others and when to reach for each. It can hint, never fire: they are not in the agent's catalog.
