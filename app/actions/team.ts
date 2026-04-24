"use server";

import { ZodError } from "zod";

import {
  TeamAccessDeniedError,
  UnauthorizedTeamAccessError,
  listTeamsForCurrentUser,
  loadTeamMembersForCurrentUser,
  saveTeamMembersForCurrentUser,
  type TeamSummary,
} from "@/lib/team/service";
import type { ScheduleMember } from "@/lib/schedule/types";

type TeamActionError = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};

type TeamActionSuccess<T> = {
  ok: true;
  data: T;
};

export async function listTeamsAction(): Promise<
  TeamActionSuccess<TeamSummary[]> | TeamActionError
> {
  try {
    const teams = await listTeamsForCurrentUser();
    return { ok: true, data: teams };
  } catch (error) {
    return toTeamActionError(error);
  }
}

export async function saveTeamMembersAction(raw: unknown): Promise<
  TeamActionSuccess<{ teamId: string; members: ScheduleMember[] }> | TeamActionError
> {
  try {
    const saved = await saveTeamMembersForCurrentUser(raw);
    return { ok: true, data: saved };
  } catch (error) {
    return toTeamActionError(error);
  }
}

export async function loadTeamMembersAction(teamId: string): Promise<
  TeamActionSuccess<{ teamId: string; members: ScheduleMember[] }> | TeamActionError
> {
  try {
    const loaded = await loadTeamMembersForCurrentUser(teamId);
    return { ok: true, data: loaded };
  } catch (error) {
    return toTeamActionError(error);
  }
}

function toTeamActionError(error: unknown): TeamActionError {
  if (
    error instanceof UnauthorizedTeamAccessError ||
    error instanceof TeamAccessDeniedError
  ) {
    return { ok: false, error: error.message };
  }

  if (error instanceof ZodError) {
    const flat = error.flatten();
    const fieldErrors = flat.fieldErrors as Record<string, string[]>;
    const first =
      flat.formErrors[0] ?? Object.values(fieldErrors).flat()[0] ?? "Invalid input.";
    return { ok: false, error: first, fieldErrors };
  }

  return { ok: false, error: "Could not complete team operation." };
}
