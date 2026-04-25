/** Object key prefix for user avatar objects (public-read scope should be limited to this prefix). */
export const AVATAR_OBJECT_PREFIX = "avatars/";

/** Maximum avatar upload size enforced at the application trust boundary (bytes). */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** MIME types allowed for avatar uploads after the browser picks a file. */
export const ALLOWED_AVATAR_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedAvatarContentType =
  (typeof ALLOWED_AVATAR_CONTENT_TYPES)[number];
