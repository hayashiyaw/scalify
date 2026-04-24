"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import {
  addTeamMemberByEmailAction,
  listTeamsAction,
  loadTeamMembersAction,
  saveTeamMembersAction,
} from "@/app/actions/team";
import { AccountCard } from "@/components/auth/account-card";
import { ThemeSelector } from "@/components/theme-selector";
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
import type { TeamSummary } from "@/lib/team/service";

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

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setTeams([]);
      setSelectedTeamId(null);
      setTeamError(null);
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

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  const canSaveFromDraft = canSaveTeamRoster(selectedTeam);
  const rosterPermissionHint = teamRosterPermissionHint(selectedTeam);

  const saveCurrentDraft = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a team before saving.");
      return;
    }
    if (!canSaveFromDraft) {
      setTeamError("Your role can view roster data but cannot save changes for this team.");
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
            ? "Your role can view roster data but cannot save changes for this team."
            : response.error,
        );
        return;
      }

      setTeamNotice("Saved current scheduler members and availability to this team.");
    });
  }, [canSaveFromDraft, selectedTeamId]);

  const loadToSchedulerDraft = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a team before loading.");
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

      setTeamNotice("This team has no saved availability yet.");
    });
  }, [selectedTeamId]);

  const addMemberByEmail = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a team before adding a member.");
      return;
    }
    if (!canSaveFromDraft) {
      setTeamError("Your role does not allow adding members to this team.");
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
          setTeamError("That account is already a member of this team.");
          return;
        }
        setTeamError(response.error);
        return;
      }

      setMemberEmail("");
      setTeamNotice(`Added ${response.data.email} as a member.`);
      const refreshed = await listTeamsAction();
      if (refreshed.ok) {
        setTeams(refreshed.data);
      }
    });
  }, [canSaveFromDraft, memberEmail, selectedTeamId]);

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-6">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Teams</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage shared team members and blocked dates outside the schedule page.
            </p>
          </div>
          <ThemeSelector />
        </header>

        <AccountCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team list and management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionStatus !== "authenticated" ? (
              <Alert>
                <AlertTitle>Login required</AlertTitle>
                <AlertDescription>
                  Team management is only available for authenticated users.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={selectedTeamId ?? ""}
                    onValueChange={(value) => setSelectedTeamId(value)}
                    disabled={teams.length === 0}
                  >
                    <SelectTrigger className="w-full sm:w-80">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
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
                  <p className="text-muted-foreground text-sm">You are not in any teams yet.</p>
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
              </>
            )}
            {teamError ? (
              <Alert variant="destructive">
                <AlertTitle>Team sync failed</AlertTitle>
                <AlertDescription>{teamError}</AlertDescription>
              </Alert>
            ) : null}
            {teamNotice ? (
              <Alert>
                <AlertTitle>Team sync</AlertTitle>
                <AlertDescription>{teamNotice}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <div>
          <Link href="/" className="text-primary text-sm underline-offset-4 hover:underline">
            Back to scheduler
          </Link>
        </div>
      </div>
    </div>
  );
}
