export type RemotePublicationEnvironment = "development" | "production";

const buckets: Readonly<Record<RemotePublicationEnvironment, string>> = {
  development: "oss-knowledge-base-dev",
  production: "oss-knowledge-base-prod",
};

export interface RemotePublicationTarget {
  readonly environment: RemotePublicationEnvironment;
  readonly bucket: string;
}

/** Remote publication has no default target and cannot cross environment scope. */
export function requireRemotePublicationTarget(): RemotePublicationTarget {
  return resolveRemotePublicationTarget(Bun.env);
}

export function resolveRemotePublicationTarget(
  env: Readonly<Record<string, string | undefined>>,
): RemotePublicationTarget {
  const environment = env.PUBLICATION_ENVIRONMENT;
  if (environment !== "development" && environment !== "production") {
    throw new Error("Set PUBLICATION_ENVIRONMENT=development or production");
  }
  const bucket = env.R2_BUCKET;
  const expectedBucket = buckets[environment];
  if (bucket !== expectedBucket) {
    throw new Error(`R2_BUCKET must be ${expectedBucket} for ${environment}`);
  }
  const expectedConfirmation = `${environment}:${bucket}`;
  if (env.CONFIRM_R2_PUBLISH !== expectedConfirmation) {
    throw new Error(`Set CONFIRM_R2_PUBLISH=${expectedConfirmation} to publish remotely`);
  }
  return { environment, bucket };
}
