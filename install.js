#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline/promises');

// ── ANSI colours (no chalk) ──────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  red:    '\x1b[31m',
};

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// ── Paths ────────────────────────────────────────────────────────────────────
const REPO_ROOT = __dirname;
const HOME      = os.homedir();

const ALL_TARGETS = [
  { id: 'claude', label: 'Claude Code', skillsDir: path.join(HOME, '.claude', 'skills'), subagentsDir: path.join(HOME, '.claude', 'subagents'), subagentFormat: 'md' },
  // Cursor Settings / Task tool read user subagents from ~/.cursor/agents (not …/subagents).
  { id: 'cursor', label: 'Cursor', skillsDir: path.join(HOME, '.cursor', 'skills'), subagentsDir: path.join(HOME, '.cursor', 'agents'), subagentFormat: 'md' },
  // Codex CLI reads skills from ~/.agents/skills (shared "agents" convention, not ~/.codex) and
  // custom agents as TOML from ~/.codex/agents (not markdown — see subagentToToml below).
  { id: 'codex', label: 'Codex CLI', skillsDir: path.join(HOME, '.agents', 'skills'), subagentsDir: path.join(HOME, '.codex', 'agents'), subagentFormat: 'toml' },
];

const TARGETS_BY_ID = new Map(ALL_TARGETS.map(t => [t.id, t]));

const EXCLUDED_DIRS = new Set(['subagents', 'node_modules', '.git', '.github']);

// ── Helpers ──────────────────────────────────────────────────────────────────
function tildePath(p) {
  return p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p;
}

function pad(str, len) {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

/** Which app(s) to install into: any single target, the legacy Claude+Cursor pair, or all three. */
async function resolveTargets() {
  if (args.includes('--claude-only')) return [TARGETS_BY_ID.get('claude')];
  if (args.includes('--cursor-only')) return [TARGETS_BY_ID.get('cursor')];
  if (args.includes('--codex-only')) return [TARGETS_BY_ID.get('codex')];
  if (args.includes('--both')) return [TARGETS_BY_ID.get('claude'), TARGETS_BY_ID.get('cursor')];
  if (args.includes('--all')) return ALL_TARGETS;

  const env = (process.env.MONKEYSKILLS_TARGETS || '').toLowerCase();
  if (env === 'claude') return [TARGETS_BY_ID.get('claude')];
  if (env === 'cursor') return [TARGETS_BY_ID.get('cursor')];
  if (env === 'codex') return [TARGETS_BY_ID.get('codex')];
  if (env === 'both') return [TARGETS_BY_ID.get('claude'), TARGETS_BY_ID.get('cursor')];
  if (env === 'all') return ALL_TARGETS;
  if (env) {
    const ids = env.split(',').map(s => s.trim()).filter(Boolean);
    const resolved = ids.map(id => TARGETS_BY_ID.get(id)).filter(Boolean);
    if (resolved.length > 0) return resolved;
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log(`\n${C.bold}Where should MonkeySkills be installed?${C.reset}`);
      console.log(`  ${C.cyan}[1]${C.reset} Claude Code only  ${C.gray}~/.claude/skills & subagents${C.reset}`);
      console.log(`  ${C.cyan}[2]${C.reset} Cursor only       ${C.gray}~/.cursor/skills & ~/.cursor/agents${C.reset}`);
      console.log(`  ${C.cyan}[3]${C.reset} Codex CLI only    ${C.gray}~/.agents/skills & ~/.codex/agents${C.reset}`);
      console.log(`  ${C.cyan}[4]${C.reset} All three         ${C.gray}(recommended if you use more than one)${C.reset}`);
      const line = (await rl.question(`\n${C.bold}Choice${C.reset} ${C.gray}[1-4, default 4]${C.reset}: `)).trim();
      if (line === '1') return [TARGETS_BY_ID.get('claude')];
      if (line === '2') return [TARGETS_BY_ID.get('cursor')];
      if (line === '3') return [TARGETS_BY_ID.get('codex')];
      return ALL_TARGETS;
    } finally {
      rl.close();
    }
  }

  console.log(
    `${C.gray}Non-interactive: installing to Claude Code, Cursor, and Codex CLI. ` +
    `Use --claude-only, --cursor-only, --codex-only, --both (Claude+Cursor), or --all; ` +
    `or set MONKEYSKILLS_TARGETS to claude|cursor|codex|both|all (comma-separated also works).${C.reset}`
  );
  return ALL_TARGETS;
}

/** Parse `name: value` from YAML frontmatter block. */
function parseSkillName(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const nameLine = match[1].split('\n').find(l => l.startsWith('name:'));
  if (!nameLine) return null;
  return nameLine.replace('name:', '').trim().replace(/^["']|["']$/g, '');
}

/** Find all directories in repoRoot that contain a SKILL.md file. */
function findSkillDirs() {
  return fs.readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !EXCLUDED_DIRS.has(d.name))
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(REPO_ROOT, name, 'SKILL.md')));
}

/** Find all .md files inside the subagents/ directory. */
function findSubagentFiles() {
  const dir = path.join(REPO_ROOT, 'subagents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md'));
}

/** Split a subagent .md file into {name, description, body} — body excludes the frontmatter block. */
function parseSubagentFile(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return null;
  const frontmatter = match[1];
  const body = match[2].trim();
  const nameLine = frontmatter.split('\n').find(l => l.startsWith('name:'));
  const descLine = frontmatter.split('\n').find(l => l.startsWith('description:'));
  if (!nameLine || !descLine) return null;
  return {
    name: nameLine.replace('name:', '').trim().replace(/^["']|["']$/g, ''),
    description: descLine.replace('description:', '').trim().replace(/^["']|["']$/g, ''),
    body,
  };
}

/** Escape a value for a TOML basic (double-quoted, single-line) string. */
function tomlBasicString(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Codex CLI custom agents are TOML, not markdown (developers.openai.com/codex/subagents).
 * Claude's `model:` frontmatter (e.g. "claude-4.6-sonnet") has no Codex equivalent, so it's
 * dropped — `model` is optional in Codex's schema and inherits from the parent session.
 * The body goes into `developer_instructions` as a TOML literal string ('''...''') so none of
 * the markdown's backslashes or quotes need escaping; only a literal ''' in the body would
 * break this, which install.js checks for at the call site.
 */
function subagentToToml({ name, description, body }) {
  return `name = "${tomlBasicString(name)}"\ndescription = "${tomlBasicString(description)}"\ndeveloper_instructions = '''\n${body}\n'''\n`;
}

// ── Copy helpers (always replace under chosen targets) ───────────────────────

function installSkillToTargets(srcDir, skillName, targets) {
  const destDirs = targets.map(t => path.join(t.skillsDir, skillName));
  if (!DRY_RUN) {
    for (const d of destDirs) {
      if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    }
    for (let i = 0; i < targets.length; i++) {
      const d = destDirs[i];
      fs.mkdirSync(d, { recursive: true });
      fs.cpSync(srcDir, d, { recursive: true });
    }
  }
  return true;
}

function installSubagentToTargets(srcFile, fileName, targets) {
  const mdContent = fs.readFileSync(srcFile, 'utf8');
  let parsed = null; // lazily parsed only if a toml target is present

  for (const t of targets) {
    const needsToml = t.subagentFormat === 'toml';
    const destName = needsToml ? fileName.replace(/\.md$/, '.toml') : fileName;
    const d = path.join(t.subagentsDir, destName);

    let content = mdContent;
    if (needsToml) {
      if (!parsed) {
        parsed = parseSubagentFile(mdContent);
        if (!parsed) throw new Error(`${srcFile}: could not parse name/description frontmatter for Codex TOML conversion`);
        if (parsed.body.includes("'''")) {
          throw new Error(`${srcFile}: body contains ''' which conflicts with the TOML literal-string delimiter used for Codex conversion`);
        }
      }
      content = subagentToToml(parsed);
    }

    if (!DRY_RUN) {
      if (fs.existsSync(d)) fs.rmSync(d);
      fs.mkdirSync(t.subagentsDir, { recursive: true });
      fs.writeFileSync(d, content);
    }
  }
  return true;
}

function restartHint(targets) {
  if (targets.length === 1) return `Restart ${targets[0].label} to pick up new skills.`;
  const labels = targets.map(t => t.label);
  const last = labels.pop();
  return `Restart ${labels.join(', ')} and/or ${last} to pick up new skills.`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const divider = '═'.repeat(50);
  const targets = await resolveTargets();

  console.log(`\n${C.bold}MonkeySkills Installer${C.reset}${DRY_RUN ? `  ${C.yellow}[dry run]${C.reset}` : ''}`);
  console.log(C.gray + divider + C.reset);
  console.log(`${C.gray}Installing to:${C.reset} ${targets.map(t => `${C.bold}${t.label}${C.reset}`).join(` ${C.gray}&${C.reset} `)}`);

  for (const t of targets) {
    if (!DRY_RUN) {
      fs.mkdirSync(t.skillsDir, { recursive: true });
      fs.mkdirSync(t.subagentsDir, { recursive: true });
    }
  }

  // ── Skills ──
  const skillDirs = findSkillDirs();
  const destSummary = targets
    .map(t => `${C.cyan}${tildePath(t.skillsDir)}${C.reset}`)
    .join(` ${C.gray}&${C.reset} `);
  console.log(`\nInstalling ${C.bold}${skillDirs.length} skills${C.reset} to ${destSummary}\n`);

  let installedSkills = 0;
  let skippedSkills = 0;

  for (const dirName of skillDirs) {
    const src = path.join(REPO_ROOT, dirName);
    const skillMdPath = path.join(src, 'SKILL.md');
    let skillName;
    try {
      skillName = parseSkillName(fs.readFileSync(skillMdPath, 'utf8'));
    } catch {
      skillName = null;
    }
    if (!skillName) {
      console.log(`  ${C.red}✗${C.reset}  ${dirName} — could not parse skill name from SKILL.md, skipping`);
      skippedSkills++;
      continue;
    }

    installSkillToTargets(src, skillName, targets);
    const destHint = targets
      .map(t => `${tildePath(path.join(t.skillsDir, skillName))}/`)
      .join(', ');
    console.log(`  ${C.green}✓${C.reset}  ${pad(skillName, 16)} → ${C.gray}${destHint}${C.reset}`);
    installedSkills++;
  }

  // ── Subagents ──
  const subagentFiles = findSubagentFiles();
  if (subagentFiles.length > 0) {
    const subDestSummary = targets
      .map(t => `${C.cyan}${tildePath(t.subagentsDir)}${C.reset}`)
      .join(` ${C.gray}&${C.reset} `);
    console.log(`\nInstalling ${C.bold}${subagentFiles.length} subagents${C.reset} to ${subDestSummary}\n`);

    for (const file of subagentFiles) {
      const src = path.join(REPO_ROOT, 'subagents', file);
      const label = file.replace('.md', '');
      installSubagentToTargets(src, file, targets);
      const destHint = targets
        .map(t => tildePath(path.join(t.subagentsDir, t.subagentFormat === 'toml' ? file.replace(/\.md$/, '.toml') : file)))
        .join(', ');
      console.log(`  ${C.green}✓${C.reset}  ${pad(label, 16)} → ${C.gray}${destHint}${C.reset}`);
    }
  }

  // ── Summary ──
  console.log('\n' + C.gray + divider + C.reset);
  if (DRY_RUN) {
    console.log(`${C.yellow}Dry run complete.${C.reset} No files were written.\n`);
  } else {
    const parts = [`${C.green}${installedSkills} skill${installedSkills !== 1 ? 's' : ''}${C.reset} installed`];
    if (skippedSkills > 0) {
      parts.push(`${C.yellow}${skippedSkills} skipped (invalid SKILL.md)${C.reset}`);
    }
    console.log(`Done! ${parts.join(', ')}.`);
    console.log(`${C.gray}${restartHint(targets)}${C.reset}\n`);
  }
}

main().catch(err => {
  console.error(`\n${C.red}Error:${C.reset}`, err.message);
  process.exit(1);
});
