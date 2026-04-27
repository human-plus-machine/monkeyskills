# MonkeySkills

A suite of Claude Code skills for structured AI-assisted development.

## Install

Run this one command to install all skills and subagents into Claude Code:

```bash
npx github:VibeEffect/MonkeySkills
```

**Options:**
```bash
npx github:VibeEffect/MonkeySkills --force     # overwrite existing installs
npx github:VibeEffect/MonkeySkills --dry-run   # preview without writing
```

Restart Claude Code after installing. Skills will appear in the `/` command list.

---

## Skills

| Skill | Description |
|---|---|
| `commit` | Git workflow — topic branches, per-story commits, optional PRs |
| `monkeymode` | Full self design → develop → deploy with structured phases |
| `monkeyplan` | Product requirements, UX ideation, and epic breakdown |
| `monkeythink` | Problem framing + LLM council exploration + discovery brief |

## Requirements

- Node.js 18+
- Claude Code CLI
