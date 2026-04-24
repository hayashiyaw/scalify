import { TeamRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canTeamRole, type TeamPermission } from "@/lib/team/rbac";

describe("team role permission matrix", () => {
  const matrix: Array<{
    role: TeamRole;
    permission: TeamPermission;
    allowed: boolean;
  }> = [
    { role: TeamRole.OWNER, permission: "team:roster:read", allowed: true },
    { role: TeamRole.OWNER, permission: "team:roster:write", allowed: true },
    { role: TeamRole.ADMIN, permission: "team:roster:read", allowed: true },
    { role: TeamRole.ADMIN, permission: "team:roster:write", allowed: true },
    { role: TeamRole.MEMBER, permission: "team:roster:read", allowed: true },
    { role: TeamRole.MEMBER, permission: "team:roster:write", allowed: false },
  ];

  for (const entry of matrix) {
    it(`${entry.role} ${entry.allowed ? "can" : "cannot"} ${entry.permission}`, () => {
      expect(canTeamRole(entry.role, entry.permission)).toBe(entry.allowed);
    });
  }
});
