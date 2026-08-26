import { join } from "node:path";

import type { DomainEventV1 } from "@oss-knowledge-base/domain";

import { materializeReferenceFeed, type ReferenceMaterializationConfig } from "../src";

if (Bun.env.UPDATE_ORACLE !== "1") {
  throw new Error("Set UPDATE_ORACLE=1 to deliberately replace the recorded parity oracle");
}

const inputPath = join(import.meta.dir, "..", "test", "fixtures", "github-events.v1.json");
const outputPath = join(import.meta.dir, "..", "test", "fixtures", "github-feed-projection.v1.json");
const fixture = await Bun.file(inputPath).json() as {
  readonly config: ReferenceMaterializationConfig;
  readonly events: readonly DomainEventV1[];
};
const result = materializeReferenceFeed(fixture.events, fixture.config);
await Bun.write(outputPath, `${JSON.stringify({
  schema: "osskb.reference-projection.v1",
  digest: result.digest,
  publication: result.publication,
}, null, 2)}\n`);
console.log(`Updated ${outputPath} with ${result.digest}`);
