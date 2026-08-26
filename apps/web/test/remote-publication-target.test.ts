import { describe, expect, test } from "bun:test";

import { resolveRemotePublicationTarget } from "../scripts/remote-publication-target";

describe("remote publication target", () => {
  test("accepts only an explicitly confirmed environment-specific bucket", () => {
    expect(resolveRemotePublicationTarget({
      PUBLICATION_ENVIRONMENT: "development",
      R2_BUCKET: "oss-knowledge-base-dev",
      CONFIRM_R2_PUBLISH: "development:oss-knowledge-base-dev",
    })).toEqual({ environment: "development", bucket: "oss-knowledge-base-dev" });
  });

  test("rejects a missing environment instead of falling back to POC", () => {
    expect(() => resolveRemotePublicationTarget({
      R2_BUCKET: "oss-knowledge-base-poc",
      CONFIRM_R2_PUBLISH: "development:oss-knowledge-base-poc",
    })).toThrow("Set PUBLICATION_ENVIRONMENT");
  });

  test("rejects a bucket that crosses the selected environment", () => {
    expect(() => resolveRemotePublicationTarget({
      PUBLICATION_ENVIRONMENT: "production",
      R2_BUCKET: "oss-knowledge-base-dev",
      CONFIRM_R2_PUBLISH: "production:oss-knowledge-base-dev",
    })).toThrow("R2_BUCKET must be oss-knowledge-base-prod for production");
  });

  test("rejects an unconfirmed remote target before any write", () => {
    expect(() => resolveRemotePublicationTarget({
      PUBLICATION_ENVIRONMENT: "production",
      R2_BUCKET: "oss-knowledge-base-prod",
    })).toThrow("Set CONFIRM_R2_PUBLISH=production:oss-knowledge-base-prod");
  });
});
