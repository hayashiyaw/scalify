import { createS3Client, type StorageS3Env } from "@/lib/storage/s3-client";
import { S3ObjectStorage } from "@/lib/storage/s3-object-storage";

export type { StorageS3Env };

function parseBool(v: string | undefined, defaultValue: boolean): boolean {
  if (v === undefined || v === "") return defaultValue;
  const t = v.trim().toLowerCase();
  if (t === "true" || t === "1") return true;
  if (t === "false" || t === "0") return false;
  throw new Error(`Invalid boolean for S3_FORCE_PATH_STYLE: ${v}`);
}

/**
 * Reads S3-compatible settings from the environment (MinIO in local dev, AWS/R2 in prod).
 * Required: bucket, credentials, public URL base. Endpoint is optional (omit for default AWS).
 */
export function parseStorageEnvFromProcess(
  env: NodeJS.ProcessEnv = process.env,
): StorageS3Env {
  const bucket = env.S3_BUCKET?.trim();
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim();
  const publicUrlBase = env.S3_PUBLIC_URL_BASE?.trim();

  const missing: string[] = [];
  if (!bucket) missing.push("S3_BUCKET");
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (!publicUrlBase) missing.push("S3_PUBLIC_URL_BASE");
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  const endpoint = env.S3_ENDPOINT?.trim();
  const forcePathStyle = parseBool(
    env.S3_FORCE_PATH_STYLE,
    Boolean(endpoint),
  );

  return {
    s3Region: env.S3_REGION?.trim() || "us-east-1",
    s3Bucket: bucket as string,
    s3AccessKeyId: accessKeyId as string,
    s3SecretAccessKey: secretAccessKey as string,
    s3PublicUrlBase: publicUrlBase as string,
    s3Endpoint: endpoint || undefined,
    s3ForcePathStyle: forcePathStyle,
  };
}

export function createS3ObjectStorageFromProcess(
  env: NodeJS.ProcessEnv = process.env,
): S3ObjectStorage {
  const cfg = parseStorageEnvFromProcess(env);
  return new S3ObjectStorage(createS3Client(cfg), cfg);
}
