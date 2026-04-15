"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildScheduleCsv } from "@/lib/schedule/csv";
import type { HolidayCountry, ScheduleMember, ScheduleResult } from "@/lib/schedule/types";

type Props = {
  holidayCountry: HolidayCountry;
  rangeStart: string;
  rangeEnd: string;
  members: ScheduleMember[];
  result: ScheduleResult | null;
};

export function ExportCsvButton({
  holidayCountry,
  rangeStart,
  rangeEnd,
  members,
  result,
}: Props) {
  const disabled = !result;

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled}
      onClick={() => {
        if (!result) return;
        const names = new Map(members.map((m) => [m.id, m.name]));
        const csv = buildScheduleCsv(rangeStart, rangeEnd, result, names);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `scalify-schedule-${holidayCountry}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      <Download className="mr-2 size-4" />
      Export CSV
    </Button>
  );
}
