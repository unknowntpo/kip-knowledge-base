// The viewer fetches its data as static JSON instead of bundling it
// (docs/sync-strategy.md §6). These tests pin the generator's contract: the
// Browse index stays compact and complete, and every entry has a full detail
// payload behind it.
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseVault } from "../scripts/parse-vault";
import { BLURB_MAX, blurbOf, buildData, type KipIndexEntry } from "../scripts/build-kips";
import type { Kip } from "../src/types";

const url = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const kips = parseVault(url("../../vault/KIPs"));

let outDir: string;
let index: KipIndexEntry[];

const readKipFile = (id: string): Kip =>
  JSON.parse(readFileSync(join(outDir, "kips", `${id}.json`), "utf8"));

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "kip-data-"));
  buildData(kips, outDir, url("../../tools/semantic/related.json"));
  index = JSON.parse(readFileSync(join(outDir, "index.json"), "utf8"));
});

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("blurbOf", () => {
  it("leaves a short summary untouched", () => {
    expect(blurbOf("Short and sweet.")).toBe("Short and sweet.");
  });

  it("collapses newlines and runs of whitespace", () => {
    expect(blurbOf("one\n\ntwo   three")).toBe("one two three");
  });

  it("truncates on a word boundary and never mid-word", () => {
    const long = "alpha bravo charlie delta echo foxtrot ".repeat(20);
    const b = blurbOf(long);
    expect(b.length).toBeLessThanOrEqual(BLURB_MAX + 1); // + the ellipsis
    expect(b.endsWith("…")).toBe(true);
    expect(long.startsWith(b.slice(0, -1))).toBe(true); // prefix of the source
    expect(b.slice(0, -1).endsWith(" ")).toBe(false);
  });

  it("still truncates text with no spaces to cut on", () => {
    const b = blurbOf("x".repeat(400));
    expect(b.length).toBe(BLURB_MAX + 1);
  });
});

describe("data generator", () => {
  it("emits one index entry per KIP, in vault order", () => {
    expect(index.length).toBe(kips.length);
    expect(index.map((e) => e.id)).toEqual(kips.map((k) => k.id));
  });

  it("index entries carry every field Browse renders", () => {
    for (const e of index) {
      expect(typeof e.id).toBe("string");
      expect(e.id).not.toBe("");
      expect(typeof e.title).toBe("string");
      expect(typeof e.status).toBe("string");
      expect(typeof e.category).toBe("string");
      expect(typeof e.release).toBe("string");
      expect(Array.isArray(e.tags)).toBe(true);
      expect(typeof e.blurb).toBe("string");
    }
  });

  it("index entries stay compact — blurbs only, no full-text fields", () => {
    const allowed = new Set([
      "id",
      "title",
      "status",
      "category",
      "release",
      "tags",
      "blurb",
      "stub",
    ]);
    for (const e of index) {
      expect(Object.keys(e).filter((k) => !allowed.has(k))).toEqual([]);
      expect(e.blurb.length).toBeLessThanOrEqual(200);
    }
    // Guard the payload budget the split exists to protect (see sync-strategy §6).
    expect(readFileSync(join(outDir, "index.json"), "utf8").length).toBeLessThan(600_000);
  });

  it("marks imported stubs so the UI can flag them", () => {
    const stubIds = new Set(kips.filter((k) => k.stub).map((k) => k.id));
    for (const e of index) expect(Boolean(e.stub)).toBe(stubIds.has(e.id));
  });

  it("writes a detail file for every index entry and nothing else", () => {
    const files = readdirSync(join(outDir, "kips")).sort();
    expect(files).toEqual(index.map((e) => `${e.id}.json`).sort());
  });

  it("round-trips a deep KIP's full fields into its detail file", () => {
    const source = kips.find((k) => k.id === "KIP-500")!;
    expect(source).toBeTruthy();
    expect(readKipFile("KIP-500")).toEqual(source);
  });

  it("round-trips an imported stub's full fields into its detail file", () => {
    const stub = kips.find((k) => k.stub)!;
    expect(readKipFile(stub.id)).toEqual(stub);
  });

  it("keeps the detail payload as the only source of long-form prose", () => {
    // Pick a KIP whose summary actually exceeds the blurb budget, so the index
    // is demonstrably a truncated view of a fuller detail payload.
    const long = kips.find((k) => k.summary.replace(/\s+/g, " ").length > BLURB_MAX)!;
    const entry = index.find((e) => e.id === long.id)!;
    const full = readKipFile(long.id);
    expect(entry.blurb.endsWith("…")).toBe(true);
    expect(full.summary.length).toBeGreaterThan(entry.blurb.length);
    expect(full.summary.replace(/\s+/g, " ")).toContain(entry.blurb.replace(/…$/, ""));
  });

  it("copies the semantic neighbor map alongside the index", () => {
    const related = JSON.parse(readFileSync(join(outDir, "related.json"), "utf8"));
    const ids = new Set(index.map((e) => e.id));
    for (const [id, neighbors] of Object.entries(related)) {
      expect(ids.has(id)).toBe(true);
      for (const n of neighbors as { id: string; score: number }[]) {
        expect(ids.has(n.id)).toBe(true);
      }
    }
  });

  it("clears stale output so deleted KIPs don't linger", () => {
    const ghost = join(outDir, "kips", "KIP-does-not-exist.json");
    writeFileSync(ghost, "{}");
    buildData(kips, outDir, url("../../tools/semantic/related.json"));
    expect(existsSync(ghost)).toBe(false);
  });
});
