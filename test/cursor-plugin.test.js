'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, '.cursor-plugin', 'plugin.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('manifest file exists at .cursor-plugin/plugin.json', () => {
  assert.ok(
    fs.existsSync(MANIFEST_PATH),
    `Expected manifest at ${MANIFEST_PATH}`
  );
});

test('manifest is valid JSON', () => {
  assert.doesNotThrow(() => readManifest(), 'manifest must be valid JSON');
});

test('manifest has required "name" field', () => {
  const manifest = readManifest();
  assert.ok(manifest.name, 'manifest.name is required');
  assert.equal(typeof manifest.name, 'string');
  assert.ok(manifest.name.length > 0, 'manifest.name must not be empty');
});

test('manifest has recommended fields (description, version, author)', () => {
  const manifest = readManifest();
  assert.ok(manifest.description, 'manifest.description is recommended');
  assert.ok(manifest.version, 'manifest.version is recommended');
  assert.ok(manifest.author, 'manifest.author is recommended');
});

test('all skill paths in manifest exist and contain SKILL.md', () => {
  const manifest = readManifest();
  assert.ok(Array.isArray(manifest.skills), 'manifest.skills must be an array');
  assert.ok(manifest.skills.length > 0, 'manifest must declare at least one skill');

  for (const skillPath of manifest.skills) {
    // Paths in manifest are relative to .cursor-plugin/, resolve from there
    const pluginDir = path.dirname(MANIFEST_PATH);
    const resolved = path.resolve(pluginDir, skillPath);

    assert.ok(
      fs.existsSync(resolved),
      `Skill directory does not exist: ${skillPath} (resolved: ${resolved})`
    );
    assert.ok(
      fs.statSync(resolved).isDirectory(),
      `Skill path must be a directory: ${skillPath}`
    );

    const skillMd = path.join(resolved, 'SKILL.md');
    assert.ok(
      fs.existsSync(skillMd),
      `Missing SKILL.md in skill directory: ${skillPath}`
    );
  }
});

test('rules directory exists and contains .mdc files', () => {
  const manifest = readManifest();
  assert.ok(manifest.rules, 'manifest.rules must be set');

  const pluginDir = path.dirname(MANIFEST_PATH);
  const rulesDir = path.resolve(pluginDir, manifest.rules);

  assert.ok(
    fs.existsSync(rulesDir),
    `Rules directory does not exist: ${manifest.rules} (resolved: ${rulesDir})`
  );
  assert.ok(
    fs.statSync(rulesDir).isDirectory(),
    'manifest.rules must point to a directory'
  );

  const mdcFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc'));
  assert.ok(
    mdcFiles.length > 0,
    `Rules directory must contain at least one .mdc file, found none in ${rulesDir}`
  );
});

test('each .mdc rule file has valid YAML frontmatter with description', () => {
  const manifest = readManifest();
  const pluginDir = path.dirname(MANIFEST_PATH);
  const rulesDir = path.resolve(pluginDir, manifest.rules);
  const mdcFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc'));

  for (const file of mdcFiles) {
    const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
    assert.ok(
      content.startsWith('---'),
      `${file} must start with YAML frontmatter (---)`
    );
    assert.ok(
      content.includes('description:'),
      `${file} frontmatter must include a description field`
    );
  }
});

test('plugin name matches package.json name', () => {
  const manifest = readManifest();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(
    manifest.name,
    pkg.name,
    `manifest name "${manifest.name}" must match package.json name "${pkg.name}"`
  );
});
