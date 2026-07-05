// Parse the Obsidian vault (vault/KIPs/*.md) back into the structured KIP model.
// Source of truth = the markdown notes. Shared by build-kips.mjs and the round-trip test.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const splitParas = (t) =>
  t.trim().split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

const sectionMap = (body) => {
  const parts = body.split(/^## (.+)$/gm); // [pre, h1, c1, h2, c2, ...]
  const map = {};
  for (let i = 1; i < parts.length; i += 2) map[parts[i].trim()] = parts[i + 1].trim();
  return map;
};

const stripStars = (s) => s.replace(/^\*/, "").replace(/\*$/, "").trim();

function parseNote(raw) {
  const { data: fm, content } = matter(raw);
  const sec = sectionMap(content);

  // Trade-offs -> pros / cons
  const trade = sec["Trade-offs"] || "";
  const warnIdx = trade.search(/^> \[!warning\]/m);
  const benefits = warnIdx >= 0 ? trade.slice(0, warnIdx) : trade;
  const costs = warnIdx >= 0 ? trade.slice(warnIdx) : "";
  const bullets = (b) => [...b.matchAll(/^> - (.+)$/gm)].map((m) => m[1].trim());

  // Rejected Alternatives
  const rejected = splitParas(sec["Rejected Alternatives"] || "").map((b) => {
    const m = b.match(/^\*\*([\s\S]+?)\*\* — ([\s\S]+)$/);
    if (!m) throw new Error(`${fm.id}: bad rejected block: ${b}`);
    return { name: m[1].trim(), why: m[2].trim() };
  });

  // Discussion Thread
  const dBlocks = splitParas(sec["Discussion Thread"] || "");
  const discussionMeta = stripStars(dBlocks.shift() || "").replace(
    /^dev@kafka\.apache\.org · /,
    ""
  );
  const discussion = dBlocks.map((b) => {
    const lines = b.split("\n");
    const m = lines[0].match(/^\*\*(.+?)\*\* · \*(.+?)\*$/);
    if (!m) throw new Error(`${fm.id}: bad discussion header: ${lines[0]}`);
    const text = lines.slice(1).map((l) => l.replace(/^> ?/, "")).join(" ").trim();
    return { author: m[1].trim(), date: m[2].trim(), text };
  });

  // Voting Thread
  const vBlocks = splitParas(sec["Voting Thread"] || "");
  const closed = stripStars(vBlocks[0] || "");
  const rm = (vBlocks[1] || "").match(/^\*\*Result:\*\* (.+?) · ([\s\S]+)$/);
  if (!rm) throw new Error(`${fm.id}: bad vote result line`);
  const votes = [
    ...vBlocks.slice(2).join("\n").matchAll(/^- \*\*(.+?)\*\* (.+?) — (.+)$/gm),
  ].map((m) => ({ vote: m[1].trim(), name: m[2].trim(), role: m[3].trim() }));

  return {
    id: fm.id,
    title: fm.title,
    status: fm.status,
    category: fm.category,
    release: fm.release,
    authors: fm.authors.join(", "),
    tags: fm.tags,
    summary: (sec["Summary"] || "").trim(),
    motivation: splitParas(sec["Motivation"] || ""),
    design: splitParas(sec["Proposed Changes / Design"] || ""),
    pros: bullets(benefits),
    cons: bullets(costs),
    rejected,
    discussionMeta,
    discussion,
    vote: { result: rm[1].trim(), tally: rm[2].trim(), closed, votes },
    related: fm.related.map((r) => r.replace(/^\[\[|\]\]$/g, "")),
  };
}

export function parseVault(kipsDir) {
  const files = readdirSync(kipsDir).filter((f) => f.endsWith(".md"));
  const kips = files.map((f) => parseNote(readFileSync(join(kipsDir, f), "utf8")));
  // ascending by KIP number
  kips.sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4)));

  // integrity: related links must resolve
  const ids = new Set(kips.map((k) => k.id));
  for (const k of kips)
    for (const r of k.related)
      if (!ids.has(r)) throw new Error(`${k.id}: related note ${r} does not exist`);
  return kips;
}
