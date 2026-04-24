"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useSyncExternalStore } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const current = theme ?? "system";
  const active = useMemo(
    () => OPTIONS.find((o) => o.value === current) ?? OPTIONS[2],
    [current],
  );
  const ActiveIcon = active.Icon;

  if (!mounted) {
    return (
      <div className="flex w-full min-w-[11rem] flex-col gap-2 sm:items-end">
        <Label className="text-muted-foreground sr-only">Appearance</Label>
        <div className="bg-muted h-8 w-full max-w-[11rem] animate-pulse rounded-lg sm:ml-auto" />
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-[11rem] flex-col gap-2 sm:items-end">
      <Label htmlFor="theme-select" className="text-muted-foreground text-xs">
        Appearance
      </Label>
      <Select
        value={current}
        onValueChange={(v) => {
          if (v) setTheme(v);
        }}
      >
        <SelectTrigger id="theme-select" className="w-full max-w-[11rem] gap-2 sm:ml-auto">
          <ActiveIcon className="size-4 shrink-0 opacity-70" aria-hidden />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {OPTIONS.map(({ value, label, Icon }) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2">
                <Icon className="size-4 opacity-70" aria-hidden />
                {label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
