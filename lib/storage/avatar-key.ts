import { randomUUID } from "node:crypto";

import { AVATAR_OBJECT_PREFIX } from "@/lib/storage/constants";

/** Prisma `cuid()` and similar opaque ids (no slashes or traversal). */
const SAFE_USER_ID = /^[\w-]{8,128}$/;

function assertSafeUserId(userId: string): void {
  if (!userId || !SAFE_USER_ID.test(userId)) {
    throw new Error("userId must be a safe opaque identifier");
  }
}

/**
 * Builds a unique object key under `avatars/` for a presigned PUT.
 * Caller must validate `userId` comes from the authenticated session (cuid-safe).
 */
export function makeAvatarObjectKey(userId: string): string {
  assertSafeUserId(userId);
  const id = randomUUID();
  return `${AVATAR_OBJECT_PREFIX}${userId}/${id}`;
}

/** True if the key is under the avatar prefix and has no traversal segments. */
export function isWellFormedAvatarObjectKey(key: string): boolean {
  if (!key.startsWith(AVATAR_OBJECT_PREFIX)) return false;
  const rest = key.slice(AVATAR_OBJECT_PREFIX.length);
  if (!rest || rest.includes("..") || rest.startsWith("/")) return false;
  const segments = rest.split("/");
  if (segments.length < 2) return false;
  return segments.every((s) => s.length > 0 && !s.includes(".."));
}

/**
 * Validates ownership for keys generated as `avatars/{userId}/{objectId}`.
 * This is enforced during finalize/delete flows to prevent cross-user writes.
 */
export function avatarObjectKeyBelongsToUser(
  key: string,
  userId: string,
): boolean {
  assertSafeUserId(userId);
  return isWellFormedAvatarObjectKey(key) && key.startsWith(`${AVATAR_OBJECT_PREFIX}${userId}/`);
}
