import { join } from "node:path";

import { verifyReferenceParity } from "../src";

const candidatePath = Bun.argv[2];
if (!candidatePath) {
  throw new Error("usage: bun scripts/verify-parity.ts <candidate-projection.json> [oracle-projection.json]");
}
const oraclePath = Bun.argv[3] ?? join(import.meta.dir, "..", "test", "fixtures", "github-feed-projection.v1.json");
const [candidate, oracle] = await Promise.all([
  Bun.file(candidatePath).json(),
  Bun.file(oraclePath).json(),
]);

const digest = verifyReferenceParity(candidate, oracle);
process.stdout.write(`Fluss/Flink parity candidate matches ${digest}\n`);
