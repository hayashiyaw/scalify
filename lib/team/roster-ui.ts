import type { TeamSummary } from "@/lib/team/service";

export function canSaveTeamRoster(team: TeamSummary | null): boolean {
  return Boolean(team?.canManageRoster);
}

export function teamRosterPermissionHint(team: TeamSummary | null): string | null {
  if (!team) {
    return null;
  }

  return team.canManageRoster
    ? `Your role: ${team.currentUserRole}. You can load and save team roster drafts.`
    : `Your role: ${team.currentUserRole}. You can load team drafts but cannot save roster changes.`;
}
