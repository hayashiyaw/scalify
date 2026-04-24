"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Signed-out prompt for loading a roster saved on the server into the calculator.
 * Does not call team APIs; copy stays generic (no team-identifying data).
 */
export function TeamRosterLoadTease() {
  const { status } = useSession();

  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Load a saved roster</CardTitle>
        <CardDescription>
          Sign in to load a roster you previously saved with your account. Nothing is fetched
          from the server until you are signed in and choose to load it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/login" className={buttonVariants({ variant: "default" })}>
          Log in
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "outline" })}>
          Create account
        </Link>
      </CardContent>
    </Card>
  );
}
