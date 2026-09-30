'use strict';

/**
 * Map a Cursor-style model id to a value Claude Code accepts
 * (alias sonnet|opus|haiku|fable, a full Claude model ID, or `inherit`).
 * Returns { value, mapped } where `mapped` is true if the input was not Claude-family.
 */
function mapModelForClaude(model) {
  const m = String(model == null ? '' : model).trim().replace(/^["']|["']$/g, '').toLowerCase();
  if (m === 'inherit' || m === 'sonnet' || m === 'opus' || m === 'haiku' || m === 'fable') {
    return { value: m, mapped: false };
  }
  if (m.startsWith('claude-')) {
    if (m.includes('sonnet')) return { value: 'sonnet', mapped: false };
    if (m.includes('opus')) return { value: 'opus', mapped: false };
    if (m.includes('haiku')) return { value: 'haiku', mapped: false };
  }
  return { value: 'inherit', mapped: true };
}

/**
 * Rewrite only the `model:` line inside the leading YAML frontmatter for Claude Code.
 * Returns { content, from, to, mapped }; `from` is null if there is no model line.
 */
function rewriteModelForClaude(content) {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return { content, from: null, to: null, mapped: false };
  const re = /^model:[ \t]*(.*?)[ \t]*$/m;
  const line = fm[1].match(re);
  if (!line) return { content, from: null, to: null, mapped: false };
  const { value, mapped } = mapModelForClaude(line[1]);
  const newFm = fm[1].replace(re, `model: ${value}`);
  return {
    content: content.replace(fm[1], () => newFm),
    from: line[1],
    to: value,
    mapped,
  };
}

module.exports = { mapModelForClaude, rewriteModelForClaude };
