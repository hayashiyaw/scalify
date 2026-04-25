"use client";

import Link from "next/link";
import { Suspense, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safePostLoginPath } from "@/lib/auth/safe-callback-url";

function LoginForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Use your email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
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
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not log in</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="bg-background min-h-full px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Log in</h1>
          <p className="text-muted-foreground text-sm">
            Access your account. Scheduling remains available on the home page.
          </p>
        </div>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Loading…</CardDescription>
              </CardHeader>
            </Card>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-muted-foreground text-sm">
          Need an account?{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            Create one
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
