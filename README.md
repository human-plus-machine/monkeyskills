# MonkeySkills

<div align="center">
  <img src="logo.png" alt="MonkeySkills Logo" width="600" />

  <br />

  *AI-driven development lifecycle skills for Claude Code, Cursor & Codex CLI*

  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

MonkeySkills is an open-source set of structured agent skills that take a product from raw idea to shipped feature. Each skill is markdown your agent follows, with resumable workspace state and handoffs between skills—no proprietary lock-in, and it works in Claude Code, Cursor, Codex CLI, and similar IDEs.

> [!NOTE]
> Each install run **replaces** existing MonkeySkills files under the target locations you select (any combination of Claude, Cursor, and Codex).

## Installation

```bash
npx github:human-plus-machine/monkeyskills
```

On a TTY, the installer prompts for Claude only, Cursor only, Codex CLI only, or all three (default). For CI or piped input, use `--claude-only`, `--cursor-only`, `--codex-only`, `--both` (Claude + Cursor), or `--all`; or set `MONKEYSKILLS_TARGETS` to `claude`, `cursor`, `codex`, `both`, `all`, or a comma-separated list (e.g. `claude,codex`). Use `--dry-run` to preview without writing files. Restart the app(s) after installing. Skills show up in the `/` command list (Claude Code, Codex CLI) or via `@` mention (Cursor).

Skills install identically everywhere (`SKILL.md` + phases, copied as-is). Subagents don't: Claude Code and Cursor read them as markdown (`~/.claude/subagents/`, `~/.cursor/agents/`), but Codex CLI's custom agents are TOML (`~/.codex/agents/`), so the installer converts each subagent's frontmatter and body into a `name` / `description` / `developer_instructions` TOML file for that target — the `model:` field is dropped since Claude model IDs don't apply and Codex agents inherit the session's model by default. Codex's own delegation to a named agent is heuristic (it decides to spawn one when a task or skill instruction calls for it) rather than the explicit `Task tool` / `subagent_type` mechanism these skills were written against for Claude Code, so subagent handoffs may behave a little less predictably there.

## Requirements

Node.js 18+ · Claude Code, Cursor, or Codex CLI

## Available Skills

- [**@monkeythink**](monkeythink/SKILL.md) — Problem framing, LLM council exploration, direction and risk review, optional UI concept from brand tokens, and a discovery brief for planning.
- [**@monkeyplan**](monkeyplan/SKILL.md) — Intake, full product requirements, UX ideation, and epic/story breakdown (including optional tracker upload).
- [**@monkeymode**](monkeymode/SKILL.md) — Design through acceptance: user stories, code specs, TDD-style implementation with parallel subagents, verification, integration, and acceptance testing.
- [**@monkeysolve**](monkeysolve/SKILL.md) — Lighter, more autonomous sibling of MonkeyMode for a single problem or bug: surfaces unknowns before building (per Anthropic's "Finding Your Unknowns" field guide), implements and verifies with subagents, remembers each repo's verification method, and can run in-place, on a branch, or in an isolated worktree.
- [**@monkeycleaner**](monkeycleaner/SKILL.md) — Anti-slop review for code, designs, plans, and PRs: complexity, scalability/state, and observability gaps.
- [**@commit**](commit-skill/SKILL.md) — Topic branches, phase-aware commits, optional PR body from MonkeyMode or MonkeySolve artifacts.

**Full pipeline:** `@monkeythink` → `@monkeyplan` → `@monkeymode` → `@monkeycleaner` → `@commit`

**Lean pipeline (single problem):** `@monkeysolve` (design → implement → verify → finish) → `@monkeycleaner` → `@commit`

## State and subagents

Skills persist plain JSON and markdown under `.monkeythink/`, `.monkeyplan/`, `.monkeymode/`, and `.monkeysolve/` in your project so you can resume or adjust phases between sessions. Full phase flow, TDD pipeline, and verification behavior are described in [monkeymode/SKILL.md](monkeymode/SKILL.md); the leaner design/implement/verify/finish flow is in [monkeysolve/SKILL.md](monkeysolve/SKILL.md). Role-specific prompts for councils and build-time parallelism live under [`subagents/`](subagents/).

MonkeyThink’s UI Concept phase can use [Google’s DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/) for tokens; workflow detail is in [monkeythink/phases/02b-ui-concept.md](monkeythink/phases/02b-ui-concept.md).

## Support

If you need help or hit a problem with these skills, search existing issues or open a new one in the [GitHub issue tracker](https://github.com/human-plus-machine/monkeyskills/issues).

## Contributing

Contributions are welcome. You can help by:

- Reporting bugs or inaccuracies in the skill markdown (via issues).
- Suggesting new skills, phases, or integrations (feature requests welcome).
- Opening pull requests for fixes and improvements.

## License

You may use, modify, and distribute MonkeySkills under the MIT license. See the [`LICENSE`](LICENSE) file for details.
