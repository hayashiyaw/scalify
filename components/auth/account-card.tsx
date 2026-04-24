"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountCard() {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();

  if (status === "loading") {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Loading account status...</CardDescription>
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
            Signed in as <span className="font-medium">{session.user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await signOut({ redirectTo: "/" });
              });
            }}
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
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
          Scheduling is public. Create an account to unlock team saving features.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Log in
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "default" })}>
          Create account
        </Link>
      </CardContent>
    </Card>
  );
}
