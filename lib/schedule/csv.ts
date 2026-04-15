import type { HolidayCountry, ScheduleResult } from "./types";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildScheduleCsv(
  holidayCountry: HolidayCountry,
  result: ScheduleResult,
  memberNames: Map<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`# holidayCountry=${holidayCountry}`);
  lines.push(
    ["date", "pool", "hours", "assigneeId", "assigneeName", "warning"]
      .map(escapeCsvCell)
      .join(","),
  );

  const warnDates = new Set(result.warnings.map((w) => w.date));

  for (const a of result.assignments) {
    const name = a.assigneeId ? memberNames.get(a.assigneeId) ?? "" : "";
    const warning = warnDates.has(a.date) ? "no_available_member" : "";
    lines.push(
      [
        a.date,
        a.pool,
        String(a.hours),
        a.assigneeId ?? "",
        name,
        warning,
      ]
        .map((c) => escapeCsvCell(String(c)))
        .join(","),
    );
  }

  lines.push("");
  lines.push(["memberId", "name", "weekdayDays", "weekendHolidayDays", "totalHours"]
    .map(escapeCsvCell)
    .join(","));

  for (const r of result.report) {
    lines.push(
      [
        r.memberId,
        r.name,
        String(r.weekdayDays),
        String(r.weekendHolidayDays),
        String(r.totalHours),
      ]
        .map((c) => escapeCsvCell(String(c)))
        .join(","),
    );
  }

  return lines.join("\r\n");
}
