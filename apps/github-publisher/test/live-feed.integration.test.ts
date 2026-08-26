import { expect, test } from "bun:test";
import { loadLiveFeed } from "../live-feed";

const liveTest = Bun.env.RUN_LIVE_GITHUB_TEST === "1" ? test : test.skip;

liveTest("gh api produces real Kafka and DataFusion feed entries", async () => {
  const publication = await loadLiveFeed();
  const projects = new Set(publication.index.entries.map((entry) => entry.projectKey));
  const links = publication.index.entries.map((entry) => entry.links);

  expect(projects).toEqual(new Set(["kafka", "datafusion"]));
  expect(publication.index.entries.length).toBeGreaterThanOrEqual(4);
  expect(links.every((link) => link.github?.startsWith("https://github.com/apache/") === true)).toBe(true);
  expect(publication.index.metadata.mode).toBe("replayable-reference-pipeline");
  expect(Number(publication.index.metadata.inputEventCount)).toBeGreaterThan(0);
  expect(publication.details.every((detail) => detail.records.every((record) => (
    record.sourceVersion.length > 0 &&
    record.canonicalUrl.startsWith(`https://github.com/apache/${record.projectId === "apache-kafka" ? "kafka" : "datafusion"}/`)
  )))).toBe(true);
}, 120_000);
