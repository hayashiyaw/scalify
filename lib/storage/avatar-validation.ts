import {
  ALLOWED_AVATAR_CONTENT_TYPES,
  MAX_AVATAR_BYTES,
  type AllowedAvatarContentType,
} from "@/lib/storage/constants";

export class AvatarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarValidationError";
  }
}

export function normalizeAvatarContentType(
  contentType: string,
): AllowedAvatarContentType {
  const normalized = contentType.trim().toLowerCase();
  if (
    !(ALLOWED_AVATAR_CONTENT_TYPES as readonly string[]).includes(normalized)
  ) {
    throw new AvatarValidationError(
      `Avatar content type not allowed: ${contentType}`,
    );
  }
  return normalized as AllowedAvatarContentType;
}

export function assertAvatarContentLengthAllowed(
  contentLength: number,
): void {
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new AvatarValidationError("Avatar content length must be positive");
  }
  if (contentLength > MAX_AVATAR_BYTES) {
    throw new AvatarValidationError(
      `Avatar exceeds maximum size of ${MAX_AVATAR_BYTES} bytes`,
    );
  }
}
