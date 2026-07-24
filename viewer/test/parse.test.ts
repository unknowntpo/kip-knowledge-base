import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseVault } from "../scripts/parse-vault";

const url = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const seed = JSON.parse(readFileSync(url("../../tools/kips.seed.json"), "utf8"));
const parsed = parseVault(url("../../vault/KIPs"));
// The vault holds two kinds of notes: the 9 deep, hand-authored KIPs (strict
// round-trip vs the seed snapshot) and backfill-imported stubs (lenient).
const deep = parsed.filter((k: any) => !k.stub);
const stubs = parsed.filter((k: any) => k.stub);

const byId = (arr: any[]) => Object.fromEntries(arr.map((k) => [k.id, k]));

describe("vault parser", () => {
  it("recovers all 9 deep KIPs", () => {
    expect(deep.length).toBe(9);
  });

  it("round-trips the deep notes losslessly against the seed snapshot", () => {
    // Stub-only fields are absent (not undefined-set) on deep notes, so strip
    // nothing: compare deep notes directly to the seed.
    expect(byId(deep)).toEqual(byId(seed));
  });

  it("every related link resolves to an existing KIP", () => {
    const ids = new Set(parsed.map((k: any) => k.id));
    for (const k of parsed) for (const r of k.related) expect(ids.has(r)).toBe(true);
  });

  it("only uses known statuses", () => {
    const ok = new Set([
      "Adopted",
      "Early Access",
      "Under Discussion",
      "Discarded",
      "Unknown",
    ]);
    for (const k of parsed) expect(ok.has(k.status)).toBe(true);
  });

  it("stubs parse leniently: id/title/status/summary present, deep-only fields empty", () => {
    expect(stubs.length).toBeGreaterThan(0);
    for (const s of stubs) {
      expect(s.id).toMatch(/^KIP-\d+$/);
      expect(s.title.length).toBeGreaterThan(0);
      expect(typeof s.summary).toBe("string");
      expect(s.stub).toBe(true);
      expect(s.motivation).toEqual([]);
      expect(s.discussion).toEqual([]);
    }
  });
});
