# Invocation example

Shape of a review. Copy no wording into a different target.

```
@agent-authoring review agent-authoring/SKILL.md
```

**Branch:** skill (path exists).

**Before (before review):** Pass step 1 **Done when** always required mechanics in context, including on `AGENTS.md`. Close was one list, so an agent-doc run could apply YAML **invocation** rules. No “edit only the named target” guardrail.

**After:** Pass 1 gates SKILL-MECHANICS on the skill branch. Close splits all-targets vs skill-only. The agent edits only the named path; missing path → ask.
