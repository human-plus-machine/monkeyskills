#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline/promises');
const { rewriteModelForClaude } = require('./lib/models');

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

// Skills-only targets have no subagentsDir: subagent-based phases fall back to inline execution.
// Doc sources (verified 2026-09):
//  - Windsurf: https://docs.windsurf.com/windsurf/cascade/skills (redirects to https://docs.devin.ai/desktop/cascade/skills)
//    global skills: ~/.codeium/windsurf/skills/<name>/SKILL.md (name + description frontmatter). No subagent docs found.
//  - Codex CLI: https://developers.openai.com/codex/skills -> user skills in $HOME/.agents/skills
//  - Gemini CLI: https://geminicli.com/docs/cli/skills/ -> user skills in ~/.gemini/skills or ~/.agents/skills
//    (Gemini subagents exist at ~/.gemini/agents but use Gemini model ids; not installed.)
//  - GitHub Copilot: https://docs.github.com/en/copilot/concepts/agents/about-agent-skills -> personal skills in ~/.copilot/skills
const ALL_TARGETS = [
  { id: 'claude', label: 'Claude Code', skillsDir: path.join(HOME, '.claude', 'skills'), subagentsDir: path.join(HOME, '.claude', 'agents'), mapModels: true },
  // Cursor Settings / Task tool read user subagents from ~/.cursor/agents (not …/subagents).
  { id: 'cursor', label: 'Cursor', skillsDir: path.join(HOME, '.cursor', 'skills'), subagentsDir: path.join(HOME, '.cursor', 'agents') },
  { id: 'windsurf', label: 'Windsurf', skillsDir: path.join(HOME, '.codeium', 'windsurf', 'skills'), subagentsDir: null },
  { id: 'codex', label: 'Codex CLI', skillsDir: path.join(HOME, '.agents', 'skills'), subagentsDir: null },
  { id: 'gemini', label: 'Gemini CLI', skillsDir: path.join(HOME, '.gemini', 'skills'), subagentsDir: null },
  { id: 'copilot', label: 'GitHub Copilot', skillsDir: path.join(HOME, '.copilot', 'skills'), subagentsDir: null },
];
const DEFAULT_TARGET_IDS = ['claude', 'cursor'];
const byIds = ids => ALL_TARGETS.filter(t => ids.includes(t.id));

const EXCLUDED_DIRS = new Set(['subagents', 'node_modules', '.git', '.github']);

// ── Helpers ──────────────────────────────────────────────────────────────────
function tildePath(p) {
  return p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p;
}

function pad(str, len) {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

/** Parse a comma list ("claude,cursor", "both", "all") into targets; throws on unknown ids. */
function parseTargetList(str) {
  const ids = [];
  for (const raw of str.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)) {
    if (raw === 'both') ids.push(...DEFAULT_TARGET_IDS);
    else if (raw === 'all') ids.push(...ALL_TARGETS.map(t => t.id));
    else if (ALL_TARGETS.some(t => t.id === raw)) ids.push(raw);
    else throw new Error(`Unknown target "${raw}". Valid: ${ALL_TARGETS.map(t => t.id).join(', ')}, both, all`);
  }
  return byIds(ids);
}

/** Which app(s) to install into. */
async function resolveTargets() {
  const flagIds = ALL_TARGETS.filter(t => args.includes(`--${t.id}-only`)).map(t => t.id);
  if (flagIds.length) return byIds(flagIds);
  const listArg = args.find(a => a.startsWith('--targets='));
  if (listArg) return parseTargetList(listArg.slice('--targets='.length));
  if (args.includes('--both')) return byIds(DEFAULT_TARGET_IDS);
  if (args.includes('--all')) return ALL_TARGETS;

  const env = (process.env.MONKEYSKILLS_TARGETS || '').trim();
  if (env) return parseTargetList(env);

  if (process.stdin.isTTY && process.stdout.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log(`\n${C.bold}Where should MonkeySkills be installed?${C.reset}`);
      console.log(`  ${C.cyan}[1]${C.reset} Claude Code only  ${C.gray}~/.claude/skills & subagents${C.reset}`);
      console.log(`  ${C.cyan}[2]${C.reset} Cursor only       ${C.gray}~/.cursor/skills & ~/.cursor/agents${C.reset}`);
      console.log(`  ${C.cyan}[3]${C.reset} Both              ${C.gray}(recommended if you use both)${C.reset}`);
      console.log(`  ${C.cyan}[4]${C.reset} All tools         ${C.gray}+ Windsurf, Codex CLI, Gemini CLI, GitHub Copilot (skills only)${C.reset}`);
      console.log(`  ${C.gray}or a comma list of: ${ALL_TARGETS.map(t => t.id).join(', ')}${C.reset}`);
      const line = (await rl.question(`\n${C.bold}Choice${C.reset} ${C.gray}[1-4 or list, default 3]${C.reset}: `)).trim();
      if (line === '1') return byIds(['claude']);
      if (line === '2') return byIds(['cursor']);
      if (line === '4') return ALL_TARGETS;
      if (line && line !== '3') return parseTargetList(line);
      return byIds(DEFAULT_TARGET_IDS);
    } finally {
      rl.close();
    }
  }

  console.log(
    `${C.gray}Non-interactive: installing to Claude Code and Cursor. ` +
    `Use --claude-only, --cursor-only, --both, --all, --targets=claude,windsurf,...; or set MONKEYSKILLS_TARGETS.${C.reset}`
  );
  return byIds(DEFAULT_TARGET_IDS);
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

/** Install one subagent; returns notes about model rewrites. Source file is never modified. */
function installSubagentToTargets(srcFile, fileName, targets) {
  const notes = [];
  const raw = fs.readFileSync(srcFile, 'utf8');
  for (const t of targets.filter(x => x.subagentsDir)) {
    let out = raw;
    if (t.mapModels) {
      const r = rewriteModelForClaude(raw);
      out = r.content;
      if (r.mapped) {
        notes.push(`${fileName.replace('.md', '')}: model "${r.from}" is not a Claude model, mapped to "inherit" for ${t.label}; this council member will run on the session model.`);
      }
    }
    if (!DRY_RUN) {
      const d = path.join(t.subagentsDir, fileName);
      if (fs.existsSync(d)) fs.rmSync(d);
      fs.mkdirSync(t.subagentsDir, { recursive: true });
      fs.writeFileSync(d, out);
    }
  }
  return notes;
}

function restartHint(targets) {
  return `Restart ${targets.map(t => t.label).join(' / ')} to pick up new skills.`;
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
      if (t.subagentsDir) fs.mkdirSync(t.subagentsDir, { recursive: true });
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
  const subTargets = targets.filter(t => t.subagentsDir);
  const skillsOnly = targets.filter(t => !t.subagentsDir);
  const modelNotes = [];
  if (subagentFiles.length > 0 && subTargets.length > 0) {
    const subDestSummary = subTargets
      .map(t => `${C.cyan}${tildePath(t.subagentsDir)}${C.reset}`)
      .join(` ${C.gray}&${C.reset} `);
    console.log(`\nInstalling ${C.bold}${subagentFiles.length} subagents${C.reset} to ${subDestSummary}\n`);

    for (const file of subagentFiles) {
      const src = path.join(REPO_ROOT, 'subagents', file);
      const label = file.replace('.md', '');
      modelNotes.push(...installSubagentToTargets(src, file, targets));
      const destHint = subTargets
        .map(t => tildePath(path.join(t.subagentsDir, file)))
        .join(', ');
      console.log(`  ${C.green}✓${C.reset}  ${pad(label, 16)} → ${C.gray}${destHint}${C.reset}`);
    }
  }

  for (const n of modelNotes) console.log(`  ${C.yellow}note${C.reset} ${n}`);
  if (skillsOnly.length > 0) {
    console.log(`\n${C.yellow}note${C.reset} ${skillsOnly.map(t => t.label).join(', ')}: skills installed, subagents not installed. Subagent-based phases fall back to inline, sequential execution.`);
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
