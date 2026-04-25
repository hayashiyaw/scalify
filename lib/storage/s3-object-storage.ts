import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  assertAvatarContentLengthAllowed,
  normalizeAvatarContentType,
} from "@/lib/storage/avatar-validation";
import { makeAvatarObjectKey } from "@/lib/storage/avatar-key";
import { composePublicObjectUrl } from "@/lib/storage/public-url";
import type { StorageS3Env } from "@/lib/storage/s3-client";

/** Short-lived presigned PUT for avatar uploads (seconds). */
export const DEFAULT_AVATAR_PRESIGN_EXPIRES_SECONDS = 300;

export class S3ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly env: StorageS3Env,
  ) {}

  getPublicUrlForKey(objectKey: string): string {
    return composePublicObjectUrl(this.env.s3PublicUrlBase, objectKey);
  }

  /**
   * Mints a presigned PUT for a new object under `avatars/`. Validates MIME and size at the trust boundary.
   */
  async presignPutAvatar(params: {
    userId: string;
    contentType: string;
    contentLength: number;
  }): Promise<{
    uploadUrl: string;
    objectKey: string;
    expiresInSeconds: number;
  }> {
    const contentType = normalizeAvatarContentType(params.contentType);
    assertAvatarContentLengthAllowed(params.contentLength);
    const objectKey = makeAvatarObjectKey(params.userId);
    const command = new PutObjectCommand({
      Bucket: this.env.s3Bucket,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: params.contentLength,
    });
    const expiresInSeconds = DEFAULT_AVATAR_PRESIGN_EXPIRES_SECONDS;
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
    return { uploadUrl, objectKey, expiresInSeconds };
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.env.s3Bucket,
        Key: objectKey,
      }),
    );
  }
}
