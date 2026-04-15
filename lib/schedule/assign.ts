import type {
  DayAssignment,
  PersonReport,
  ScheduleInput,
  ScheduleResult,
  ScheduleWarning,
  ShiftPool,
} from "./types";
import { addDays, formatISODateOnly, isWeekend, parseISODateOnly } from "./dates";
import type { HolidayChecker } from "./holidays";

function enumerateDaysInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = start;
  while (cur.getTime() <= end.getTime()) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function poolForDay(
  date: Date,
  isPublicHoliday: HolidayChecker,
): { pool: ShiftPool; hours: number } {
  const weekendOrHoliday = isWeekend(date) || isPublicHoliday(date);
  if (weekendOrHoliday) return { pool: "B", hours: 24 };
  return { pool: "A", hours: 12 };
}

/**
 * Fair assignment within a day:
 * - Pool A: minimize weekday shifts, then weekend/holiday shifts (spread load),
 *   then team order.
 * - Pool B: minimize weekend/holiday shifts, then weekday shifts, then team order.
 *
 * Secondary key on the *other* pool avoids one person hoarding both buckets when
 * primary counts tie (total-hours tie-break was skewing that).
 */
function pickAssignee(
  availableIds: string[],
  pool: ShiftPool,
  weekdayCount: Map<string, number>,
  weekendHolidayCount: Map<string, number>,
  teamOrder: Map<string, number>,
): string {
  let best = availableIds[0]!;
  for (let i = 1; i < availableIds.length; i++) {
    const id = availableIds[i]!;
    const wd = weekdayCount.get(id)!;
    const wh = weekendHolidayCount.get(id)!;
    const bwd = weekdayCount.get(best)!;
    const bwh = weekendHolidayCount.get(best)!;
    const ord = teamOrder.get(id)!;
    const bord = teamOrder.get(best)!;

    if (pool === "A") {
      if (wd < bwd) best = id;
      else if (wd > bwd) continue;
      else if (wh < bwh) best = id;
      else if (wh > bwh) continue;
      else if (ord < bord) best = id;
    } else {
      if (wh < bwh) best = id;
      else if (wh > bwh) continue;
      else if (wd < bwd) best = id;
      else if (wd > bwd) continue;
      else if (ord < bord) best = id;
    }
  }
  return best;
}

export function assignShifts(
  input: ScheduleInput,
  isPublicHoliday: HolidayChecker,
): ScheduleResult {
  const start = parseISODateOnly(input.startDate);
  const end = parseISODateOnly(input.endDate);
  const days = enumerateDaysInclusive(start, end);

  const teamOrder = new Map(
    input.members.map((m, index) => [m.id, index]),
  );

  const weekdayCount = new Map<string, number>();
  const weekendHolidayCount = new Map<string, number>();
  for (const m of input.members) {
    weekdayCount.set(m.id, 0);
    weekendHolidayCount.set(m.id, 0);
  }

  const assignments: DayAssignment[] = [];
  const warnings: ScheduleWarning[] = [];

  for (const day of days) {
    const dateStr = formatISODateOnly(day);
    const { pool, hours } = poolForDay(day, isPublicHoliday);

    const available = input.members.filter(
      (m) => !m.unavailableDates.includes(dateStr),
    );

    if (available.length === 0) {
      assignments.push({
        date: dateStr,
        pool,
        assigneeId: null,
        hours,
      });
      warnings.push({ date: dateStr, code: "no_available_member" });
      continue;
    }

    const availableIds = available
      .map((m) => m.id)
      .sort((a, b) => {
        const oa = teamOrder.get(a)!;
        const ob = teamOrder.get(b)!;
        if (oa !== ob) return oa - ob;
        return a.localeCompare(b);
      });
    const chosenId = pickAssignee(
      availableIds,
      pool,
      weekdayCount,
      weekendHolidayCount,
      teamOrder,
    );

    if (pool === "A") {
      weekdayCount.set(chosenId, weekdayCount.get(chosenId)! + 1);
    } else {
      weekendHolidayCount.set(
        chosenId,
        weekendHolidayCount.get(chosenId)! + 1,
      );
    }

    assignments.push({
      date: dateStr,
      pool,
      assigneeId: chosenId,
      hours,
    });
  }

  const report: PersonReport[] = input.members.map((m) => {
    const wd = weekdayCount.get(m.id)!;
    const wh = weekendHolidayCount.get(m.id)!;
    return {
      memberId: m.id,
      name: m.name,
      weekdayDays: wd,
      weekendHolidayDays: wh,
      totalHours: wd * 12 + wh * 24,
    };
  });

  return { assignments, report, warnings };
}
