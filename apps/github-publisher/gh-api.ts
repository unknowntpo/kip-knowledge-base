const API_ORIGIN = "https://api.github.com/";

function endpointFor(url: string): string {
  const parsed = new URL(url, API_ORIGIN);
  if (parsed.origin !== "https://api.github.com") {
    throw new Error(`Unsupported GitHub API origin: ${parsed.origin}`);
  }
  return `${parsed.pathname.slice(1)}${parsed.search}`;
}

export async function ghApiJson<T>(
  url: string,
  options: { readonly cache?: string } = {},
): Promise<T> {
  const args = [
    "gh",
    "api",
    endpointFor(url),
    "-H",
    "Accept: application/vnd.github.full+json",
    "-H",
    "X-GitHub-Api-Version: 2022-11-28",
  ];
  if (options.cache !== undefined) args.push("--cache", options.cache);

  let process: ReturnType<typeof Bun.spawn>;
  try {
    process = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to start GitHub CLI: ${detail}`);
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout as ReadableStream<Uint8Array>).text(),
    new Response(process.stderr as ReadableStream<Uint8Array>).text(),
    process.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`gh api failed (${exitCode}): ${stderr.trim() || "unknown error"}`);
  }

  try {
    return JSON.parse(stdout) as T;
  } catch {
    const preview = stdout.trim().slice(0, 160).replace(/\s+/g, " ");
    throw new Error(`gh api returned invalid JSON for ${endpointFor(url)} (${stdout.length} bytes): ${preview || "empty response"}`);
  }
}
