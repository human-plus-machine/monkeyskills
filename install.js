#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

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
const REPO_ROOT     = __dirname;
const HOME          = os.homedir();
const CLAUDE_DIR    = path.join(HOME, '.claude');
const SKILLS_DIR    = path.join(CLAUDE_DIR, 'skills');
const SUBAGENTS_DIR = path.join(CLAUDE_DIR, 'subagents');

const EXCLUDED_DIRS = new Set(['subagents', 'node_modules', '.git', '.github']);

// ── Helpers ──────────────────────────────────────────────────────────────────
function tildePath(p) {
  return p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p;
}

function pad(str, len) {
  return str + ' '.repeat(Math.max(0, len - str.length));
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

/** Prompt user for a y/N answer synchronously (TTY only). */
function askOverwrite(name) {
  process.stdout.write(`  ${C.yellow}?${C.reset} "${name}" already installed. Overwrite? [y/N] `);
  try {
    const buf = Buffer.alloc(1);
    fs.readSync(0 /* stdin fd */, buf, 0, 1);
    process.stdout.write('\n');
    return buf.toString().toLowerCase() === 'y';
  } catch {
    process.stdout.write('\n');
    return false;
  }
}

/** Decide whether to overwrite an existing path. */
function shouldOverwrite(name) {
  if (!process.stdin.isTTY) {
    console.log(`  ${C.yellow}SKIP${C.reset}  ${name} — already installed`);
    return false;
  }
  return askOverwrite(name);
}

// ── Copy helpers ─────────────────────────────────────────────────────────────

function copySkill(srcDir, destDir, skillName) {
  if (fs.existsSync(destDir)) {
    if (!shouldOverwrite(skillName)) return false;
    if (!DRY_RUN) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
  }
  if (!DRY_RUN) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destDir, { recursive: true });
  }
  return true;
}

function copySubagent(srcFile, destFile) {
  if (fs.existsSync(destFile)) return false;
  if (!DRY_RUN) {
    fs.copyFileSync(srcFile, destFile);
  }
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const divider = '═'.repeat(50);

  console.log(`\n${C.bold}MonkeySkills Installer${C.reset}${DRY_RUN ? `  ${C.yellow}[dry run]${C.reset}` : ''}`);
  console.log(C.gray + divider + C.reset);

  // Ensure target dirs exist
  if (!DRY_RUN) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    fs.mkdirSync(SUBAGENTS_DIR, { recursive: true });
  }

  // ── Skills ──
  const skillDirs = findSkillDirs();
  console.log(`\nInstalling ${C.bold}${skillDirs.length} skills${C.reset} to ${C.cyan}${tildePath(SKILLS_DIR)}${C.reset}\n`);

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

    const dest = path.join(SKILLS_DIR, skillName);
    const ok = copySkill(src, dest, skillName);

    if (ok) {
      console.log(`  ${C.green}✓${C.reset}  ${pad(skillName, 16)} → ${C.gray}${tildePath(dest)}/${C.reset}`);
      installedSkills++;
    } else {
      skippedSkills++;
    }
  }

  // ── Subagents ──
  const subagentFiles = findSubagentFiles();
  if (subagentFiles.length > 0) {
    console.log(`\nInstalling ${C.bold}${subagentFiles.length} subagents${C.reset} to ${C.cyan}${tildePath(SUBAGENTS_DIR)}${C.reset}\n`);

    let installedSubagents = 0;

    for (const file of subagentFiles) {
      const src  = path.join(REPO_ROOT, 'subagents', file);
      const dest = path.join(SUBAGENTS_DIR, file);
      const ok   = copySubagent(src, dest);
      const label = file.replace('.md', '');
      if (ok) {
        console.log(`  ${C.green}✓${C.reset}  ${pad(label, 16)} → ${C.gray}${tildePath(dest)}${C.reset}`);
        installedSubagents++;
      } else {
        console.log(`  ${C.gray}–${C.reset}  ${pad(label, 16)}   already installed`);
      }
    }
  }

  // ── Summary ──
  console.log('\n' + C.gray + divider + C.reset);
  if (DRY_RUN) {
    console.log(`${C.yellow}Dry run complete.${C.reset} No files were written.\n`);
  } else {
    const parts = [];
    if (installedSkills > 0)  parts.push(`${C.green}${installedSkills} skill${installedSkills !== 1 ? 's' : ''}${C.reset}`);
    if (skippedSkills > 0)    parts.push(`${C.yellow}${skippedSkills} skipped${C.reset}`);
    console.log(`Done! ${parts.join(', ')} installed.`);
    console.log(`${C.gray}Restart Claude Code to activate new skills.${C.reset}\n`);
  }
}

try {
  main();
} catch (err) {
  console.error(`\n${C.red}Error:${C.reset}`, err.message);
  process.exit(1);
}
