import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { loadRecordedFeedPublication } from "./load-recorded-feed-publication";

const outputPath = join(
  import.meta.dir,
  "..",
  "test",
  "fixtures",
  "recorded-feed-publication.v1.json",
);

const recorded = await loadRecordedFeedPublication();
await mkdir(dirname(outputPath), { recursive: true });
await Bun.write(outputPath, `${JSON.stringify(recorded)}\n`);

console.log(
  `Wrote ${recorded.publication.index.entries.length} Feed entries to ${outputPath}`,
);
