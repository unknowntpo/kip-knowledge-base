// Shared corpus builder for the semantic layer.
// Source of truth = the vault (vault/KIPs/*.md), parsed by the viewer's parser.
// Imported by BOTH tools/semantic/build-embeddings.ts and viewer/test/semantic.test.ts,
// so the doc text an embedding was computed from and the text a staleness guard hashes
// are guaranteed identical.
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseVault } from "../../viewer/scripts/parse-vault";
import type { Kip } from "../../viewer/scripts/parse-vault";

const here = dirname(fileURLToPath(import.meta.url));
const VAULT_KIPS = resolve(here, "../../vault/KIPs");

/** One per-KIP document: the id and the text that gets embedded. */
export interface CorpusEntry {
  id: string;
  text: string;
}

/**
 * Assemble the per-KIP document text used for embedding:
 * title + summary + motivation paragraphs + design paragraphs + pros + cons.
 * Deterministic: same vault -> byte-identical text.
 */
function docText(k: Kip): string {
  return [
    k.title,
    k.summary,
    ...k.motivation,
    ...k.design,
    ...k.pros,
    ...k.cons,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * @param kipsDir override for tests; defaults to the vault.
 * @returns entries ascending by KIP number (parseVault order).
 */
export function buildCorpus(kipsDir: string = VAULT_KIPS): CorpusEntry[] {
  return parseVault(kipsDir).map((k) => ({ id: k.id, text: docText(k) }));
}

/**
 * Stable content hash of a corpus: sha256 over each entry's text, sorted by id,
 * newline-joined. Any vault edit that changes a document's text changes this hash,
 * which the staleness-guard test compares against embeddings.json.corpusHash.
 */
export function corpusHash(entries: CorpusEntry[]): string {
  const sorted = [...entries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const h = createHash("sha256");
  h.update(sorted.map((e) => e.text).join("\n"));
  return h.digest("hex");
}
