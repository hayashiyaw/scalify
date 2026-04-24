"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";

import { initialSignupState, logoutAction, signupAction } from "@/app/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthPanel() {
  const { data: session, status, update } = useSession();
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isLogoutPending, startLogoutTransition] = useTransition();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialSignupState,
  );

  const signupError = useMemo(() => {
    if (signupState.success) {
      return null;
    }
    return signupState.message;
  }, [signupState.message, signupState.success]);

  useEffect(() => {
    if (!signupState.success) {
      return;
    }
    void update();
  }, [signupState.success, update]);

  if (status === "loading") {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Loading account state...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (session?.user?.email) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Logged in as <span className="font-medium">{session.user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            disabled={isLogoutPending}
            onClick={() => {
              startLogoutTransition(async () => {
                await logoutAction();
                await update();
              });
            }}
          >
            {isLogoutPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Log out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Optional account</CardTitle>
        <CardDescription>
          Create an account to save teams later. Scheduling stays available without login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setLoginError(null);
            const form = event.currentTarget;
            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("loginEmail") ?? "");
            const password = String(formData.get("loginPassword") ?? "");
            startLoginTransition(async () => {
              const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
              });
              if (result?.error) {
                setLoginError("Invalid email or password.");
                return;
              }
              await update();
              form.reset();
            });
          }}
        >
          <h2 className="font-medium">Log in</h2>
          <div className="space-y-1">
            <Label htmlFor="loginEmail">Email</Label>
            <Input id="loginEmail" name="loginEmail" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="loginPassword">Password</Label>
            <Input id="loginPassword" name="loginPassword" type="password" required />
          </div>
          <Button type="submit" variant="outline" disabled={isLoginPending}>
            {isLoginPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Log in
          </Button>
          {loginError ? (
            <p className="text-sm text-destructive" role="alert">
              {loginError}
            </p>
          ) : null}
        </form>

        <form action={signupFormAction} className="space-y-3">
          <h2 className="font-medium">Create account</h2>
          <div className="space-y-1">
            <Label htmlFor="signupName">Name</Label>
            <Input id="signupName" name="name" type="text" required />
            {signupState.fieldErrors.name?.length ? (
              <p className="text-sm text-destructive" role="alert">
                {signupState.fieldErrors.name[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="signupEmail">Email</Label>
            <Input id="signupEmail" name="email" type="email" required />
            {signupState.fieldErrors.email?.length ? (
              <p className="text-sm text-destructive" role="alert">
                {signupState.fieldErrors.email[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="signupPassword">Password</Label>
            <Input id="signupPassword" name="password" type="password" required />
            {signupState.fieldErrors.password?.length ? (
              <p className="text-sm text-destructive" role="alert">
                {signupState.fieldErrors.password[0]}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Use at least 8 chars with uppercase, lowercase, number, and symbol.
              </p>
            )}
          </div>
          <Button type="submit" disabled={signupPending}>
            {signupPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Create account
          </Button>
        </form>

        {signupError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not create account</AlertTitle>
            <AlertDescription>{signupError}</AlertDescription>
          </Alert>
        ) : null}
        {signupState.success ? (
          <Alert>
            <AlertTitle>Account ready</AlertTitle>
            <AlertDescription>{signupState.message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
