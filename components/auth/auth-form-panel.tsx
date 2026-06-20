import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type AuthFormPanelProps = {
  brandName?: string;
  brandHref?: string;
  title: string;
  alternatePrompt?: string;
  alternateLinkLabel?: string;
  alternateLinkHref?: string;
  footerLinkLabel?: string;
  footerLinkHref?: string;
  children: ReactNode;
  className?: string;
};

export function AuthFormPanel({
  brandName = "Scalify",
  brandHref = "/",
  title,
  alternatePrompt,
  alternateLinkLabel,
  alternateLinkHref,
  footerLinkLabel,
  footerLinkHref,
  children,
  className,
}: AuthFormPanelProps) {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col p-8 md:p-12", className)}>
      <Link href={brandHref} className="font-heading text-lg font-semibold tracking-tight">
        {brandName}
      </Link>

      <main className="flex flex-1 items-center justify-center py-10 md:py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
            {alternatePrompt && alternateLinkLabel && alternateLinkHref ? (
              <p className="text-sm text-auth-form-muted">
                {alternatePrompt}{" "}
                <Link
                  href={alternateLinkHref}
                  className="underline underline-offset-4 transition-opacity hover:opacity-80"
                >
                  {alternateLinkLabel}
                </Link>
              </p>
            ) : null}
          </div>

          {children}
        </div>
      </main>

      {footerLinkLabel && footerLinkHref ? (
        <Link
          href={footerLinkHref}
          className="self-start text-sm text-auth-form-muted underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          {footerLinkLabel}
        </Link>
      ) : null}
    </div>
  );
}
