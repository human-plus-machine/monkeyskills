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
  { id: 'claude', label: 'Claude Code', skillsDir: path.join(HOME, '.claude', 'skills'), subagentsDir: path.join(HOME, '.claude', 'subagents') },
  // Cursor Settings / Task tool read user subagents from ~/.cursor/agents (not …/subagents).
  { id: 'cursor', label: 'Cursor', skillsDir: path.join(HOME, '.cursor', 'skills'), subagentsDir: path.join(HOME, '.cursor', 'agents') },
];

const EXCLUDED_DIRS = new Set(['subagents', 'node_modules', '.git', '.github']);

// ── Helpers ──────────────────────────────────────────────────────────────────
function tildePath(p) {
  return p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p;
}

function pad(str, len) {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

/** Which app(s) to install into: Claude only, Cursor only, or both. */
async function resolveTargets() {
  if (args.includes('--claude-only')) return [ALL_TARGETS[0]];
  if (args.includes('--cursor-only')) return [ALL_TARGETS[1]];
  if (args.includes('--both')) return ALL_TARGETS;

  const env = (process.env.MONKEYSKILLS_TARGETS || '').toLowerCase();
  if (env === 'claude') return [ALL_TARGETS[0]];
  if (env === 'cursor') return [ALL_TARGETS[1]];
  if (env === 'both' || env === 'all' || env === 'claude,cursor' || env === 'cursor,claude') {
    return ALL_TARGETS;
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log(`\n${C.bold}Where should MonkeySkills be installed?${C.reset}`);
      console.log(`  ${C.cyan}[1]${C.reset} Claude Code only  ${C.gray}~/.claude/skills & subagents${C.reset}`);
      console.log(`  ${C.cyan}[2]${C.reset} Cursor only       ${C.gray}~/.cursor/skills & ~/.cursor/agents${C.reset}`);
      console.log(`  ${C.cyan}[3]${C.reset} Both              ${C.gray}(recommended if you use both)${C.reset}`);
      const line = (await rl.question(`\n${C.bold}Choice${C.reset} ${C.gray}[1-3, default 3]${C.reset}: `)).trim();
      if (line === '1') return [ALL_TARGETS[0]];
      if (line === '2') return [ALL_TARGETS[1]];
      return ALL_TARGETS;
    } finally {
      rl.close();
    }
  }

  console.log(
    `${C.gray}Non-interactive: installing to Claude Code and Cursor. ` +
    `Use --claude-only, --cursor-only, or --both; or set MONKEYSKILLS_TARGETS=claude|cursor|both.${C.reset}`
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
  if (!DRY_RUN) {
    for (const t of targets) {
      const d = path.join(t.subagentsDir, fileName);
      if (fs.existsSync(d)) fs.rmSync(d);
      fs.mkdirSync(t.subagentsDir, { recursive: true });
      fs.copyFileSync(srcFile, d);
    }
  }
  return true;
}

function restartHint(targets) {
  if (targets.length === 2) return 'Restart Claude Code and/or Cursor to pick up new skills.';
  if (targets[0].id === 'claude') return 'Restart Claude Code to pick up new skills.';
  return 'Restart Cursor to pick up new skills.';
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
        .map(t => tildePath(path.join(t.subagentsDir, file)))
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
