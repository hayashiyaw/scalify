"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildReportForMonth,
  getMonthOptionsForRange,
} from "@/lib/schedule/summary-month";
import type { DayAssignment, PersonReport } from "@/lib/schedule/types";

type MemberRef = { id: string; name: string };

type Props = {
  report: PersonReport[];
  assignments: DayAssignment[];
  members: MemberRef[];
  /** Scrambled cycle order from scheduler (summary + per-month rows). */
  memberDisplayOrder: string[];
  rangeStart: string;
  rangeEnd: string;
};

const ALL_VALUE = "all";

export function ReportDashboard({
  report,
  assignments,
  members,
  memberDisplayOrder,
  rangeStart,
  rangeEnd,
}: Props) {
  const monthOptions = useMemo(
    () => getMonthOptionsForRange(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const showMonthFilter = monthOptions.length > 1;

  const [monthFilter, setMonthFilter] = useState<string>(ALL_VALUE);

  useEffect(() => {
    setMonthFilter(ALL_VALUE);
  }, [report, rangeStart, rangeEnd]);

  const displayReport = useMemo(() => {
    if (!showMonthFilter || monthFilter === ALL_VALUE) return report;
    return buildReportForMonth(
      assignments,
      members,
      monthFilter,
      memberDisplayOrder,
    );
  }, [
    showMonthFilter,
    monthFilter,
    report,
    assignments,
    members,
    memberDisplayOrder,
  ]);

  const filterDescription = useMemo(() => {
    if (!showMonthFilter || monthFilter === ALL_VALUE) {
      return "Weekdays: 12 hours each. Weekends and public holidays: 24 hours each.";
    }
    const label =
      monthOptions.find((o) => o.key === monthFilter)?.label ?? monthFilter;
    return `Showing ${label} only. Weekdays: 12h, weekends/holidays: 24h.`;
  }, [showMonthFilter, monthFilter, monthOptions]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Summary</CardTitle>
            <CardDescription>{filterDescription}</CardDescription>
          </div>
          {showMonthFilter ? (
            <div className="flex w-full min-w-[12rem] flex-col gap-2 sm:w-auto sm:items-end">
              <Label htmlFor="summary-month" className="text-muted-foreground text-xs">
                Month
              </Label>
              <Select
                value={monthFilter}
                onValueChange={(v) => {
                  if (v) setMonthFilter(v);
                }}
              >
                <SelectTrigger id="summary-month" className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={ALL_VALUE}>Full range</SelectItem>
                  {monthOptions.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Weekdays</th>
              <th className="pb-2 pr-4 font-medium">Weekends / holidays</th>
              <th className="pb-2 font-medium">Total hours</th>
            </tr>
          </thead>
          <tbody>
            {displayReport.map((r) => (
              <tr key={r.memberId} className="border-b border-border/60">
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4 tabular-nums">{r.weekdayDays}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {r.weekendHolidayDays}
                </td>
                <td className="py-2 tabular-nums font-medium">
                  {r.totalHours}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
