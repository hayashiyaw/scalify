"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { TeamRole } from "@prisma/client";

import {
  addTeamMemberByEmailAction,
  createTeamAction,
  deleteTeamAction,
  listTeamsAction,
  listTeamMembersAction,
  loadTeamMembersAction,
  removeTeamMemberAction,
  saveTeamMembersAction,
  updateTeamAction,
  updateTeamMemberRoleAction,
} from "@/app/actions/team";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, formatISODateOnly } from "@/lib/schedule/dates";
import { loadScheduleDraft, saveScheduleDraft } from "@/lib/schedule/draft-storage";
import { canSaveTeamRoster, teamRosterPermissionHint } from "@/lib/team/roster-ui";
import type { TeamMemberSummary, TeamSummary } from "@/lib/team/service";

const MEMBER_ROLE_SELECT_ITEMS: { value: TeamRole; label: string }[] = [
  { value: TeamRole.ADMIN, label: "Admin" },
  { value: TeamRole.MEMBER, label: "Member" },
];

function defaultRange(): { start: string; end: string } {
  const t = new Date();
  const start = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0);
  const end = addDays(start, 30);
  return {
    start: formatISODateOnly(start),
    end: formatISODateOnly(end),
  };
}

function defaultMembers() {
  return [
    { id: "member-initial-0", name: "", unavailableDates: [] as string[] },
    { id: "member-initial-1", name: "", unavailableDates: [] as string[] },
  ];
}

function ensureMinimumMembers(
  members: Array<{ id: string; name: string; unavailableDates: string[] }>,
) {
  if (members.length >= 2) {
    return members;
  }
  const fallback = defaultMembers();
  if (members.length === 1) {
    return [members[0], fallback[1]];
  }
  return fallback;
}

function getCurrentDraft() {
  const draft = loadScheduleDraft();
  if (draft) {
    return draft;
  }

  const defaults = defaultRange();
  return {
    startDate: defaults.start,
    endDate: defaults.end,
    holidayCountry: "US" as const,
    members: defaultMembers(),
    colorblindMode: false,
  };
}

export default function TeamsPage() {
  const { status: sessionStatus } = useSession();
  const [pending, startTransition] = useTransition();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [renameTeamName, setRenameTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }

    startTransition(async () => {
      const response = await listTeamsAction();
      if (!response.ok) {
        setTeamError(response.error);
        setTeams([]);
        setSelectedTeamId(null);
        return;
      }

      setTeams(response.data);
      setSelectedTeamId((current) =>
        current && response.data.some((team) => team.id === current)
          ? current
          : (response.data[0]?.id ?? null),
      );
      setTeamError(null);
    });
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !selectedTeamId) {
      return;
    }

    startTransition(async () => {
      const response = await listTeamMembersAction(selectedTeamId);
      if (!response.ok) {
        setTeamMembers([]);
        setTeamError(response.error);
        return;
      }
      setTeamMembers(response.data);
    });
  }, [selectedTeamId, sessionStatus]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  const teamSelectItems = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams],
  );

  const canSaveFromDraft = canSaveTeamRoster(selectedTeam);
  const rosterPermissionHint = teamRosterPermissionHint(selectedTeam);
  const canManageTeamDetails = selectedTeam
    ? selectedTeam.currentUserRole === "OWNER" || selectedTeam.currentUserRole === "ADMIN"
    : false;
  const canDeleteTeam = selectedTeam?.currentUserRole === "OWNER";
  const canManageMembers = canSaveFromDraft;
  const canUpdateMemberRoles = selectedTeam?.currentUserRole === "OWNER";

  const refreshTeamsAndSelection = useCallback(async () => {
    const refreshed = await listTeamsAction();
    if (!refreshed.ok) {
      setTeamError(refreshed.error);
      return false;
    }

    setTeams(refreshed.data);
    setSelectedTeamId((current) =>
      current && refreshed.data.some((team) => team.id === current)
        ? current
        : (refreshed.data[0]?.id ?? null),
    );
    return true;
  }, []);

  const saveCurrentDraft = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a squad before saving.");
      return;
    }
    if (!canSaveFromDraft) {
      setTeamError("Your role can view roster data but cannot save changes for this squad.");
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTransition(async () => {
      const response = await saveTeamMembersAction({
        teamId: selectedTeamId,
        members: getCurrentDraft().members.map((member) => ({
          id: member.id,
          name: member.name.trim(),
          unavailableDates: member.unavailableDates,
        })),
      });

      if (!response.ok) {
        setTeamError(
          response.code === "forbidden"
            ? "Your role can view roster data but cannot save changes for this squad."
            : response.error,
        );
        return;
      }

      setTeamNotice("Saved current scheduler members and availability to this squad.");
    });
  }, [canSaveFromDraft, selectedTeamId]);

  const loadToSchedulerDraft = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a squad before loading.");
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTransition(async () => {
      const response = await loadTeamMembersAction(selectedTeamId);
      if (!response.ok) {
        setTeamError(response.error);
        return;
      }

      saveScheduleDraft({
        ...getCurrentDraft(),
        members: ensureMinimumMembers(response.data.members),
      });

      if (response.data.members.length > 0) {
        window.location.assign("/");
        return;
      }

      setTeamNotice("This squad has no saved availability yet.");
    });
  }, [selectedTeamId]);

  const addMemberByEmail = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a squad before adding a member.");
      return;
    }
    if (!canSaveFromDraft) {
      setTeamError("Your role does not allow adding members to this squad.");
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTransition(async () => {
      const response = await addTeamMemberByEmailAction({
        teamId: selectedTeamId,
        email: memberEmail.trim(),
      });

      if (!response.ok) {
        if (response.code === "target_user_not_found") {
          setTeamError("No account exists with that email. Ask the user to register first.");
          return;
        }
        if (response.code === "already_member") {
          setTeamError("That account is already a member of this squad.");
          return;
        }
        setTeamError(response.error);
        return;
      }

      setMemberEmail("");
      setTeamNotice(`Added ${response.data.email} as a member.`);
      await refreshTeamsAndSelection();
    });
  }, [canSaveFromDraft, memberEmail, refreshTeamsAndSelection, selectedTeamId]);

  const createTeam = useCallback(() => {
    const name = newTeamName.trim();
    if (name.length === 0) {
      setTeamError("Enter a squad name before creating.");
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTransition(async () => {
      const response = await createTeamAction({ name });
      if (!response.ok) {
        setTeamError(response.error);
        return;
      }
      setNewTeamName("");
      setTeamNotice(`Created squad ${response.data.name}.`);
      await refreshTeamsAndSelection();
      setSelectedTeamId(response.data.id);
    });
  }, [newTeamName, refreshTeamsAndSelection]);

  const renameSelectedTeam = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a squad before renaming.");
      return;
    }

    const name = renameTeamName.trim();
    if (name.length === 0) {
      setTeamError("Squad name is required.");
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTransition(async () => {
      const response = await updateTeamAction({ teamId: selectedTeamId, name });
      if (!response.ok) {
        setTeamError(response.error);
        return;
      }
      setTeamNotice(`Renamed squad to ${response.data.name}.`);
      await refreshTeamsAndSelection();
    });
  }, [refreshTeamsAndSelection, renameTeamName, selectedTeamId]);

  const deleteSelectedTeam = useCallback(() => {
    if (!selectedTeamId || !selectedTeam) {
      setTeamError("Select a squad before deleting.");
      return;
    }
    if (!window.confirm(`Delete squad "${selectedTeam.name}"? This cannot be undone.`)) {
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTransition(async () => {
      const response = await deleteTeamAction({ teamId: selectedTeamId });
      if (!response.ok) {
        setTeamError(response.error);
        return;
      }
      setTeamNotice("Deleted squad.");
      await refreshTeamsAndSelection();
    });
  }, [refreshTeamsAndSelection, selectedTeam, selectedTeamId]);

  const removeMember = useCallback(
    (userId: string) => {
      if (!selectedTeamId) return;
      startTransition(async () => {
        const response = await removeTeamMemberAction({ teamId: selectedTeamId, userId });
        if (!response.ok) {
          setTeamError(response.error);
          return;
        }
        await refreshTeamsAndSelection();
        const membersResponse = await listTeamMembersAction(selectedTeamId);
        if (membersResponse.ok) {
          setTeamMembers(membersResponse.data);
        }
      });
    },
    [refreshTeamsAndSelection, selectedTeamId],
  );

  const updateMemberRole = useCallback(
    (userId: string, role: TeamRole) => {
      if (!selectedTeamId) return;
      startTransition(async () => {
        const response = await updateTeamMemberRoleAction({
          teamId: selectedTeamId,
          userId,
          role,
        });
        if (!response.ok) {
          setTeamError(response.error);
          return;
        }
        const membersResponse = await listTeamMembersAction(selectedTeamId);
        if (membersResponse.ok) {
          setTeamMembers(membersResponse.data);
        }
        await refreshTeamsAndSelection();
      });
    },
    [refreshTeamsAndSelection, selectedTeamId],
  );

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-6">
        <header className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Squad</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage shared squad members and blocked dates outside the scheduler page.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Squad list and management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionStatus !== "authenticated" ? (
              <Alert>
                <AlertTitle>Login required</AlertTitle>
                <AlertDescription>
                  Squad management is only available for authenticated users.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={newTeamName}
                    onChange={(event) => setNewTeamName(event.target.value)}
                    placeholder="New squad name"
                    disabled={pending}
                    className="sm:w-80"
                  />
                  <Button
                    type="button"
                    onClick={createTeam}
                    disabled={pending || newTeamName.trim().length === 0}
                  >
                    {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Create squad
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={selectedTeamId ?? ""}
                    items={teamSelectItems}
                    onValueChange={(value) => {
                      setSelectedTeamId(value);
                      const team = teams.find((entry) => entry.id === value);
                      setRenameTeamName(team?.name ?? "");
                    }}
                    disabled={teams.length === 0}
                  >
                    <SelectTrigger className="w-full min-w-0 sm:w-80">
                      <SelectValue placeholder="Select a squad" />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false} className="max-h-72">
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} label={team.name}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={loadToSchedulerDraft}
                      disabled={pending || !selectedTeamId}
                    >
                      {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Load to draft
                    </Button>
                    <Button
                      type="button"
                      onClick={saveCurrentDraft}
                      disabled={pending || !selectedTeamId || !canSaveFromDraft}
                    >
                      {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Save from draft
                    </Button>
                  </div>
                </div>
                {rosterPermissionHint ? (
                  <p className="text-muted-foreground text-sm">{rosterPermissionHint}</p>
                ) : null}
                {teams.length === 0 ? (
                  <p className="text-muted-foreground text-sm">You are not in any squads yet.</p>
                ) : null}
                {teams.length > 0 ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      type="email"
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      placeholder="Add existing user by email"
                      disabled={pending || !selectedTeamId || !canSaveFromDraft}
                      className="sm:w-80"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addMemberByEmail}
                      disabled={
                        pending ||
                        !selectedTeamId ||
                        !canSaveFromDraft ||
                        memberEmail.trim().length === 0
                      }
                    >
                      {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Add member
                    </Button>
                  </div>
                ) : null}
                {selectedTeam ? (
                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-muted-foreground text-sm">
                      Squad details: role <strong>{selectedTeam.currentUserRole}</strong>, members{" "}
                      <strong>{selectedTeam.memberCount}</strong>.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={renameTeamName}
                        onChange={(event) => setRenameTeamName(event.target.value)}
                        disabled={pending || !canManageTeamDetails}
                        className="sm:w-80"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={renameSelectedTeam}
                        disabled={
                          pending ||
                          !canManageTeamDetails ||
                          renameTeamName.trim().length === 0
                        }
                      >
                        Rename squad
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={deleteSelectedTeam}
                        disabled={pending || !canDeleteTeam}
                      >
                        Delete squad
                      </Button>
                    </div>
                  </div>
                ) : null}
                {selectedTeam ? (
                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">Members</p>
                    {teamMembers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No members found.</p>
                    ) : (
                      <ul className="space-y-2">
                        {teamMembers.map((member) => (
                          <li
                            key={member.userId}
                            className="flex flex-col gap-2 rounded border p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1 truncate text-sm">{member.email}</div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                              {member.role === TeamRole.OWNER ? (
                                <span className="text-muted-foreground flex h-8 items-center px-2 text-sm">
                                  Owner
                                </span>
                              ) : (
                                <Select
                                  value={member.role}
                                  items={MEMBER_ROLE_SELECT_ITEMS}
                                  onValueChange={(value) =>
                                    updateMemberRole(member.userId, value as TeamRole)
                                  }
                                  disabled={pending || !canUpdateMemberRoles}
                                >
                                  <SelectTrigger className="min-w-0 w-full sm:w-36">
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent
                                    align="end"
                                    alignItemWithTrigger={false}
                                    className="max-h-72"
                                  >
                                    {MEMBER_ROLE_SELECT_ITEMS.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        label={option.label}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => removeMember(member.userId)}
                                disabled={
                                  pending ||
                                  !canManageMembers ||
                                  member.role === "OWNER"
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </>
            )}
            {teamError ? (
              <Alert variant="destructive">
                <AlertTitle>Squad sync failed</AlertTitle>
                <AlertDescription>{teamError}</AlertDescription>
              </Alert>
            ) : null}
            {teamNotice ? (
              <Alert>
                <AlertTitle>Squad sync</AlertTitle>
                <AlertDescription>{teamNotice}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
