"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { ThemeSelector } from "@/components/theme-selector";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", label: "Scheduler", match: "exact" as const },
  { href: "/teams", label: "Squad", match: "prefix" as const },
  { href: "/account", label: "Profile", match: "prefix" as const },
];

function routeActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PrimaryNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      <div className="flex flex-col gap-1">
        {primaryNav.map((item) => {
          const active = routeActive(pathname, item.href, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="min-h-4 flex-1" aria-hidden />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center text-muted-foreground"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await signOut({ redirectTo: "/" });
          });
        }}
      >
        Logout
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const authed = status === "authenticated" && Boolean(session?.user);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          {authed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          ) : null}
          <Link
            href="/"
            className="font-heading text-base font-semibold tracking-tight text-foreground"
          >
            Scalify
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeSelector layout="toolbar" />
            {status === "loading" ? (
              <div className="bg-muted h-7 w-24 animate-pulse rounded-md" />
            ) : authed && session?.user?.email ? (
              <span
                className="text-muted-foreground hidden max-w-[12rem] truncate text-xs sm:inline md:max-w-[16rem]"
                title={session.user.email}
              >
                {session.user.email}
              </span>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 md:min-h-[calc(100vh-3.5rem)]">
        {authed ? (
          <aside className="border-border bg-background hidden w-56 shrink-0 self-start border-r md:sticky md:top-14 md:flex md:h-[calc(100vh-3.5rem)] md:flex-col md:overflow-y-auto">
            <PrimaryNavLinks className="p-3" />
          </aside>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {authed && mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation menu"
            onClick={closeMobile}
          />
          <div className="bg-background absolute top-0 left-0 flex h-full w-64 max-w-[85vw] flex-col border-r shadow-lg">
            <div className="border-border flex items-center justify-between border-b px-3 py-3">
              <span className="text-sm font-medium">Menu</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                onClick={closeMobile}
              >
                <X className="size-5" />
              </Button>
            </div>
            <PrimaryNavLinks className="p-3" onNavigate={closeMobile} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
