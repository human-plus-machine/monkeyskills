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
const REPO_ROOT = __dirname;
const HOME      = os.homedir();

/** Install roots: Claude Code and Cursor (same layout under each home subdir). */
const INSTALL_TARGETS = [
  { label: 'Claude Code', skillsDir: path.join(HOME, '.claude', 'skills'), subagentsDir: path.join(HOME, '.claude', 'subagents') },
  { label: 'Cursor',      skillsDir: path.join(HOME, '.cursor', 'skills'), subagentsDir: path.join(HOME, '.cursor', 'subagents') },
];

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
  process.stdout.write(`  ${C.yellow}?${C.reset} "${name}" already installed in at least one location. Overwrite everywhere? [y/N] `);
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

/** True if we should write (no existing dirs / files, or user agreed, or dry-run with hypothetical yes not needed — dry-run still lists). */
function shouldOverwriteAnywhere(displayName, anyExists) {
  if (!anyExists) return true;
  if (!process.stdin.isTTY) {
    console.log(`  ${C.yellow}SKIP${C.reset}  ${displayName} — already installed`);
    return false;
  }
  return askOverwrite(displayName);
}

// ── Copy helpers ─────────────────────────────────────────────────────────────

/** Install one skill directory to every target; one overwrite decision if any path exists. */
function installSkillToAllTargets(srcDir, skillName) {
  const destDirs = INSTALL_TARGETS.map(t => path.join(t.skillsDir, skillName));
  const anyExists = destDirs.some(d => fs.existsSync(d));
  if (!shouldOverwriteAnywhere(skillName, anyExists)) return false;

  if (!DRY_RUN) {
    for (const d of destDirs) {
      if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    }
    for (let i = 0; i < INSTALL_TARGETS.length; i++) {
      const d = destDirs[i];
      fs.mkdirSync(d, { recursive: true });
      fs.cpSync(srcDir, d, { recursive: true });
    }
  }
  return true;
}

/** Install one subagent file to every target; same overwrite rule if any destination exists. */
function installSubagentToAllTargets(srcFile, fileName, label) {
  const destFiles = INSTALL_TARGETS.map(t => path.join(t.subagentsDir, fileName));
  const anyExists = destFiles.some(d => fs.existsSync(d));
  if (!shouldOverwriteAnywhere(label, anyExists)) return false;

  if (!DRY_RUN) {
    for (let i = 0; i < INSTALL_TARGETS.length; i++) {
      const t = INSTALL_TARGETS[i];
      const d = destFiles[i];
      if (fs.existsSync(d)) fs.rmSync(d);
      fs.mkdirSync(t.subagentsDir, { recursive: true });
      fs.copyFileSync(srcFile, d);
    }
  }
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const divider = '═'.repeat(50);

  console.log(`\n${C.bold}MonkeySkills Installer${C.reset}${DRY_RUN ? `  ${C.yellow}[dry run]${C.reset}` : ''}`);
  console.log(C.gray + divider + C.reset);
  console.log(`${C.gray}Targets:${C.reset} ${INSTALL_TARGETS.map(t => t.label).join(', ')}`);

  for (const t of INSTALL_TARGETS) {
    if (!DRY_RUN) {
      fs.mkdirSync(t.skillsDir, { recursive: true });
      fs.mkdirSync(t.subagentsDir, { recursive: true });
    }
  }

  // ── Skills ──
  const skillDirs = findSkillDirs();
  const destSummary = INSTALL_TARGETS
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

    const ok = installSkillToAllTargets(src, skillName);

    if (ok) {
      const destHint = INSTALL_TARGETS
        .map(t => `${tildePath(path.join(t.skillsDir, skillName))}/`)
        .join(', ');
      console.log(`  ${C.green}✓${C.reset}  ${pad(skillName, 16)} → ${C.gray}${destHint}${C.reset}`);
      installedSkills++;
    } else {
      skippedSkills++;
    }
  }

  // ── Subagents ──
  const subagentFiles = findSubagentFiles();
  if (subagentFiles.length > 0) {
    const subDestSummary = INSTALL_TARGETS
      .map(t => `${C.cyan}${tildePath(t.subagentsDir)}${C.reset}`)
      .join(` ${C.gray}&${C.reset} `);
    console.log(`\nInstalling ${C.bold}${subagentFiles.length} subagents${C.reset} to ${subDestSummary}\n`);

    let installedSubagents = 0;
    let skippedSubagents = 0;

    for (const file of subagentFiles) {
      const src   = path.join(REPO_ROOT, 'subagents', file);
      const label = file.replace('.md', '');
      const ok    = installSubagentToAllTargets(src, file, `subagent:${label}`);

      if (ok) {
        const destHint = INSTALL_TARGETS
          .map(t => tildePath(path.join(t.subagentsDir, file)))
          .join(', ');
        console.log(`  ${C.green}✓${C.reset}  ${pad(label, 16)} → ${C.gray}${destHint}${C.reset}`);
        installedSubagents++;
      } else {
        console.log(`  ${C.gray}–${C.reset}  ${pad(label, 16)}   skipped`);
        skippedSubagents++;
      }
    }
  }

  // ── Summary ──
  console.log('\n' + C.gray + divider + C.reset);
  if (DRY_RUN) {
    console.log(`${C.yellow}Dry run complete.${C.reset} No files were written.\n`);
  } else {
    const parts = [];
    if (installedSkills > 0) {
      parts.push(`${C.green}${installedSkills} skill${installedSkills !== 1 ? 's' : ''}${C.reset} installed`);
    }
    if (skippedSkills > 0) {
      parts.push(`${C.yellow}${skippedSkills} skill${skippedSkills !== 1 ? 's' : ''} skipped${C.reset}`);
    }
    const msg = parts.length > 0 ? parts.join(', ') + '.' : 'No skill changes.';
    console.log(`Done! ${msg}`);
    console.log(`${C.gray}Restart Claude Code and/or Cursor to pick up new skills.${C.reset}\n`);
  }
}

try {
  main();
} catch (err) {
  console.error(`\n${C.red}Error:${C.reset}`, err.message);
  process.exit(1);
}
