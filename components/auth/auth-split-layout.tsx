import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthSplitLayoutProps = {
  brand?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AuthSplitLayout({ brand, children, className }: AuthSplitLayoutProps) {
  return (
    <main className={cn("min-h-screen w-full flex flex-col md:grid md:grid-cols-2", className)}>
      <section className="min-h-[40vh] md:min-h-screen">{brand}</section>
      <section className="bg-auth-form-bg text-auth-form-fg flex min-h-0 flex-col md:min-h-screen">
        {children}
      </section>
    </main>
  );
}
