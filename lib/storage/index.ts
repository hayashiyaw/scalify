/**
 * S3-compatible object storage (MinIO locally, AWS S3 / R2 / etc. in production).
 *
 * **Bucket policy (apply in MinIO / IAM; do not expose write to the browser except presigned PUT):**
 * - Allow public **GetObject** only for the `avatars/*` prefix (or serve via CDN with the same restriction).
 * - Deny anonymous **PutObject** on the bucket; uploads use short-lived presigned URLs from the app.
 * - Keep **ListBucket** private.
 *
 * Manual smoke (presigned PUT): start MinIO with `docker compose up -d`, create the `S3_BUCKET`
 * bucket in the console, attach a read-only policy on `avatars/*`, set `S3_*` in `.env`, then run
 * the app and request a presign from the future `/account` flow—or use curl against the presigned URL
 * with `-T file.png` and matching `Content-Type` / `Content-Length` headers.
 */

export {
  ALLOWED_AVATAR_CONTENT_TYPES,
  AVATAR_OBJECT_PREFIX,
  MAX_AVATAR_BYTES,
} from "@/lib/storage/constants";
export type { AllowedAvatarContentType } from "@/lib/storage/constants";
export {
  AvatarValidationError,
  assertAvatarContentLengthAllowed,
  normalizeAvatarContentType,
} from "@/lib/storage/avatar-validation";
export {
  avatarObjectKeyBelongsToUser,
  isWellFormedAvatarObjectKey,
  makeAvatarObjectKey,
} from "@/lib/storage/avatar-key";
export { composePublicObjectUrl, objectKeyFromPublicUrl } from "@/lib/storage/public-url";
export {
  createS3Client,
  type StorageS3Env,
} from "@/lib/storage/s3-client";
export {
  createS3ObjectStorageFromProcess,
  parseStorageEnvFromProcess,
} from "@/lib/storage/env";
export {
  DEFAULT_AVATAR_PRESIGN_EXPIRES_SECONDS,
  S3ObjectStorage,
} from "@/lib/storage/s3-object-storage";
