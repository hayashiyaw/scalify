"use client";

import { Suspense, useSyncExternalStore, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormPanel } from "@/components/auth/auth-form-panel";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { safePostLoginPath, buildAuthHref } from "@/lib/auth/safe-callback-url";

const BRAND_HEADLINE = "Fair shifts for every squad 📅";
const BRAND_TAGLINE =
  "Plan rotations, respect time off, and export your calendar—without the spreadsheet.";

function useAuthHrefFromLocation(path: string): string {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    () =>
      buildAuthHref(
        path,
        new URLSearchParams(window.location.search).get("callbackUrl"),
        window.location.origin,
      ),
    () => path,
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const result = await signIn("credentials", {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            redirect: false,
          });
          if (result?.error) {
            setError("Invalid email or password.");
            return;
          }
          const next = safePostLoginPath(
            searchParams.get("callbackUrl"),
            window.location.origin,
          );
          window.location.assign(next);
        });
      }}
    >
      <AuthField id="email" label="Email">
        <AuthInput id="email" name="email" type="email" required />
      </AuthField>

      <AuthField id="password" label="Password">
        <AuthInput id="password" name="password" type="password" required />
      </AuthField>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not log in</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full rounded-full bg-black text-white hover:bg-neutral-800"
        disabled={isPending}
      >
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Login Now
      </Button>
    </form>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const registerHref = buildAuthHref("/register", callbackUrl, "http://local.invalid");

  return (
    <AuthSplitLayout
      brand={<AuthBrandPanel headline={BRAND_HEADLINE} tagline={BRAND_TAGLINE} />}
    >
      <AuthFormPanel
        brandName="Scalify"
        brandHref="/"
        title="Welcome Back!"
        alternatePrompt="Don't have an account?"
        alternateLinkLabel="Sign up"
        alternateLinkHref={registerHref}
        footerLinkLabel="Back to scheduler"
        footerLinkHref="/"
      >
        <LoginForm />
      </AuthFormPanel>
    </AuthSplitLayout>
  );
}

function LoginFallback() {
  const registerHref = useAuthHrefFromLocation("/register");

  return (
    <AuthSplitLayout
      brand={<AuthBrandPanel headline={BRAND_HEADLINE} tagline={BRAND_TAGLINE} />}
    >
      <AuthFormPanel
        brandName="Scalify"
        brandHref="/"
        title="Welcome Back!"
        alternatePrompt="Don't have an account?"
        alternateLinkLabel="Sign up"
        alternateLinkHref={registerHref}
        footerLinkLabel="Back to scheduler"
        footerLinkHref="/"
      >
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="text-sm text-auth-form-muted">Loading…</p>
          <div className="h-10 animate-pulse rounded-sm bg-auth-form-muted/20" />
          <div className="h-10 animate-pulse rounded-sm bg-auth-form-muted/20" />
          <div className="h-11 animate-pulse rounded-full bg-auth-form-muted/30" />
        </div>
      </AuthFormPanel>
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
