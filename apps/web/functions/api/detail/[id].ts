import { jsonResponse, readDetailProjection } from "../../_shared/r2-projection";

interface Env { readonly OSS_KB_BUCKET: R2Bucket }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (typeof id !== "string" || id.length === 0) return jsonResponse({ error: "FeedEntry id is required" }, { status: 400 });
  try {
    const detail = await readDetailProjection(env.OSS_KB_BUCKET, decodeURIComponent(id));
    return detail === undefined
      ? jsonResponse({ error: "FeedDetail not found" }, { status: 404 })
      : jsonResponse(detail);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to read FeedDetail" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
};
