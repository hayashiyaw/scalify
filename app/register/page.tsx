"use client";

import Link from "next/link";
import { Suspense, useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { type SignupActionState, signupAction } from "@/app/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAuthHref, safePostLoginPath } from "@/lib/auth/safe-callback-url";

function RegisterContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const loginHref = buildAuthHref("/login", callbackUrl, "http://local.invalid");

  const initialSignupState: SignupActionState = {
    message: null,
    success: false,
    fieldErrors: {},
  };
  const [signupState, formAction, pending] = useActionState(signupAction, initialSignupState);
  const safeSignupState = signupState ?? initialSignupState;

  useEffect(() => {
    if (!safeSignupState.success) {
      return;
    }
    const next = safePostLoginPath(callbackUrl, window.location.origin);
    window.location.assign(next);
  }, [callbackUrl, safeSignupState.success]);

  return (
    <main className="bg-background min-h-full px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-muted-foreground text-sm">
            Register with email/password. You can still use the scheduler without login.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
            <CardDescription>Use a strong password to secure your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" type="text" required />
                {safeSignupState.fieldErrors?.name?.length ? (
                  <p className="text-sm text-destructive">{safeSignupState.fieldErrors.name[0]}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
                {safeSignupState.fieldErrors?.email?.length ? (
                  <p className="text-sm text-destructive">{safeSignupState.fieldErrors.email[0]}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
                {safeSignupState.fieldErrors?.password?.length ? (
                  <p className="text-sm text-destructive">
                    {safeSignupState.fieldErrors.password[0]}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    At least 8 chars with uppercase, lowercase, number, and symbol.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create account
              </Button>
            </form>
          </CardContent>
        </Card>

        {!safeSignupState.success && safeSignupState.message ? (
          <Alert variant="destructive">
            <AlertTitle>Could not create account</AlertTitle>
            <AlertDescription>{safeSignupState.message}</AlertDescription>
          </Alert>
        ) : null}

        <p className="text-muted-foreground text-sm">
          Already registered?{" "}
          <Link href={loginHref} className="text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
          .{" "}
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            Back to scheduler
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function RegisterFallback() {
  return (
    <main className="bg-background min-h-full px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterContent />
    </Suspense>
  );
}
