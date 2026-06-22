import { describe, expect, it } from "vitest";

import { assignShifts } from "@/lib/schedule/assign";
import { createHolidayChecker } from "@/lib/schedule/holidays";
import type { ScheduleInput } from "@/lib/schedule/types";

describe("assignShifts holiday propagation", () => {
  it("marks holiday dates with isPublicHoliday=true", () => {
    const input: ScheduleInput = {
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      holidayCountry: "US",
      members: [
        { id: "m1", name: "Ana", unavailableDates: [] },
        { id: "m2", name: "Bruno", unavailableDates: [] },
      ],
    };

    const result = assignShifts(input, createHolidayChecker("US"));
    const jan1 = result.assignments.find(
      (assignment) => assignment.date === "2026-01-01",
    );
    const jan2 = result.assignments.find(
      (assignment) => assignment.date === "2026-01-02",
    );

    expect(jan1).toBeDefined();
    expect(jan1?.isPublicHoliday).toBe(true);
    expect(jan2).toBeDefined();
    expect(jan2?.isPublicHoliday).toBe(false);
  });
});
