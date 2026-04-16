import { z } from "zod";

export const holidayCountries = ["US", "PT", "BR"] as const;
export type HolidayCountry = (typeof holidayCountries)[number];

export const holidayCountrySchema = z.enum(holidayCountries);

export type ScheduleMember = {
  id: string;
  name: string;
  unavailableDates: string[];
};

export type ScheduleInput = {
  startDate: string;
  endDate: string;
  holidayCountry: HolidayCountry;
  members: ScheduleMember[];
};

export type ShiftPool = "A" | "B";

export type DayAssignment = {
  date: string;
  pool: ShiftPool;
  assigneeId: string | null;
  hours: number;
};

export type PersonReport = {
  memberId: string;
  name: string;
  weekdayDays: number;
  weekendHolidayDays: number;
  totalHours: number;
};

export type ScheduleWarning = {
  date: string;
  code: "no_available_member";
};

export type ScheduleResult = {
  assignments: DayAssignment[];
  report: PersonReport[];
  warnings: ScheduleWarning[];
  /** Row order for summary/export; deterministic scramble per cycle (not form order). */
  memberDisplayOrder: string[];
};

export const scheduleMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unavailableDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const scheduleInputSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    holidayCountry: holidayCountrySchema,
    members: z.array(scheduleMemberSchema).min(2),
  })
  .refine(
    (data) => data.endDate >= data.startDate,
    "endDate must be on or after startDate",
  );
