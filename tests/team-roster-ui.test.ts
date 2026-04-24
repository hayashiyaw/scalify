import { describe, expect, it } from "vitest";

import { canSaveTeamRoster, teamRosterPermissionHint } from "@/lib/team/roster-ui";
import type { TeamSummary } from "@/lib/team/service";

function makeTeam(overrides: Partial<TeamSummary> = {}): TeamSummary {
  return {
    id: "team_1",
    name: "Ops Team",
    ownerId: "user_1",
    ownerRole: "OWNER",
    currentUserRole: "OWNER",
    canManageRoster: true,
    memberCount: 2,
    createdAt: new Date("2026-04-24T12:00:00.000Z"),
    updatedAt: new Date("2026-04-24T12:00:00.000Z"),
    ...overrides,
  };
}

describe("team roster UI permission helpers", () => {
  it("allows save controls for writable roles", () => {
    expect(canSaveTeamRoster(makeTeam())).toBe(true);
  });

  it("returns read-only behavior for member role", () => {
    const team = makeTeam({ currentUserRole: "MEMBER", canManageRoster: false });
    expect(canSaveTeamRoster(team)).toBe(false);
    expect(teamRosterPermissionHint(team)).toContain("cannot save roster changes");
  });

  it("returns no hint without selected team", () => {
    expect(teamRosterPermissionHint(null)).toBeNull();
  });
});
