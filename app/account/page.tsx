import Link from "next/link";

import { AccountCard } from "@/components/auth/account-card";
import { ThemeSelector } from "@/components/theme-selector";

export default function AccountPage() {
  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-6">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Account</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Your sign-in and profile settings live here.
            </p>
          </div>
          <ThemeSelector />
        </header>

        <AccountCard />

        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/teams" className="text-primary underline-offset-4 hover:underline">
            Teams
          </Link>
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            Back to scheduler
          </Link>
        </div>
      </div>
    </div>
  );
}
