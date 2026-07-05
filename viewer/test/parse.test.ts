import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// @ts-expect-error - plain ESM module, no d.ts
import { parseVault } from "../scripts/parse-vault.mjs";

const url = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const seed = JSON.parse(readFileSync(url("../../tools/kips.seed.json"), "utf8"));
const parsed = parseVault(url("../../vault/KIPs"));

const byId = (arr: any[]) => Object.fromEntries(arr.map((k) => [k.id, k]));

describe("vault parser", () => {
  it("recovers all 9 KIPs", () => {
    expect(parsed.length).toBe(9);
  });

  it("round-trips the vault losslessly against the seed snapshot", () => {
    expect(byId(parsed)).toEqual(byId(seed));
  });

  it("every related link resolves to an existing KIP", () => {
    const ids = new Set(parsed.map((k: any) => k.id));
    for (const k of parsed) for (const r of k.related) expect(ids.has(r)).toBe(true);
  });

  it("only uses known statuses", () => {
    const ok = new Set(["Adopted", "Early Access", "Under Discussion"]);
    for (const k of parsed) expect(ok.has(k.status)).toBe(true);
  });
});
