import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type DeploymentEnvironment = "development" | "production";

const targets = {
  development: {
    config: "wrangler.development.jsonc",
    project: "oss-knowledge-base-dev",
    branch: "main",
  },
  production: {
    config: "wrangler.production.jsonc",
    project: "oss-knowledge-base",
    branch: "production",
  },
} as const satisfies Record<DeploymentEnvironment, {
  readonly config: string;
  readonly project: string;
  readonly branch: string;
}>;

const webRoot = join(import.meta.dir, "..");
const environment = Bun.argv[2] as DeploymentEnvironment | undefined;
if (environment === undefined || !(environment in targets)) {
  throw new Error("Usage: bun scripts/deploy-pages.ts <development|production> [wrangler arguments]");
}

const target = targets[environment];
const canonicalConfig = join(webRoot, "wrangler.jsonc");
const originalConfig = await readFile(canonicalConfig);
const deploymentConfig = await readFile(join(webRoot, target.config));

// Cloudflare Pages rejects --config with a custom path. Stage the selected,
// reviewed environment config at Wrangler's canonical path for this process
// only, and restore the local-only config even when deployment fails.
await writeFile(canonicalConfig, deploymentConfig);
try {
  const child = Bun.spawn([
    "bunx",
    "wrangler",
    "pages",
    "deploy",
    "dist",
    `--project-name=${target.project}`,
    `--branch=${target.branch}`,
    ...Bun.argv.slice(3),
  ], {
    cwd: webRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${environment} Pages deployment failed with exit code ${exitCode}`);
} finally {
  await writeFile(canonicalConfig, originalConfig);
}
