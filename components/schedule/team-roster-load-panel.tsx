"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { listTeamsAction } from "@/app/actions/team";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamSummary } from "@/lib/team/service";

function sortTeamsByName(teams: TeamSummary[]): TeamSummary[] {
  return [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Home-page strip for loading a server roster into the calculator.
 * Signed-out: generic tease only (no team APIs). Signed-in: team list UI; roster replace is disabled until a follow-up issue.
 */
export function TeamRosterLoadPanel() {
  const { data: session, status } = useSession();
  const sessionUserId = session?.user?.id;
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [teamsReady, setTeamsReady] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      queueMicrotask(() => {
        setTeams([]);
        setTeamsError(null);
        setTeamsReady(false);
        setSelectedTeamId(null);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setTeamsReady(false);
    });

    void (async () => {
      const response = await listTeamsAction();
      if (cancelled) return;
      if (!response.ok) {
        setTeamsError(response.error);
        setTeams([]);
        setSelectedTeamId(null);
        setTeamsReady(true);
        return;
      }
      const sorted = sortTeamsByName(response.data);
      setTeams(sorted);
      setTeamsError(null);
      setTeamsReady(true);
      setSelectedTeamId((current) =>
        current && sorted.some((t) => t.id === current) ? current : sorted[0]?.id ?? null,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionUserId, status]);

  const teamSelectItems = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams],
  );

  const onTeamChange = useCallback((value: string) => {
    setSelectedTeamId(value);
  }, []);

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Load a saved roster</CardTitle>
          <CardDescription>
            Sign in to load a roster you previously saved with your account. Nothing is fetched
            from the server until you are signed in and choose to load it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/login" className={buttonVariants({ variant: "default" })}>
            Log in
          </Link>
          <Link href="/register" className={buttonVariants({ variant: "outline" })}>
            Create account
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!teamsReady) {
    return (
      <Card size="sm" aria-busy="true">
        <CardHeader>
          <CardTitle>Load a saved roster</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Loader2 className="size-4 shrink-0 animate-spin" />
            Loading your teams…
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (teamsError) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Load a saved roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Could not load teams</AlertTitle>
            <AlertDescription>{teamsError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Load a saved roster</CardTitle>
          <CardDescription>
            You are not in any teams yet. Create or join a team in the team workspace, then come
            back here to pick which roster to load into the calculator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/teams" className={buttonVariants({ variant: "secondary" })}>
            Open team workspace
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Load a saved roster</CardTitle>
        <CardDescription>
          Teams you belong to, sorted A–Z. Loading saved members from the server into this form is
          not available in this release yet—the action below stays disabled until then.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={selectedTeamId ?? ""} items={teamSelectItems} onValueChange={onTeamChange}>
          <SelectTrigger className="w-full min-w-0 sm:w-80" size="sm" aria-label="Team for roster load">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false} className="max-h-72">
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id} label={team.name}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" disabled title="Roster import is not enabled in this release yet.">
          Load team roster
        </Button>
      </CardContent>
    </Card>
  );
}
