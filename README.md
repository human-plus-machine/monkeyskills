# MonkeySkills

<div align="center">
  <img src="logo.png" alt="MonkeySkills Logo" width="600" />

  <br />

  *AI-driven development lifecycle skills for Claude Code & Cursor*

  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

MonkeySkills is an open-source set of structured agent skills that take a product from raw idea to shipped feature. Each skill is markdown your agent follows, with resumable workspace state and handoffs between skills—no proprietary lock-in, and it works in Claude Code, Cursor, and similar IDEs.

> [!NOTE]
> Each install run **replaces** existing MonkeySkills files under the target locations you select (Claude, Cursor, or both).

## Installation

```bash
npx github:human-plus-machine/monkeyskills
```

On a TTY, the installer prompts for Claude only, Cursor only, or both (default). For CI or piped input, use `--both`, `--claude-only`, or `--cursor-only`, or set `MONKEYSKILLS_TARGETS` to `claude`, `cursor`, or `both`. Use `--dry-run` to preview without writing files. Cursor Task subagents are written to `~/.cursor/agents/`; Claude Code uses `~/.claude/subagents/`. Restart Claude Code or Cursor after installing. Skills show up in the `/` command list.

## Requirements

Node.js 18+ · Claude Code or Cursor

## Available Skills

- [**@monkeythink**](monkeythink/SKILL.md) — Problem framing, LLM council exploration, direction and risk review, optional UI concept from brand tokens, and a discovery brief for planning.
- [**@monkeyplan**](monkeyplan/SKILL.md) — Intake, full product requirements, UX ideation, and epic/story breakdown (including optional tracker upload).
- [**@monkeymode**](monkeymode/SKILL.md) — Design through acceptance: user stories, code specs, TDD-style implementation with parallel subagents, verification, integration, and acceptance testing.
- [**@commit**](commit-skill/SKILL.md) — Topic branches, phase-aware commits, optional PR body from MonkeyMode artifacts.

**Pipeline:** `@monkeythink` → `@monkeyplan` → `@monkeymode` → `@commit`

## State and subagents

Skills persist plain JSON and markdown under `.monkeythink/`, `.monkeyplan/`, and `.monkeymode/` in your project so you can resume or adjust phases between sessions. Full phase flow, TDD pipeline, and verification behavior are described in [monkeymode/SKILL.md](monkeymode/SKILL.md). Role-specific prompts for councils and build-time parallelism live under [`subagents/`](subagents/).

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
