import { describe, expect, it } from "vitest";

import { safePostLoginPath } from "@/lib/auth/safe-callback-url";

const origin = "http://localhost:3000";

describe("safePostLoginPath", () => {
  it("defaults to home when callback is missing", () => {
    expect(safePostLoginPath(null, origin)).toBe("/");
    expect(safePostLoginPath(undefined, origin)).toBe("/");
    expect(safePostLoginPath("  ", origin)).toBe("/");
  });

  it("allows same-origin paths", () => {
    expect(safePostLoginPath("/teams", origin)).toBe("/teams");
    expect(safePostLoginPath("/account", origin)).toBe("/account");
    expect(safePostLoginPath("/teams?tab=1", origin)).toBe("/teams?tab=1");
  });

  it("resolves absolute same-origin URLs to path", () => {
    expect(safePostLoginPath("http://localhost:3000/teams", origin)).toBe("/teams");
  });

  it("rejects other origins", () => {
    expect(safePostLoginPath("https://evil.example/phish", origin)).toBe("/");
    expect(safePostLoginPath("//evil.example/phish", origin)).toBe("/");
  });

  it("avoids redirect loops through auth pages", () => {
    expect(safePostLoginPath("/login", origin)).toBe("/");
    expect(safePostLoginPath("/login?x=1", origin)).toBe("/");
    expect(safePostLoginPath("/register", origin)).toBe("/");
  });
});
