"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PersonReport } from "@/lib/schedule/types";

type Props = {
  report: PersonReport[];
};

export function ReportDashboard({ report }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Summary</CardTitle>
        <CardDescription>
          Weekdays: 12 hours each. Weekends and public holidays: 24 hours each.
        </CardDescription>
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
            {report.map((r) => (
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
