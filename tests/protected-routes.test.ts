import { describe, expect, it } from "vitest";

import {
  buildLoginRedirectUrl,
  isProtectedPath,
  shouldRedirectUnauthenticatedToLogin,
} from "@/lib/auth/protected-routes";

describe("isProtectedPath", () => {
  it("matches account and teams routes", () => {
    expect(isProtectedPath("/account")).toBe(true);
    expect(isProtectedPath("/account/settings")).toBe(true);
    expect(isProtectedPath("/teams")).toBe(true);
    expect(isProtectedPath("/teams/abc")).toBe(true);
  });

  it("does not match public routes", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/register")).toBe(false);
  });
});

describe("shouldRedirectUnauthenticatedToLogin", () => {
  it("redirects when token is missing (fail-closed without secret)", () => {
    expect(shouldRedirectUnauthenticatedToLogin(null)).toBe(true);
    expect(shouldRedirectUnauthenticatedToLogin(undefined)).toBe(true);
  });

  it("allows access when token is present", () => {
    expect(shouldRedirectUnauthenticatedToLogin({ sub: "1" })).toBe(false);
  });
});

describe("buildLoginRedirectUrl", () => {
  it("preserves return path in callbackUrl", () => {
    const url = buildLoginRedirectUrl("/account", "?tab=profile", "https://app.example");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("callbackUrl")).toBe("/account?tab=profile");
    expect(url.origin).toBe("https://app.example");
  });
});
