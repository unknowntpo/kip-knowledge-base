import { join, normalize } from "node:path";
import { FeedPoller } from "./feed-poller";

const root = import.meta.dir;
const port = Number(Bun.env.PORT ?? 4177);
const poller = new FeedPoller();

function staticResponse(pathname: string): Response {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const normalized = normalize(requested);
  if (normalized.startsWith("..") || normalized.includes("/..")) return new Response("Not found", { status: 404 });
  const file = Bun.file(join(root, normalized));
  return new Response(file);
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/feed") {
      try {
        const publication = await poller.getSnapshot(url.searchParams.get("refresh") === "1");
        return Response.json(publication.index, {
          headers: {
            "Cache-Control": "no-store",
            "X-Feed-Stale": publication.index.metadata.stale === true ? "1" : "0",
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown feed error";
        return Response.json({ error: message }, { status: 502 });
      }
    }
    if (url.pathname.startsWith("/api/detail/")) {
      try {
        const publication = await poller.getSnapshot();
        const feedEntryId = decodeURIComponent(url.pathname.slice("/api/detail/".length));
        const detail = publication.details.find((candidate) => candidate.entry.id === feedEntryId);
        return detail === undefined
          ? Response.json({ error: "FeedDetail not found" }, { status: 404 })
          : Response.json(detail, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown detail error";
        return Response.json({ error: message }, { status: 502 });
      }
    }
    if (url.pathname === "/api/health") {
      return Response.json(poller.getStatus(), { headers: { "Cache-Control": "no-store" } });
    }
    return staticResponse(url.pathname);
  },
});

poller.start();
console.log(`OSS Knowledge Base: ${server.url}`);
