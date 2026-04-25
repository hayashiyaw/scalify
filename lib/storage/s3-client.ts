import { S3Client } from "@aws-sdk/client-s3";

export type StorageS3Env = {
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  /** Prefix for public object URLs, e.g. `https://cdn.example.com` or `http://127.0.0.1:9000/scalify` (path-style bucket root). */
  s3PublicUrlBase: string;
  s3Endpoint?: string;
  /** Required for MinIO and most S3-compatible endpoints when using a custom `s3Endpoint`. */
  s3ForcePathStyle: boolean;
};

export function createS3Client(env: StorageS3Env): S3Client {
  return new S3Client({
    region: env.s3Region,
    ...(env.s3Endpoint
      ? {
          endpoint: env.s3Endpoint,
          forcePathStyle: env.s3ForcePathStyle,
        }
      : { forcePathStyle: false }),
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey,
    },
  });
}
