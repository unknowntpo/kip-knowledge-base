import type { GitHubJsonTransport } from "@oss-knowledge-base/github-publisher/github-connector";

export class GitHubFetchTransport implements GitHubJsonTransport {
  constructor(private readonly token: string) {
    if (token.trim().length === 0) throw new Error("GITHUB_SOURCE_TOKEN is not configured");
  }

  async getJson<T>(url: string): Promise<T> {
    const target = new URL(url);
    if (target.origin !== "https://api.github.com") {
      throw new Error(`Unsupported GitHub API origin: ${target.origin}`);
    }
    const response = await fetch(target, {
      headers: {
        Accept: "application/vnd.github.full+json",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "oss-knowledge-base-data-publisher",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining") ?? "unknown";
      const reset = response.headers.get("x-ratelimit-reset") ?? "unknown";
      throw new Error(`GitHub API ${response.status}; rate-limit remaining=${remaining}; reset=${reset}`);
    }
    return await response.json() as T;
  }
}
