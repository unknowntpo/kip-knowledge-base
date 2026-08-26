import { join, relative } from "node:path";

const root = join(import.meta.dir, "..", "r2-seed");
const files: string[] = [];
for await (const file of new Bun.Glob("public/v2/**/*.json").scan({ cwd: root, absolute: true })) files.push(file);
files.sort((left, right) => Number(left.endsWith("current.json")) - Number(right.endsWith("current.json")));

if (files.length === 0) throw new Error("No R2 seed objects found; run bun run r2:export first");

for (const file of files) {
  const key = relative(root, file);
  const process = Bun.spawn([
    "bunx", "wrangler", "r2", "object", "put", `oss-knowledge-base-local/${key}`,
    "--file", file,
    "--content-type", "application/json",
    "--local",
    "--persist-to", ".wrangler/state",
  ], { cwd: join(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (code !== 0) throw new Error(`Unable to seed ${key}: ${stderr || stdout}`);
}

console.log(`Seeded ${files.length} objects into local R2`);
