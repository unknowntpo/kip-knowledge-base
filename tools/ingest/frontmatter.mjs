// Targeted frontmatter reading/patching for vault notes.
//
// We deliberately avoid a YAML library here: additions must be ADDITIVE (spec §4)
// and must not reorder or rewrite existing keys, so we operate on the raw text
// between the `---` fences with line-level edits. gray-matter still parses the
// result (verified by viewer/test/parse.test.ts round-trip).

/** Split a note into its raw frontmatter text and the body after it. */
export function splitFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  return { fm: m[1], body: raw.slice(m[0].length), matchLen: m[0].length };
}

/** Read a simple top-level scalar key value (quoted or bare). */
export function readScalar(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m");
  const m = fm.match(re);
  if (!m) return undefined;
  return m[1].replace(/^["']|["']$/g, "");
}

/** Read the existing cwiki block (if any) as an object, else null. */
export function readCwiki(fm) {
  const lines = fm.split("\n");
  const start = lines.findIndex((l) => l === "cwiki:");
  if (start === -1) return null;
  const block = {};
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!/^  \S/.test(l)) break; // end of indented block
    const m = l.match(/^  (\w+):\s*(.+?)\s*$/);
    if (m) block[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return block;
}

/** Render a deterministic cwiki block. `version` is numeric (unquoted). */
export function renderCwiki({ pageId, version, url, lastChecked }) {
  const out = ["cwiki:", `  pageId: "${pageId}"`, `  version: ${version}`, `  url: "${url}"`];
  if (lastChecked != null) out.push(`  lastChecked: "${lastChecked}"`);
  return out.join("\n");
}

// Replace an existing cwiki block or append one at the end of the frontmatter.
function upsertCwikiText(fm, blockText) {
  const lines = fm.split("\n");
  const start = lines.findIndex((l) => l === "cwiki:");
  if (start === -1) {
    const kept = [...lines];
    while (kept.length && kept[kept.length - 1] === "") kept.pop();
    return kept.concat(blockText.split("\n")).join("\n");
  }
  let end = start + 1;
  while (end < lines.length && /^  \S/.test(lines[end])) end++;
  return [...lines.slice(0, start), ...blockText.split("\n"), ...lines.slice(end)].join("\n");
}

/**
 * Patch (upsert) the cwiki block in a note's raw text.
 * Returns { changed, newRaw, oldBlock, newBlock }.
 */
export function patchCwiki(raw, fields) {
  const split = splitFrontmatter(raw);
  if (!split) throw new Error("patchCwiki: note has no frontmatter");
  const oldBlock = readCwiki(split.fm);
  const blockText = renderCwiki(fields);
  const newFm = upsertCwikiText(split.fm, blockText);
  const newRaw = `---\n${newFm}\n---\n${split.body}`;
  return { changed: newRaw !== raw, newRaw, oldBlock, newBlock: blockText };
}
