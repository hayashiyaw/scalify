/**
 * Builds an auth page href, preserving a safe callbackUrl query param when present.
 */
export function buildAuthHref(
  path: string,
  callbackUrl: string | null | undefined,
  origin: string,
): string {
  if (!callbackUrl?.trim()) {
    return path;
  }
  const safe = safePostLoginPath(callbackUrl, origin);
  if (safe === "/") {
    return path;
  }
  const params = new URLSearchParams({ callbackUrl: callbackUrl.trim() });
  return `${path}?${params.toString()}`;
}

/**
 * Resolves a post-login redirect target from `callbackUrl` query param.
 * Only same-origin paths are allowed; auth pages fall back to `/`.
 */
export function safePostLoginPath(
  callbackUrl: string | null | undefined,
  windowOrigin: string,
): string {
  if (!callbackUrl) {
    return "/";
  }
  const trimmed = callbackUrl.trim();
  if (!trimmed) {
    return "/";
  }
  try {
    const resolved = new URL(trimmed, windowOrigin);
    if (resolved.origin !== new URL(windowOrigin).origin) {
      return "/";
    }
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) {
      return "/";
    }
    if (
      path === "/login" ||
      path.startsWith("/login?") ||
      path === "/register" ||
      path.startsWith("/register?")
    ) {
      return "/";
    }
    return path || "/";
  } catch {
    return "/";
  }
}
