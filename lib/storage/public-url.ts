/**
 * Joins a public URL base (typically including bucket path for MinIO path-style)
 * with an object key. Both inputs are trimmed; the base has trailing slashes removed.
 */
export function composePublicObjectUrl(
  publicUrlBase: string,
  objectKey: string,
): string {
  const base = publicUrlBase.trim().replace(/\/+$/, "");
  const key = objectKey.trim().replace(/^\/+/, "");
  if (!base) throw new Error("publicUrlBase is required");
  if (!key) throw new Error("objectKey is required");
  return `${base}/${key}`;
}

/**
 * Given a stored public HTTPS URL and the configured public base, returns the object key
 * or null if the URL is not under the base (used for best-effort deletes).
 */
export function objectKeyFromPublicUrl(
  publicUrlBase: string,
  fullUrl: string,
): string | null {
  const base = publicUrlBase.trim().replace(/\/+$/, "");
  const url = fullUrl.trim();
  if (!base || !url) return null;
  const prefix = `${base}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  if (!key || key.includes("?")) return null;
  return decodeURIComponent(key);
}
