import { format } from "date-fns";

import { parseISODateOnly } from "./dates";
import type { DayAssignment, PersonReport } from "./types";

export type MonthFilterOption = { key: string; label: string };

/** YYYY-MM keys and labels for each calendar month touched by [rangeStart, rangeEnd]. */
export function getMonthOptionsForRange(
  rangeStart: string,
  rangeEnd: string,
): MonthFilterOption[] {
  const s = parseISODateOnly(rangeStart);
  const e = parseISODateOnly(rangeEnd);
  const out: MonthFilterOption[] = [];
  let y = s.getFullYear();
  let mo = s.getMonth();
  while (true) {
    const first = new Date(y, mo, 1, 12, 0, 0);
    if (first > e) break;
    const key = `${y}-${String(mo + 1).padStart(2, "0")}`;
    out.push({ key, label: format(first, "MMMM yyyy") });
    mo++;
    if (mo > 11) {
      mo = 0;
      y++;
    }
  }
  return out;
}

type MemberRow = { id: string; name: string };

/** Aggregate weekday / weekend counts and hours for one calendar month from assignments. */
export function buildReportForMonth(
  assignments: DayAssignment[],
  members: MemberRow[],
  monthKey: string,
  /** Row order (e.g. scrambled cycle order from server); defaults to form order. */
  memberIdsOrder?: string[],
): PersonReport[] {
  const weekday = new Map<string, number>();
  const weekend = new Map<string, number>();
  for (const m of members) {
    weekday.set(m.id, 0);
    weekend.set(m.id, 0);
  }

  for (const a of assignments) {
    if (a.date.slice(0, 7) !== monthKey || !a.assigneeId) continue;
    if (a.pool === "A") {
      weekday.set(a.assigneeId, (weekday.get(a.assigneeId) ?? 0) + 1);
    } else {
      weekend.set(a.assigneeId, (weekend.get(a.assigneeId) ?? 0) + 1);
    }
  }

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const order =
    memberIdsOrder && memberIdsOrder.length > 0
      ? memberIdsOrder.filter((id) => nameById.has(id))
      : members.map((m) => m.id);

  return order.map((id) => {
    const wd = weekday.get(id) ?? 0;
    const wh = weekend.get(id) ?? 0;
    return {
      memberId: id,
      name: nameById.get(id) ?? "",
      weekdayDays: wd,
      weekendHolidayDays: wh,
      totalHours: wd * 12 + wh * 24,
    };
  });
}
