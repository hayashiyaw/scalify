const SIGN_IN_PATH = "/login";

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/teams" ||
    pathname.startsWith("/teams/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  );
}

export function buildLoginRedirectUrl(
  requestPathname: string,
  requestSearch: string,
  origin: string,
): URL {
  const url = new URL(SIGN_IN_PATH, origin);
  const returnPath = `${requestPathname}${requestSearch}`;
  url.searchParams.set("callbackUrl", returnPath);
  return url;
}

/**
 * Fail-closed: unauthenticated users (no token) must be redirected to login,
 * including when AUTH_SECRET is missing and JWT verification cannot succeed.
 */
export function shouldRedirectUnauthenticatedToLogin(token: unknown): boolean {
  return !token;
}

export { SIGN_IN_PATH };
