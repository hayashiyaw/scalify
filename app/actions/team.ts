"use server";

import { ZodError } from "zod";

import {
  TeamMemberNotFoundError,
  TeamOwnerRoleInvariantError,
  TeamMemberAlreadyExistsError,
  TeamMemberTargetNotFoundError,
  TeamAccessDeniedError,
  TeamPermissionDeniedError,
  UnauthorizedTeamAccessError,
  addTeamMemberByEmailForCurrentUser,
  createTeamForCurrentUser,
  deleteTeamForCurrentUser,
  listTeamsForCurrentUser,
  listTeamMembersForCurrentUser,
  loadTeamMembersForCurrentUser,
  removeTeamMemberForCurrentUser,
  saveTeamMembersForCurrentUser,
  updateTeamForCurrentUser,
  updateTeamMemberRoleForCurrentUser,
  type TeamMemberSummary,
  type TeamSummary,
} from "@/lib/team/service";
import type { ScheduleMember } from "@/lib/schedule/types";

type TeamActionError = {
  ok: false;
  error: string;
  code?:
    | "unauthorized"
    | "not_member"
    | "forbidden"
    | "target_user_not_found"
    | "already_member"
    | "member_not_found"
    | "owner_invariant";
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

export async function createTeamAction(raw: unknown): Promise<
  TeamActionSuccess<TeamSummary> | TeamActionError
> {
  try {
    const team = await createTeamForCurrentUser(raw);
    return { ok: true, data: team };
  } catch (error) {
    return toTeamActionError(error);
  }
}

export async function updateTeamAction(raw: unknown): Promise<
  TeamActionSuccess<TeamSummary> | TeamActionError
> {
  try {
    const team = await updateTeamForCurrentUser(raw);
    return { ok: true, data: team };
  } catch (error) {
    return toTeamActionError(error);
  }
}

export async function deleteTeamAction(raw: unknown): Promise<
  TeamActionSuccess<{ teamId: string }> | TeamActionError
> {
  try {
    const deleted = await deleteTeamForCurrentUser(raw);
    return { ok: true, data: deleted };
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

export async function addTeamMemberByEmailAction(raw: unknown): Promise<
  TeamActionSuccess<{ teamId: string; userId: string; email: string; role: string }> | TeamActionError
> {
  try {
    const created = await addTeamMemberByEmailForCurrentUser(raw);
    return { ok: true, data: created };
  } catch (error) {
    return toTeamActionError(error);
  }
}

export async function listTeamMembersAction(teamId: string): Promise<
  TeamActionSuccess<TeamMemberSummary[]> | TeamActionError
> {
  try {
    const members = await listTeamMembersForCurrentUser(teamId);
    return { ok: true, data: members };
  } catch (error) {
    return toTeamActionError(error);
  }
}

export async function removeTeamMemberAction(raw: unknown): Promise<
  TeamActionSuccess<{ teamId: string; userId: string }> | TeamActionError
> {
  try {
    const deleted = await removeTeamMemberForCurrentUser(raw);
    return { ok: true, data: deleted };
  } catch (error) {
    return toTeamActionError(error);
  }
}

export async function updateTeamMemberRoleAction(raw: unknown): Promise<
  TeamActionSuccess<{ teamId: string; userId: string; role: string }> | TeamActionError
> {
  try {
    const updated = await updateTeamMemberRoleForCurrentUser(raw);
    return { ok: true, data: updated };
  } catch (error) {
    return toTeamActionError(error);
  }
}

function toTeamActionError(error: unknown): TeamActionError {
  if (
    error instanceof UnauthorizedTeamAccessError
  ) {
    return { ok: false, error: error.message, code: "unauthorized" };
  }

  if (error instanceof TeamAccessDeniedError) {
    return { ok: false, error: error.message, code: "not_member" };
  }

  if (error instanceof TeamPermissionDeniedError) {
    return { ok: false, error: error.message, code: "forbidden" };
  }

  if (error instanceof TeamMemberTargetNotFoundError) {
    return { ok: false, error: error.message, code: "target_user_not_found" };
  }

  if (error instanceof TeamMemberAlreadyExistsError) {
    return { ok: false, error: error.message, code: "already_member" };
  }

  if (error instanceof TeamMemberNotFoundError) {
    return { ok: false, error: error.message, code: "member_not_found" };
  }

  if (error instanceof TeamOwnerRoleInvariantError) {
    return { ok: false, error: error.message, code: "owner_invariant" };
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
