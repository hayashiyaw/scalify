import { format } from "date-fns";

import { addDays, formatISODateOnly, parseISODateOnly } from "./dates";
import type {
  DayAssignment,
  ScheduleResult,
} from "./types";

/** Semicolon works reliably in Excel for PT/BR/EU locales (comma as decimal separator). */
const SEP = ";";

function escapeCsvCell(value: string): string {
  if (value.includes(SEP) || value.includes('"') || /[\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function joinRow(cells: string[]): string {
  return cells.map(escapeCsvCell).join(SEP);
}

const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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

function listMonthsInRange(rangeStart: string, rangeEnd: string): Date[] {
  const s = parseISODateOnly(rangeStart);
  const e = parseISODateOnly(rangeEnd);
  const months: Date[] = [];
  let y = s.getFullYear();
  let mo = s.getMonth();
  while (true) {
    const first = new Date(y, mo, 1, 12, 0, 0);
    if (first > e) break;
    months.push(first);
    mo++;
    if (mo > 11) {
      mo = 0;
      y++;
    }
  }
  return months;
}

function buildCalendarSections(
  rangeStart: string,
  rangeEnd: string,
  assignmentByDate: Map<string, DayAssignment>,
  memberNames: Map<string, string>,
): string[] {
  const lines: string[] = [];
  const months = listMonthsInRange(rangeStart, rangeEnd);

  for (const monthStart of months) {
    const y = monthStart.getFullYear();
    const mo = monthStart.getMonth();
    const monthLabel = format(monthStart, "MMMM yyyy");
    // 8 columns: month title in A, then 7 empty (aligns with week grid below)
    lines.push(joinRow([monthLabel, "", "", "", "", "", "", ""]));

    // Header: empty corner + weekday names (8 columns)
    lines.push(joinRow(["", ...WEEK_HEADERS]));

    const weeks = monthMatrix(monthStart);
    for (const week of weeks) {
      const cells: string[] = [""];
      let anyInMonth = false;
      for (const day of week) {
        const inMonth = day.getMonth() === mo && day.getFullYear() === y;
        if (inMonth) anyInMonth = true;

        const iso = formatISODateOnly(day);
        const inRange = iso >= rangeStart && iso <= rangeEnd;

        if (!inMonth || !inRange) {
          cells.push("");
          continue;
        }

        const a = assignmentByDate.get(iso);
        const dayNum = String(day.getDate());
        if (!a?.assigneeId) {
          cells.push(`${dayNum} - Unassigned`);
        } else {
          const name =
            memberNames.get(a.assigneeId)?.trim() || a.assigneeId;
          cells.push(`${dayNum} - ${name}`);
        }
      }
      if (anyInMonth) {
        lines.push(joinRow(cells));
      }
    }
    lines.push("");
  }

  return lines;
}

export function buildScheduleCsv(
  rangeStart: string,
  rangeEnd: string,
  result: ScheduleResult,
  memberNames: Map<string, string>,
): string {
  const lines: string[] = [];

  lines.push("# --- Summary ---");
  lines.push(
    joinRow(["name", "weekdayDays", "weekendHolidayDays", "totalHours"]),
  );

  for (const r of result.report) {
    lines.push(
      joinRow([
        r.name,
        String(r.weekdayDays),
        String(r.weekendHolidayDays),
        String(r.totalHours),
      ]),
    );
  }

  const assignmentByDate = new Map(
    result.assignments.map((x) => [x.date, x]),
  );

  lines.push("");
  lines.push("# --- Calendar ---");
  lines.push(
    ...buildCalendarSections(
      rangeStart,
      rangeEnd,
      assignmentByDate,
      memberNames,
    ),
  );

  // UTF-8 BOM helps Excel detect encoding on Windows
  return "\uFEFF" + lines.join("\r\n");
}
