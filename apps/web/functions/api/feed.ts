import { jsonResponse, readFeedProjection } from "../_shared/r2-projection";

interface Env { readonly OSS_KB_BUCKET: R2Bucket }

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return jsonResponse(await readFeedProjection(env.OSS_KB_BUCKET));
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to read feed projection" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
};
