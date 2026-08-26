import { join } from "node:path";

const webRoot = join(import.meta.dir, "..");
const publisherRoot = join(import.meta.dir, "..", "..", "github-publisher");

const source = Bun.spawn(["bun", "--watch", "server.ts"], {
  cwd: publisherRoot,
  env: { ...Bun.env, PORT: "4178" },
  stdout: "inherit",
  stderr: "inherit",
});
const web = Bun.spawn(["bunx", "vite"], {
  cwd: webRoot,
  stdout: "inherit",
  stderr: "inherit",
});

function stop() {
  source.kill();
  web.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const exitCode = await Promise.race([source.exited, web.exited]);
stop();
process.exit(exitCode);
