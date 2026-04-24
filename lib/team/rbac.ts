import { TeamRole } from "@prisma/client";

export type TeamPermission = "team:roster:read" | "team:roster:write";

const rolePermissionMatrix: Record<TeamRole, Record<TeamPermission, boolean>> = {
  [TeamRole.OWNER]: {
    "team:roster:read": true,
    "team:roster:write": true,
  },
  [TeamRole.ADMIN]: {
    "team:roster:read": true,
    "team:roster:write": true,
  },
  [TeamRole.MEMBER]: {
    "team:roster:read": true,
    "team:roster:write": false,
  },
};

export function canTeamRole(role: TeamRole, permission: TeamPermission): boolean {
  return rolePermissionMatrix[role][permission];
}
