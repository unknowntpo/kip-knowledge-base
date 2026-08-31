import { canonicalDigest, canonicalJson } from "./canonical";

export interface ReferenceProjectionEnvelope {
  readonly schema: "osskb.reference-projection.v1";
  readonly digest: string;
  readonly publication: unknown;
}

function assertEnvelope(value: unknown, label: string): asserts value is ReferenceProjectionEnvelope {
  if (typeof value !== "object" || value === null) throw new Error(`${label} must be an object`);
  const candidate = value as Readonly<Record<string, unknown>>;
  if (candidate.schema !== "osskb.reference-projection.v1") {
    throw new Error(`${label} must use osskb.reference-projection.v1`);
  }
  if (typeof candidate.digest !== "string" || !candidate.digest.startsWith("sha256:")) {
    throw new Error(`${label} must declare a sha256 digest`);
  }
  if (!("publication" in candidate)) throw new Error(`${label} must contain publication`);
}

export function verifyReferenceParity(candidateValue: unknown, oracleValue: unknown): string {
  assertEnvelope(candidateValue, "candidate");
  assertEnvelope(oracleValue, "oracle");

  const candidateDigest = canonicalDigest(candidateValue.publication);
  const oracleDigest = canonicalDigest(oracleValue.publication);
  if (candidateValue.digest !== candidateDigest) {
    throw new Error(`candidate declared ${candidateValue.digest}, computed ${candidateDigest}`);
  }
  if (oracleValue.digest !== oracleDigest) {
    throw new Error(`oracle declared ${oracleValue.digest}, computed ${oracleDigest}`);
  }
  if (candidateDigest !== oracleDigest || canonicalJson(candidateValue.publication) !== canonicalJson(oracleValue.publication)) {
    throw new Error(`candidate ${candidateDigest} does not match oracle ${oracleDigest}`);
  }
  return candidateDigest;
}
