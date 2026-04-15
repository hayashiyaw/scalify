"use server";

import { assignShifts } from "@/lib/schedule/assign";
import { createHolidayChecker } from "@/lib/schedule/holidays";
import type { ScheduleResult } from "@/lib/schedule/types";
import { scheduleInputSchema } from "@/lib/schedule/types";

export type CalculateScheduleSuccess = { ok: true; data: ScheduleResult };
export type CalculateScheduleError = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};

export type CalculateScheduleResponse =
  | CalculateScheduleSuccess
  | CalculateScheduleError;

export async function calculateSchedule(
  raw: unknown,
): Promise<CalculateScheduleResponse> {
  const parsed = scheduleInputSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors = flat.fieldErrors as Record<string, string[]>;
    const first =
      flat.formErrors[0] ??
      Object.values(fieldErrors).flat()[0] ??
      "Invalid input";
    return { ok: false, error: first, fieldErrors };
  }

  const input = parsed.data;
  if (input.members.length < 2) {
    return { ok: false, error: "Add at least two team members." };
  }

  const isHoliday = createHolidayChecker(input.holidayCountry);
  const data = assignShifts(input, isHoliday);
  return { ok: true, data };
}
