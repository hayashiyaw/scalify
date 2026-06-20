import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthBrandPanelProps = {
  headline: string;
  tagline: string;
  year?: number;
  className?: string;
};

export function AuthBrandPanel({
  headline,
  tagline,
  year = new Date().getFullYear(),
  className,
}: AuthBrandPanelProps) {
  return (
    <aside
      className={cn(
        "relative min-h-[40vh] overflow-hidden bg-gradient-to-br from-auth-brand to-auth-brand-end p-8 text-white md:min-h-screen md:p-12",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-12" aria-hidden>
        <svg
          viewBox="0 0 1000 1000"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100 190C100 80 300 80 500 190C700 300 900 300 1100 190"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M-100 460C100 350 300 350 500 460C700 570 900 570 1100 460"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M-100 730C100 620 300 620 500 730C700 840 900 840 1100 730"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="max-w-xl space-y-6">
          <div className="inline-flex size-20 items-center justify-center rounded-full bg-white/10 p-5">
            <CalendarDays className="size-10 text-white" aria-hidden />
          </div>
          <div className="space-y-4">
            <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
              {headline}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/90 md:text-lg">
              {tagline}
            </p>
          </div>
        </div>

        <p className="pt-8 text-sm text-white/80">&copy; {year} Scalify</p>
      </div>
    </aside>
  );
}
