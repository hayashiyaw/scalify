import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SIGN_IN_PATH = "/login";

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/teams" ||
    pathname.startsWith("/teams/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  );
}

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret });
  if (token) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = SIGN_IN_PATH;
  const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.searchParams.set("callbackUrl", returnPath);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/teams", "/teams/:path*", "/account", "/account/:path*"],
};
