import { describe, expect, it } from "vitest";

import {
  assertAvatarContentLengthAllowed,
  AvatarValidationError,
  normalizeAvatarContentType,
} from "@/lib/storage/avatar-validation";
import { isWellFormedAvatarObjectKey, makeAvatarObjectKey } from "@/lib/storage/avatar-key";
import { MAX_AVATAR_BYTES } from "@/lib/storage/constants";
import {
  composePublicObjectUrl,
  objectKeyFromPublicUrl,
} from "@/lib/storage/public-url";
import { parseStorageEnvFromProcess } from "@/lib/storage/env";

describe("composePublicObjectUrl", () => {
  it("joins base and key without duplicate slashes", () => {
    expect(
      composePublicObjectUrl("http://127.0.0.1:9000/scalify/", "/avatars/u/1"),
    ).toBe("http://127.0.0.1:9000/scalify/avatars/u/1");
  });

  it("trims whitespace", () => {
    expect(composePublicObjectUrl("  https://cdn.example  ", "  k  ")).toBe(
      "https://cdn.example/k",
    );
  });
});

describe("objectKeyFromPublicUrl", () => {
  it("extracts the key under the configured public base", () => {
    const base = "http://127.0.0.1:9000/scalify";
    const key = "avatars/user123/550e8400-e29b-41d4-a716-446655440000";
    const full = composePublicObjectUrl(base, key);
    expect(objectKeyFromPublicUrl(base, full)).toBe(key);
  });

  it("returns null for other origins or prefixes", () => {
    expect(
      objectKeyFromPublicUrl(
        "http://127.0.0.1:9000/scalify",
        "http://evil.example/scalify/avatars/x",
      ),
    ).toBeNull();
  });

  it("returns null when query strings are present (not canonical object URLs)", () => {
    expect(
      objectKeyFromPublicUrl(
        "http://127.0.0.1:9000/scalify",
        "http://127.0.0.1:9000/scalify/avatars/x?v=1",
      ),
    ).toBeNull();
  });
});

describe("makeAvatarObjectKey", () => {
  it("places objects under avatars/{userId}/…", () => {
    const key = makeAvatarObjectKey("clabcdefghijklmn");
    expect(key.startsWith("avatars/clabcdefghijklmn/")).toBe(true);
    expect(isWellFormedAvatarObjectKey(key)).toBe(true);
  });

  it("rejects unsafe user ids", () => {
    expect(() => makeAvatarObjectKey("../other")).toThrow();
    expect(() => makeAvatarObjectKey("short")).toThrow();
  });
});

describe("isWellFormedAvatarObjectKey", () => {
  it("rejects traversal and bad prefixes", () => {
    expect(isWellFormedAvatarObjectKey("other/avatars/x")).toBe(false);
    expect(isWellFormedAvatarObjectKey("avatars/../x")).toBe(false);
    expect(isWellFormedAvatarObjectKey("avatars/onlyone")).toBe(false);
  });
});

describe("avatar upload validation", () => {
  it("allows listed image types", () => {
    expect(normalizeAvatarContentType("image/png")).toBe("image/png");
    expect(normalizeAvatarContentType("  IMAGE/JPEG  ")).toBe("image/jpeg");
  });

  it("rejects unknown content types", () => {
    expect(() => normalizeAvatarContentType("application/octet-stream")).toThrow(
      AvatarValidationError,
    );
  });

  it("enforces max size", () => {
    assertAvatarContentLengthAllowed(MAX_AVATAR_BYTES);
    expect(() => assertAvatarContentLengthAllowed(MAX_AVATAR_BYTES + 1)).toThrow(
      AvatarValidationError,
    );
    expect(() => assertAvatarContentLengthAllowed(0)).toThrow(AvatarValidationError);
  });
});

describe("parseStorageEnvFromProcess", () => {
  it("parses a MinIO-style configuration", () => {
    const cfg = parseStorageEnvFromProcess({
      S3_ENDPOINT: "http://127.0.0.1:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "scalify",
      S3_ACCESS_KEY_ID: "minioadmin",
      S3_SECRET_ACCESS_KEY: "minioadmin",
      S3_PUBLIC_URL_BASE: "http://127.0.0.1:9000/scalify",
      S3_FORCE_PATH_STYLE: "true",
    });
    expect(cfg.s3Bucket).toBe("scalify");
    expect(cfg.s3Endpoint).toBe("http://127.0.0.1:9000");
    expect(cfg.s3ForcePathStyle).toBe(true);
  });

  it("defaults path-style when an endpoint is set and force flag omitted", () => {
    const cfg = parseStorageEnvFromProcess({
      S3_ENDPOINT: "http://127.0.0.1:9000",
      S3_BUCKET: "b",
      S3_ACCESS_KEY_ID: "k",
      S3_SECRET_ACCESS_KEY: "s",
      S3_PUBLIC_URL_BASE: "http://127.0.0.1:9000/b",
    });
    expect(cfg.s3ForcePathStyle).toBe(true);
  });

  it("throws when required variables are missing", () => {
    expect(() => parseStorageEnvFromProcess({})).toThrow(/S3_BUCKET/);
  });
});
