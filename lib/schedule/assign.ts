import type {
  DayAssignment,
  PersonReport,
  ScheduleInput,
  ScheduleResult,
  ScheduleWarning,
  ShiftPool,
} from "./types";
import { memberOrderForCycle } from "./deterministic-shuffle";
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

/** `YYYY-MM` from ISO date string */
function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function getM(
  map: Map<string, number>,
  memberId: string,
  mk: string,
): number {
  return map.get(`${memberId}|${mk}`) ?? 0;
}

function bumpM(
  map: Map<string, number>,
  memberId: string,
  mk: string,
): void {
  const key = `${memberId}|${mk}`;
  map.set(key, (map.get(key) ?? 0) + 1);
}

/**
 * Fair assignment: balance globally in the active pool first, then within the
 * same pool for the current calendar month, then the other pool (global, then
 * monthly), then team order. This keeps overall division even while improving
 * per-month splits when the range spans multiple months.
 */
function pickAssignee(
  availableIds: string[],
  pool: ShiftPool,
  monthKeyStr: string,
  weekdayCount: Map<string, number>,
  weekendHolidayCount: Map<string, number>,
  weekdayInMonth: Map<string, number>,
  weekendHolidayInMonth: Map<string, number>,
  teamOrder: Map<string, number>,
): string {
  let best = availableIds[0]!;
  for (let i = 1; i < availableIds.length; i++) {
    const id = availableIds[i]!;
    const wd = weekdayCount.get(id)!;
    const wh = weekendHolidayCount.get(id)!;
    const wdM = getM(weekdayInMonth, id, monthKeyStr);
    const whM = getM(weekendHolidayInMonth, id, monthKeyStr);
    const bwd = weekdayCount.get(best)!;
    const bwh = weekendHolidayCount.get(best)!;
    const bwdM = getM(weekdayInMonth, best, monthKeyStr);
    const bwhM = getM(weekendHolidayInMonth, best, monthKeyStr);
    const ord = teamOrder.get(id)!;
    const bord = teamOrder.get(best)!;

    if (pool === "A") {
      if (wd < bwd) best = id;
      else if (wd > bwd) continue;
      else if (wdM < bwdM) best = id;
      else if (wdM > bwdM) continue;
      else if (wh < bwh) best = id;
      else if (wh > bwh) continue;
      else if (whM < bwhM) best = id;
      else if (whM > bwhM) continue;
      else if (ord < bord) best = id;
    } else {
      if (wh < bwh) best = id;
      else if (wh > bwh) continue;
      else if (whM < bwhM) best = id;
      else if (whM > bwhM) continue;
      else if (wd < bwd) best = id;
      else if (wd > bwd) continue;
      else if (wdM < bwdM) best = id;
      else if (wdM > bwdM) continue;
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

  const memberIds = input.members.map((m) => m.id);
  const scrambledIds = memberOrderForCycle(
    input.startDate,
    input.endDate,
    memberIds,
  );
  const teamOrder = new Map(
    scrambledIds.map((id, index) => [id, index]),
  );

  const weekdayCount = new Map<string, number>();
  const weekendHolidayCount = new Map<string, number>();
  const weekdayInMonth = new Map<string, number>();
  const weekendHolidayInMonth = new Map<string, number>();

  for (const m of input.members) {
    weekdayCount.set(m.id, 0);
    weekendHolidayCount.set(m.id, 0);
  }

  const assignments: DayAssignment[] = [];
  const warnings: ScheduleWarning[] = [];

  for (const day of days) {
    const dateStr = formatISODateOnly(day);
    const mk = monthKey(dateStr);
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
      mk,
      weekdayCount,
      weekendHolidayCount,
      weekdayInMonth,
      weekendHolidayInMonth,
      teamOrder,
    );

    if (pool === "A") {
      weekdayCount.set(chosenId, weekdayCount.get(chosenId)! + 1);
      bumpM(weekdayInMonth, chosenId, mk);
    } else {
      weekendHolidayCount.set(
        chosenId,
        weekendHolidayCount.get(chosenId)! + 1,
      );
      bumpM(weekendHolidayInMonth, chosenId, mk);
    }

    assignments.push({
      date: dateStr,
      pool,
      assigneeId: chosenId,
      hours,
    });
  }

  const byId = new Map(input.members.map((m) => [m.id, m]));
  const report: PersonReport[] = scrambledIds.map((id) => {
    const m = byId.get(id)!;
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

  return {
    assignments,
    report,
    warnings,
    memberDisplayOrder: scrambledIds,
  };
}
