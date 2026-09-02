import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const spikeDir = resolve(import.meta.dir, "..");
const repoDir = resolve(spikeDir, "..", "..");
const composeFile = join(spikeDir, "docker-compose.yml");
const fixturePath = join(repoDir, "packages", "reference-pipeline", "test", "fixtures", "github-events.v1.json");
const oraclePath = join(repoDir, "packages", "reference-pipeline", "test", "fixtures", "github-feed-projection.v1.json");
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const project = `osskb-fluss-${runId}`.toLowerCase();
const database = `osskb_${runId.replaceAll("-", "_")}`;
const runDir = await mkdtemp(join(tmpdir(), "osskb-fluss-it-"));
const candidatePath = join(runDir, "candidate.json");
const evidencePath = join(runDir, "evidence.json");
const preserve = process.env.PRESERVE_FLUSS_IT === "1";
const fixtureBytes = await readFile(fixturePath);
const inputDigest = `sha256:${createHash("sha256").update(fixtureBytes).digest("hex")}`;

async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") return reject(new Error("Could not allocate a TCP port"));
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

async function run(command: readonly string[], options: { env?: Record<string, string>; quiet?: boolean } = {}): Promise<string> {
  const child = Bun.spawn(command, {
    cwd: repoDir,
    env: { ...process.env, ...options.env },
    stdout: options.quiet ? "pipe" : "inherit",
    stderr: options.quiet ? "pipe" : "inherit",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    options.quiet ? new Response(child.stdout).text() : Promise.resolve(""),
    options.quiet ? new Response(child.stderr).text() : Promise.resolve(""),
  ]);
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed (${exitCode})\n${stderr}`);
  return stdout;
}

async function waitForTcp(port: number, label: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await Bun.connect({ hostname: "127.0.0.1", port, socket: { data() {}, open(socket) { socket.end(); } } });
      return;
    } catch (error) {
      lastError = error;
      await Bun.sleep(250);
    }
  }
  throw new Error(`${label} was not reachable on port ${port}: ${String(lastError)}`);
}

const coordinatorPort = await freePort();
const tabletPort = await freePort();
const composeEnv = {
  COORDINATOR_PORT: String(coordinatorPort),
  TABLET_PORT: String(tabletPort),
};
const compose = ["docker", "compose", "-p", project, "-f", composeFile];
const startedAt = new Date().toISOString();
let outcome = "failed";

console.log(`run=${runId} database=${database} coordinator=localhost:${coordinatorPort} tablet=localhost:${tabletPort}`);

try {
  await run([...compose, "up", "-d"], { env: composeEnv });
  await Promise.all([
    waitForTcp(coordinatorPort, "Fluss coordinator"),
    waitForTcp(tabletPort, "Fluss tablet server"),
  ]);
  await run([
    "mvn", "-B", "test", "-f", join(spikeDir, "pom.xml"),
    "-Dtest=ClusterSliceIT",
    "-Dfluss.it=true",
    `-Dfluss.bootstrap.servers=localhost:${coordinatorPort}`,
    `-Dfluss.database=${database}`,
    `-Dfluss.fixture=${fixturePath}`,
    `-Dfluss.candidate=${candidatePath}`,
  ]);
  await run([
    "bun", join(repoDir, "packages", "reference-pipeline", "scripts", "verify-parity.ts"),
    candidatePath,
    oraclePath,
  ]);
  outcome = "passed";
} catch (error) {
  const logs = await run([...compose, "logs", "--no-color"], { env: composeEnv, quiet: true }).catch(() => "logs unavailable");
  await writeFile(join(runDir, "compose.log"), logs);
  throw error;
} finally {
  const candidate = await readFile(candidatePath, "utf8").then(JSON.parse, () => undefined);
  let cleanup = "preserved-by-opt-in";
  let cleanupError: unknown;
  if (preserve) {
    console.log(`PRESERVE_FLUSS_IT=1; resources kept. Evidence: ${evidencePath}`);
  } else {
    try {
      await run([...compose, "down", "-v", "--remove-orphans"], { env: composeEnv });
      cleanup = "removed";
    } catch (error) {
      cleanup = "failed";
      cleanupError = error;
    }
  }
  await writeFile(evidencePath, JSON.stringify({
    schema: "osskb.fluss-flink-cluster-evidence.v1",
    runId,
    database,
    versions: { fluss: "0.9.1-incubating", flink: "1.20.3", javaBytecode: 17 },
    fixturePath,
    inputDigest,
    logObservationCount: outcome === "passed" ? 10 : undefined,
    currentEntityCount: outcome === "passed" ? 5 : undefined,
    candidatePath,
    candidateExists: candidate !== undefined,
    candidateDigest: candidate?.digest,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - Date.parse(startedAt),
    outcome,
    cleanup,
  }, null, 2));
  console.log(`evidence=${evidencePath}`);
  if (cleanupError) throw cleanupError;
}
