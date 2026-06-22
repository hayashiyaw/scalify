import { describe, expect, it } from "vitest";

import { buildMemberColorMap } from "@/lib/schedule/colors";

function buildMemberIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `member-${index + 1}`);
}

function toColorKey(color: { background: string; foreground: string }): string {
  return `${color.background}|${color.foreground}`;
}

describe("buildMemberColorMap", () => {
  it("returns 16 distinct colors in normal mode when team size is within palette size", () => {
    const memberIds = buildMemberIds(16);
    const colorMap = buildMemberColorMap(memberIds, "normal");

    const distinctColorKeys = new Set(
      memberIds.map((memberId) => toColorKey(colorMap.get(memberId)!)),
    );

    expect(distinctColorKeys.size).toBe(16);
  });

  it("returns 12 distinct colors in colorblind mode when team size is within palette size", () => {
    const memberIds = buildMemberIds(12);
    const colorMap = buildMemberColorMap(memberIds, "colorblind");

    const distinctColorKeys = new Set(
      memberIds.map((memberId) => toColorKey(colorMap.get(memberId)!)),
    );

    expect(distinctColorKeys.size).toBe(12);
  });

  it("wraps around the normal palette when team size exceeds 16 members", () => {
    const memberIds = buildMemberIds(19);
    const colorMap = buildMemberColorMap(memberIds, "normal");

    expect(toColorKey(colorMap.get("member-1")!)).toBe(
      toColorKey(colorMap.get("member-17")!),
    );
    expect(toColorKey(colorMap.get("member-2")!)).toBe(
      toColorKey(colorMap.get("member-18")!),
    );
    expect(toColorKey(colorMap.get("member-3")!)).toBe(
      toColorKey(colorMap.get("member-19")!),
    );
  });

  it("returns the same color assignment for the same member order", () => {
    const memberIds = ["m-1", "m-2", "m-3", "m-4", "m-5"];

    const firstMap = buildMemberColorMap(memberIds, "normal");
    const secondMap = buildMemberColorMap(memberIds, "normal");

    expect(memberIds.map((memberId) => firstMap.get(memberId))).toEqual(
      memberIds.map((memberId) => secondMap.get(memberId)),
    );
  });

  it("assigns colors by position instead of member id values", () => {
    const firstOrder = ["alpha", "bravo", "charlie", "delta"];
    const secondOrder = ["u-101", "u-202", "u-303", "u-404"];

    const firstMap = buildMemberColorMap(firstOrder, "normal");
    const secondMap = buildMemberColorMap(secondOrder, "normal");

    expect(firstOrder.map((memberId) => firstMap.get(memberId))).toEqual(
      secondOrder.map((memberId) => secondMap.get(memberId)),
    );
  });
});
