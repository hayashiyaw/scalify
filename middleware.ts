import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  buildLoginRedirectUrl,
  isProtectedPath,
  shouldRedirectUnauthenticatedToLogin,
} from "@/lib/auth/protected-routes";

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    console.error(
      "AUTH_SECRET (or NEXTAUTH_SECRET) is not set; protected routes fail closed.",
    );
  } else if (!secret) {
    console.warn(
      "AUTH_SECRET (or NEXTAUTH_SECRET) is not set; protected routes fail closed.",
    );
  }

  const token = secret ? await getToken({ req: request, secret }) : null;
  if (!shouldRedirectUnauthenticatedToLogin(token)) {
    return NextResponse.next();
  }

  const url = buildLoginRedirectUrl(
    request.nextUrl.pathname,
    request.nextUrl.search,
    request.nextUrl.origin,
  );
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/teams", "/teams/:path*", "/account", "/account/:path*"],
};
