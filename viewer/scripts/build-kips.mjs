// Build step: parse the vault -> src/data/kips.generated.json (consumed by the app).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseVault } from "./parse-vault.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const vaultKips = resolve(here, "../../vault/KIPs");
const out = resolve(here, "../src/data/kips.generated.json");

const kips = parseVault(vaultKips);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(kips, null, 2) + "\n");
console.log(`build-kips: wrote ${kips.length} KIPs -> src/data/kips.generated.json`);
