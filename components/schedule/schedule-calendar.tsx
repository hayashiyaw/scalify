"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, formatISODateOnly, parseISODateOnly } from "@/lib/schedule/dates";
import { getMemberColors, type MemberColorMode } from "@/lib/schedule/colors";
import type { DayAssignment } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Props = {
  rangeStart: string;
  rangeEnd: string;
  assignments: DayAssignment[];
  memberNames: Map<string, string>;
  /** Legend order (scrambled cycle order), not form order. */
  memberDisplayOrder: string[];
  colorMode: MemberColorMode;
};

function monthMatrix(monthStart: Date): Date[][] {
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth();
  const first = new Date(y, m, 1, 12, 0, 0);
  const startPad = first.getDay();
  const gridStart = addDays(first, -startPad);
  const weeks: Date[][] = [];
  let cur = gridStart;
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(cur);
      cur = addDays(cur, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export function ScheduleCalendar({
  rangeStart,
  rangeEnd,
  assignments,
  memberNames,
  memberDisplayOrder,
  colorMode,
}: Props) {
  const start = parseISODateOnly(rangeStart);
  const end = parseISODateOnly(rangeEnd);
  const [cursor, setCursor] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0));

  const byDate = useMemo(() => {
    const m = new Map<string, DayAssignment>();
    for (const a of assignments) m.set(a.date, a);
    return m;
  }, [assignments]);

  const weeks = useMemo(() => monthMatrix(cursor), [cursor]);

  const title = cursor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const canPrev =
    new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12, 0, 0).getTime() >
    new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0).getTime();

  const canNext =
    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12, 0, 0).getTime() <
    new Date(end.getFullYear(), end.getMonth(), 1, 12, 0, 0).getTime();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">Calendar</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canPrev}
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12, 0, 0),
              )
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-medium">
            {title}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canNext}
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0),
              )
            }
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[280px]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day) => {
              const iso = formatISODateOnly(day);
              const inRange = iso >= rangeStart && iso <= rangeEnd;
              const sameMonth = day.getMonth() === cursor.getMonth();
              const assignment = byDate.get(iso);
              const assigneeId = assignment?.assigneeId ?? null;
              const colors = assigneeId
                ? getMemberColors(assigneeId, colorMode)
                : null;
              const label = assigneeId
                ? memberNames.get(assigneeId) ?? assigneeId
                : inRange
                  ? "—"
                  : "";

              return (
                <div
                  key={iso}
                  className={cn(
                    "flex min-h-[4.25rem] flex-col rounded-md border p-1 text-left text-xs transition-colors",
                    !sameMonth && "opacity-40",
                    !inRange && "bg-muted/30 text-muted-foreground",
                    inRange && !assigneeId && "border-destructive/40 bg-destructive/5",
                    inRange &&
                      assigneeId &&
                      "border-transparent shadow-sm",
                  )}
                  style={
                    inRange && assigneeId && colors
                      ? {
                          backgroundColor: colors.background,
                          color: colors.foreground,
                        }
                      : undefined
                  }
                >
                  <span className="font-semibold tabular-nums">
                    {day.getDate()}
                  </span>
                  {inRange ? (
                    <span className="line-clamp-2 break-words text-[0.7rem] leading-tight">
                      {assigneeId ? label : "Unassigned"}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
            <span className="font-medium">People</span>
            {memberDisplayOrder.map((id) => {
              const name = memberNames.get(id)?.trim() || id;
              const colors = getMemberColors(id, colorMode);
              return (
                <span
                  key={id}
                  className="rounded-md border px-2 py-0.5 font-medium shadow-sm"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.foreground,
                  }}
                >
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
