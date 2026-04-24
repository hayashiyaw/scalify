import { TeamRole } from "@prisma/client";

export type TeamPermission =
  | "team:roster:read"
  | "team:roster:write"
  | "team:members:write"
  | "team:update"
  | "team:delete"
  | "team:members:role:update";

const rolePermissionMatrix: Record<TeamRole, Record<TeamPermission, boolean>> = {
  [TeamRole.OWNER]: {
    "team:roster:read": true,
    "team:roster:write": true,
    "team:members:write": true,
    "team:update": true,
    "team:delete": true,
    "team:members:role:update": true,
  },
  [TeamRole.ADMIN]: {
    "team:roster:read": true,
    "team:roster:write": true,
    "team:members:write": true,
    "team:update": true,
    "team:delete": false,
    "team:members:role:update": false,
  },
  [TeamRole.MEMBER]: {
    "team:roster:read": true,
    "team:roster:write": false,
    "team:members:write": false,
    "team:update": false,
    "team:delete": false,
    "team:members:role:update": false,
  },
};

export function canTeamRole(role: TeamRole, permission: TeamPermission): boolean {
  return rolePermissionMatrix[role][permission];
}
