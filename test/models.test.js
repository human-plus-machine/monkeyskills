'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mapModelForClaude, rewriteModelForClaude } = require('../lib/models');

test('claude sonnet/opus/haiku ids map to aliases', () => {
  assert.equal(mapModelForClaude('claude-4.6-sonnet').value, 'sonnet');
  assert.equal(mapModelForClaude('claude-4.6-opus').value, 'opus');
  assert.equal(mapModelForClaude('claude-3-5-haiku-20241022').value, 'haiku');
  assert.equal(mapModelForClaude('claude-4.6-sonnet').mapped, false);
});

test('non-Claude and unknown models map to inherit', () => {
  for (const m of ['gpt-5.5', 'gemini-3.1-pro', 'mystery', '', undefined]) {
    assert.deepEqual(mapModelForClaude(m), { value: 'inherit', mapped: true });
  }
});

test('existing aliases and inherit pass through', () => {
  for (const m of ['sonnet', 'opus', 'haiku', 'fable', 'inherit']) {
    assert.deepEqual(mapModelForClaude(m), { value: m, mapped: false });
  }
});

test('rewrite changes only the model line', () => {
  const src = '---\nname: x\nmodel: gpt-5.5\ndescription: uses model: foo\n---\nbody\nmodel: keep\n';
  const r = rewriteModelForClaude(src);
  assert.equal(r.content, '---\nname: x\nmodel: inherit\ndescription: uses model: foo\n---\nbody\nmodel: keep\n');
  assert.equal(r.from, 'gpt-5.5');
  assert.equal(r.mapped, true);
});

test('rewrite is a no-op without frontmatter or model line', () => {
  assert.equal(rewriteModelForClaude('hello').content, 'hello');
  const s = '---\nname: x\n---\nbody';
  assert.equal(rewriteModelForClaude(s).content, s);
});

test('real subagent sources rewrite to valid values', () => {
  const dir = path.resolve(__dirname, '..', 'subagents');
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.md'))) {
    const r = rewriteModelForClaude(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.ok(['sonnet', 'opus', 'haiku', 'inherit'].includes(r.to), f);
  }
});
