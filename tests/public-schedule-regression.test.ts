import { describe, expect, it } from "vitest";

import { calculateSchedule } from "@/app/actions/schedule";
import { buildScheduleCsv } from "@/lib/schedule/csv";

const anonymousPayload = {
  startDate: "2026-04-20",
  endDate: "2026-04-24",
  holidayCountry: "US" as const,
  members: [
    { id: "m1", name: "Ana", unavailableDates: [] },
    { id: "m2", name: "Bruno", unavailableDates: [] },
  ],
};

describe("SCA0003 public schedule regression guardrails", () => {
  it("keeps anonymous calculate/report/calendar/export flow working end-to-end", async () => {
    const result = await calculateSchedule(anonymousPayload);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Regression intent: authenticated features must not affect anonymous scheduling.
    expect(result.data.assignments).toHaveLength(5);
    expect(result.data.report).toHaveLength(2);
    expect(result.data.memberDisplayOrder).toHaveLength(2);
    expect(result.data.warnings).toEqual([]);

    const csv = buildScheduleCsv(
      anonymousPayload.startDate,
      anonymousPayload.endDate,
      result.data,
      new Map(
        anonymousPayload.members.map((member) => [member.id, member.name]),
      ),
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("# --- Summary ---");
    expect(csv).toContain("# --- Calendar ---");
    expect(csv).toContain("Ana");
    expect(csv).toContain("Bruno");
  });

  it("keeps schedule action validation contract stable for invalid payloads", async () => {
    const result = await calculateSchedule({
      startDate: "2026-04-24",
      endDate: "2026-04-20",
      holidayCountry: "US",
      members: [{ id: "m1", name: "Only One", unavailableDates: [] }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    // Regression intent: caller continues receiving flattened field errors.
    expect(result.fieldErrors).toBeDefined();
    expect(result.error).toBeTruthy();
  });
});
