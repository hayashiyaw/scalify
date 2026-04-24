"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { calculateSchedule } from "@/app/actions/schedule";
import {
  listTeamsAction,
  loadTeamMembersAction,
  saveTeamMembersAction,
} from "@/app/actions/team";
import { AccountCard } from "@/components/auth/account-card";
import { DateRangeSection } from "@/components/schedule/date-range-section";
import { ExportCsvButton } from "@/components/schedule/export-csv-button";
import { HolidayCountrySection } from "@/components/schedule/holiday-country-section";
import { ReportDashboard } from "@/components/schedule/report-dashboard";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";
import { TeamSection, type TeamMemberForm } from "@/components/schedule/team-section";
import { ThemeSelector } from "@/components/theme-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, formatISODateOnly } from "@/lib/schedule/dates";
import {
  clearScheduleDraft,
  loadScheduleDraft,
  saveScheduleDraft,
} from "@/lib/schedule/draft-storage";
import type { HolidayCountry, ScheduleResult } from "@/lib/schedule/types";
import { scheduleInputSchema } from "@/lib/schedule/types";
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

function newMember(): TeamMemberForm {
  return { id: crypto.randomUUID(), name: "", unavailableDates: [] };
}

/** Stable ids for the first two rows so SSR and the client match (avoids hydration errors from random UUIDs in useState). */
const initialMembers = (): TeamMemberForm[] => [
  { id: "member-initial-0", name: "", unavailableDates: [] },
  { id: "member-initial-1", name: "", unavailableDates: [] },
];

export default function Home() {
  const { status: sessionStatus } = useSession();
  const { start: defaultStart, end: defaultEnd } = useMemo(() => defaultRange(), []);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [holidayCountry, setHolidayCountry] = useState<HolidayCountry>("US");
  const [members, setMembers] = useState<TeamMemberForm[]>(initialMembers);
  const [colorblindMode, setColorblindMode] = useState(false);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [teamActionPending, startTeamActionTransition] = useTransition();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      startDate,
      endDate,
      holidayCountry,
      members: members.map((m) => ({
        id: m.id,
        name: m.name.trim(),
        unavailableDates: m.unavailableDates,
      })),
    }),
    [startDate, endDate, holidayCountry, members],
  );

  const clientValid = scheduleInputSchema.safeParse(payload).success;
  const canCalculate = clientValid && members.length >= 2;

  const memberNames = useMemo(
    () => new Map(members.map((m) => [m.id, m.name.trim() || "Unnamed"])),
    [members],
  );

  const onCalculate = useCallback(() => {
    setActionError(null);
    startTransition(async () => {
      const res = await calculateSchedule(payload);
      if (!res.ok) {
        setResult(null);
        setActionError(res.error);
        return;
      }
      setResult(res.data);
    });
  }, [payload]);

  useEffect(() => {
    const draft = loadScheduleDraft();
    if (!draft) {
      setHasHydratedDraft(true);
      return;
    }
    setStartDate(draft.startDate);
    setEndDate(draft.endDate);
    setHolidayCountry(draft.holidayCountry);
    setMembers(draft.members);
    setColorblindMode(draft.colorblindMode);
    setHasHydratedDraft(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedDraft) return;
    saveScheduleDraft({
      startDate,
      endDate,
      holidayCountry,
      members,
      colorblindMode,
    });
  }, [colorblindMode, endDate, hasHydratedDraft, holidayCountry, members, startDate]);

  const resetDraft = useCallback(() => {
    const defaults = defaultRange();
    clearScheduleDraft();
    setStartDate(defaults.start);
    setEndDate(defaults.end);
    setHolidayCountry("US");
    setMembers(initialMembers());
    setColorblindMode(false);
    setResult(null);
    setActionError(null);
  }, []);

  const addMember = useCallback(() => {
    setMembers((prev) => [...prev, newMember()]);
  }, []);

  const removeMember = useCallback((id: string) => {
    setMembers((prev) => (prev.length <= 2 ? prev : prev.filter((m) => m.id !== id)));
  }, []);

  const updateName = useCallback((id: string, name: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m)),
    );
  }, []);

  const updateUnavailable = useCallback((id: string, dates: string[]) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, unavailableDates: dates } : m)),
    );
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setTeams([]);
      setSelectedTeamId(null);
      setTeamError(null);
      setTeamNotice(null);
      return;
    }

    startTeamActionTransition(async () => {
      const response = await listTeamsAction();
      if (!response.ok) {
        setTeams([]);
        setSelectedTeamId(null);
        setTeamError(response.error);
        setTeamNotice(null);
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

  const saveTeamDraft = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a team before saving.");
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTeamActionTransition(async () => {
      const response = await saveTeamMembersAction({
        teamId: selectedTeamId,
        members: payload.members,
      });

      if (!response.ok) {
        setTeamError(response.error);
        return;
      }

      setTeamNotice("Team availability saved.");
    });
  }, [payload.members, selectedTeamId]);

  const loadTeamDraft = useCallback(() => {
    if (!selectedTeamId) {
      setTeamError("Select a team before loading.");
      return;
    }

    setTeamError(null);
    setTeamNotice(null);
    startTeamActionTransition(async () => {
      const response = await loadTeamMembersAction(selectedTeamId);
      if (!response.ok) {
        setTeamError(response.error);
        return;
      }

      setMembers(response.data.members);
      setResult(null);
      setActionError(null);
      setTeamNotice(
        response.data.members.length > 0
          ? "Loaded saved team availability into the form."
          : "No saved team availability found yet.",
      );
    });
  }, [selectedTeamId]);

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-6">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Scalify
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Balance weekday and weekend or holiday shifts across your team.
            </p>
          </div>
          <ThemeSelector />
        </header>

        <AccountCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved team availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionStatus !== "authenticated" ? (
              <p className="text-muted-foreground text-sm">
                Log in to save and load team members with unavailable dates.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={selectedTeamId ?? ""}
                    onValueChange={(value) => setSelectedTeamId(value)}
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
                      onClick={loadTeamDraft}
                      disabled={teamActionPending || !selectedTeamId}
                    >
                      {teamActionPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      Load team
                    </Button>
                    <Button
                      type="button"
                      onClick={saveTeamDraft}
                      disabled={teamActionPending || !selectedTeamId}
                    >
                      {teamActionPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      Save team
                    </Button>
                  </div>
                </div>
                {teams.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    You are not in any teams yet.
                  </p>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <DateRangeSection
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <HolidayCountrySection
            value={holidayCountry}
            onChange={setHolidayCountry}
          />
        </div>

        <TeamSection
          members={members}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onNameChange={updateName}
          onUnavailableChange={updateUnavailable}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground text-sm">
            {!canCalculate ? (
              <span>
                Enter a valid date range, at least two names, and ensure end date
                is on or after start date.
              </span>
            ) : (
              <span>Ready to calculate.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
              onClick={() => setColorblindMode((v) => !v)}
            >
              <span>Colorblind-friendly colors</span>
              <span
                className={
                  colorblindMode
                    ? "inline-flex h-4 w-7 items-center rounded-full bg-primary/80 px-0.5 text-[0.6rem] text-primary-foreground"
                    : "inline-flex h-4 w-7 items-center justify-end rounded-full bg-muted px-0.5 text-[0.6rem]"
                }
              >
                <span className="inline-block h-3 w-3 rounded-full bg-background shadow" />
              </span>
            </button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={resetDraft}>
                Reset draft
              </Button>
              <ExportCsvButton
                holidayCountry={holidayCountry}
                rangeStart={startDate}
                rangeEnd={endDate}
                members={members}
                result={result}
              />
              <Button
                type="button"
                disabled={!canCalculate || pending}
                onClick={onCalculate}
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Calculate shifts
              </Button>
            </div>
          </div>
        </div>

        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not calculate</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {result && result.warnings.length > 0 ? (
          <Alert>
            <AlertTitle>Some days could not be covered</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc text-sm">
                {result.warnings.map((w) => (
                  <li key={w.date}>
                    {w.date}: everyone blocked — assign manually or adjust
                    availability.
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <div className="grid gap-6 lg:grid-cols-1">
            <ReportDashboard
              report={result.report}
              assignments={result.assignments}
              members={members.map((m) => ({
                id: m.id,
                name: m.name.trim() || "Unnamed",
              }))}
              memberDisplayOrder={result.memberDisplayOrder}
              rangeStart={startDate}
              rangeEnd={endDate}
            />
            <ScheduleCalendar
              rangeStart={startDate}
              rangeEnd={endDate}
              assignments={result.assignments}
              memberNames={memberNames}
              memberDisplayOrder={result.memberDisplayOrder}
              colorMode={colorblindMode ? "colorblind" : "normal"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
