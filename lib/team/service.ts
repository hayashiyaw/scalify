import { TeamRole } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { scheduleMemberSchema, type ScheduleMember } from "@/lib/schedule/types";
import { canTeamRole, type TeamPermission } from "@/lib/team/rbac";

const createTeamInputSchema = z.object({
  name: z.string().trim().min(1, "Team name is required."),
});

type TeamWithMemberships = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  memberships: Array<{
    userId: string;
    role: TeamRole;
  }>;
};

export type TeamSummary = {
  id: string;
  name: string;
  ownerId: string;
  ownerRole: TeamRole;
  currentUserRole: TeamRole;
  canManageRoster: boolean;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export class UnauthorizedTeamAccessError extends Error {
  constructor() {
    super("Authentication is required for team operations.");
    this.name = "UnauthorizedTeamAccessError";
  }
}

export class TeamAccessDeniedError extends Error {
  constructor() {
    super("You do not have access to this team.");
    this.name = "TeamAccessDeniedError";
  }
}

export class TeamPermissionDeniedError extends Error {
  constructor() {
    super("You do not have permission for this team action.");
    this.name = "TeamPermissionDeniedError";
  }
}

export class TeamMemberTargetNotFoundError extends Error {
  constructor() {
    super("No account exists with that email.");
    this.name = "TeamMemberTargetNotFoundError";
  }
}

export class TeamMemberAlreadyExistsError extends Error {
  constructor() {
    super("This user is already a member of the selected team.");
    this.name = "TeamMemberAlreadyExistsError";
  }
}

export class TeamMemberNotFoundError extends Error {
  constructor() {
    super("This user is not a member of the selected team.");
    this.name = "TeamMemberNotFoundError";
  }
}

export class TeamOwnerRoleInvariantError extends Error {
  constructor() {
    super("Owner membership cannot be modified by this action.");
    this.name = "TeamOwnerRoleInvariantError";
  }
}

const saveTeamMembersInputSchema = z.object({
  teamId: z.string().min(1, "Team is required."),
  members: z.array(scheduleMemberSchema).min(2, "Add at least two team members."),
});

const addTeamMemberByEmailInputSchema = z.object({
  teamId: z.string().min(1, "Team is required."),
  email: z.string().trim().email("Provide a valid account email."),
});

const updateTeamInputSchema = z.object({
  teamId: z.string().min(1, "Team is required."),
  name: z.string().trim().min(1, "Team name is required."),
});

const deleteTeamInputSchema = z.object({
  teamId: z.string().min(1, "Team is required."),
});

const removeTeamMemberInputSchema = z.object({
  teamId: z.string().min(1, "Team is required."),
  userId: z.string().min(1, "Member user id is required."),
});

const updateTeamMemberRoleInputSchema = z.object({
  teamId: z.string().min(1, "Team is required."),
  userId: z.string().min(1, "Member user id is required."),
  role: z.nativeEnum(TeamRole),
});

export type TeamMemberSummary = {
  userId: string;
  email: string;
  role: TeamRole;
};

export async function createTeamForCurrentUser(
  raw: unknown,
): Promise<TeamSummary> {
  const userId = await requireUserId();
  const parsed = createTeamInputSchema.parse(raw);

  const team = await prisma.$transaction(async (tx) => {
    const createdTeam = await tx.team.create({
      data: {
        name: parsed.name,
        ownerId: userId,
      },
    });

    await tx.teamMembership.create({
      data: {
        teamId: createdTeam.id,
        userId,
        role: TeamRole.OWNER,
      },
    });

    return tx.team.findUniqueOrThrow({
      where: { id: createdTeam.id },
      include: {
        memberships: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });
  });

  return toTeamSummary(team, userId);
}

export async function listTeamsForCurrentUser(): Promise<TeamSummary[]> {
  const userId = await requireUserId();

  const teams = await prisma.team.findMany({
    where: {
      memberships: {
        some: { userId },
      },
    },
    include: {
      memberships: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return teams.map((team) => toTeamSummary(team, userId));
}

export async function saveTeamMembersForCurrentUser(
  raw: unknown,
): Promise<{ teamId: string; members: ScheduleMember[] }> {
  const userId = await requireUserId();
  const parsed = saveTeamMembersInputSchema.parse(raw);

  await assertTeamPermission(parsed.teamId, userId, "team:roster:write");

  const members = parsed.members.map((member) => ({
    id: member.id,
    name: member.name.trim(),
    unavailableDates: [...member.unavailableDates].sort(),
  }));

  const duplicateNames = new Set<string>();
  const seenNames = new Set<string>();
  for (const member of members) {
    const normalized = member.name.toLowerCase();
    if (seenNames.has(normalized)) {
      duplicateNames.add(member.name);
    }
    seenNames.add(normalized);
  }

  if (duplicateNames.size > 0) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["members"],
        message: "Member names must be unique for the selected team.",
      },
    ]);
  }

  await prisma.teamRoster.upsert({
    where: { teamId: parsed.teamId },
    create: {
      teamId: parsed.teamId,
      members,
    },
    update: {
      members,
    },
  });

  return {
    teamId: parsed.teamId,
    members,
  };
}

function scheduleMemberNameFromUser(user: {
  name: string | null;
  email: string;
}): string {
  const trimmedName = user.name?.trim();
  if (trimmedName) return trimmedName;
  const email = user.email.trim();
  const at = email.indexOf("@");
  const local = at > 0 ? email.slice(0, at) : email;
  return local.length > 0 ? local : "Member";
}

export async function loadTeamMembersForCurrentUser(
  teamId: string,
): Promise<{ teamId: string; members: ScheduleMember[] }> {
  const userId = await requireUserId();
  const parsedTeamId = z.string().min(1, "Team is required.").parse(teamId);

  await assertTeamPermission(parsedTeamId, userId, "team:roster:read");

  const roster = await prisma.teamRoster.findUnique({
    where: { teamId: parsedTeamId },
    select: { members: true },
  });

  let members = z.array(scheduleMemberSchema).parse(roster?.members ?? []);

  if (members.length === 0) {
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: parsedTeamId },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    members = memberships.map((m) => ({
      id: m.userId,
      name: scheduleMemberNameFromUser(m.user),
      unavailableDates: [],
    }));
  }

  return {
    teamId: parsedTeamId,
    members,
  };
}

export async function addTeamMemberByEmailForCurrentUser(
  raw: unknown,
): Promise<{ teamId: string; userId: string; email: string; role: TeamRole }> {
  const userId = await requireUserId();
  const parsed = addTeamMemberByEmailInputSchema.parse(raw);

  await assertTeamPermission(parsed.teamId, userId, "team:members:write");

  const email = parsed.email.toLowerCase();
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!targetUser) {
    throw new TeamMemberTargetNotFoundError();
  }

  const existingMembership = await prisma.teamMembership.findUnique({
    where: {
      teamId_userId: {
        teamId: parsed.teamId,
        userId: targetUser.id,
      },
    },
    select: { id: true },
  });

  if (existingMembership) {
    throw new TeamMemberAlreadyExistsError();
  }

  const membership = await prisma.teamMembership.create({
    data: {
      teamId: parsed.teamId,
      userId: targetUser.id,
      role: TeamRole.MEMBER,
    },
    select: {
      teamId: true,
      userId: true,
      role: true,
    },
  });

  return {
    teamId: membership.teamId,
    userId: membership.userId,
    email: targetUser.email,
    role: membership.role,
  };
}

export async function updateTeamForCurrentUser(raw: unknown): Promise<TeamSummary> {
  const userId = await requireUserId();
  const parsed = updateTeamInputSchema.parse(raw);
  await assertTeamPermission(parsed.teamId, userId, "team:update");

  const team = await prisma.team.update({
    where: { id: parsed.teamId },
    data: { name: parsed.name },
    include: {
      memberships: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });

  return toTeamSummary(team, userId);
}

export async function deleteTeamForCurrentUser(raw: unknown): Promise<{ teamId: string }> {
  const userId = await requireUserId();
  const parsed = deleteTeamInputSchema.parse(raw);
  await assertTeamPermission(parsed.teamId, userId, "team:delete");

  await prisma.team.delete({
    where: { id: parsed.teamId },
  });

  return { teamId: parsed.teamId };
}

export async function listTeamMembersForCurrentUser(
  teamId: string,
): Promise<TeamMemberSummary[]> {
  const userId = await requireUserId();
  const parsedTeamId = z.string().min(1, "Team is required.").parse(teamId);
  await assertTeamPermission(parsedTeamId, userId, "team:roster:read");

  const members = await prisma.teamMembership.findMany({
    where: { teamId: parsedTeamId },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return members.map((member) => ({
    userId: member.userId,
    email: member.user.email,
    role: member.role,
  }));
}

export async function removeTeamMemberForCurrentUser(
  raw: unknown,
): Promise<{ teamId: string; userId: string }> {
  const actorUserId = await requireUserId();
  const parsed = removeTeamMemberInputSchema.parse(raw);
  const actorMembership = await assertTeamPermission(
    parsed.teamId,
    actorUserId,
    "team:members:write",
  );

  const targetMembership = await prisma.teamMembership.findUnique({
    where: {
      teamId_userId: {
        teamId: parsed.teamId,
        userId: parsed.userId,
      },
    },
    select: { role: true },
  });

  if (!targetMembership) {
    throw new TeamMemberNotFoundError();
  }
  if (targetMembership.role === TeamRole.OWNER) {
    throw new TeamOwnerRoleInvariantError();
  }
  if (actorMembership.role !== TeamRole.OWNER && targetMembership.role === TeamRole.ADMIN) {
    throw new TeamPermissionDeniedError();
  }

  await prisma.teamMembership.delete({
    where: {
      teamId_userId: {
        teamId: parsed.teamId,
        userId: parsed.userId,
      },
    },
  });

  return { teamId: parsed.teamId, userId: parsed.userId };
}

export async function updateTeamMemberRoleForCurrentUser(
  raw: unknown,
): Promise<{ teamId: string; userId: string; role: TeamRole }> {
  const actorUserId = await requireUserId();
  const parsed = updateTeamMemberRoleInputSchema.parse(raw);
  const actorMembership = await assertTeamPermission(
    parsed.teamId,
    actorUserId,
    "team:members:role:update",
  );

  if (parsed.role === TeamRole.OWNER) {
    throw new TeamOwnerRoleInvariantError();
  }

  const targetMembership = await prisma.teamMembership.findUnique({
    where: {
      teamId_userId: {
        teamId: parsed.teamId,
        userId: parsed.userId,
      },
    },
    select: { role: true },
  });

  if (!targetMembership) {
    throw new TeamMemberNotFoundError();
  }
  if (targetMembership.role === TeamRole.OWNER || parsed.userId === actorUserId) {
    throw new TeamOwnerRoleInvariantError();
  }
  if (actorMembership.role !== TeamRole.OWNER) {
    throw new TeamPermissionDeniedError();
  }

  return prisma.teamMembership.update({
    where: {
      teamId_userId: {
        teamId: parsed.teamId,
        userId: parsed.userId,
      },
    },
    data: { role: parsed.role },
    select: {
      teamId: true,
      userId: true,
      role: true,
    },
  });
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string } | undefined;
  if (user?.id) {
    return user.id;
  }

  if (user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true },
    });
    if (dbUser?.id) {
      return dbUser.id;
    }
  }

  throw new UnauthorizedTeamAccessError();
}

async function assertTeamPermission(
  teamId: string,
  userId: string,
  permission: TeamPermission,
): Promise<{ role: TeamRole }> {
  const membership = await prisma.teamMembership.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new TeamAccessDeniedError();
  }

  if (!canTeamRole(membership.role, permission)) {
    throw new TeamPermissionDeniedError();
  }

  return membership;
}

function toTeamSummary(team: TeamWithMemberships, currentUserId: string): TeamSummary {
  const ownerMembership = team.memberships.find(
    (membership) =>
      membership.userId === team.ownerId && membership.role === TeamRole.OWNER,
  );
  const currentUserMembership = team.memberships.find(
    (membership) => membership.userId === currentUserId,
  );

  if (!ownerMembership || !currentUserMembership) {
    throw new Error(`Team ${team.id} is missing an OWNER membership invariant.`);
  }

  return {
    id: team.id,
    name: team.name,
    ownerId: team.ownerId,
    ownerRole: ownerMembership.role,
    currentUserRole: currentUserMembership.role,
    canManageRoster: canTeamRole(currentUserMembership.role, "team:roster:write"),
    memberCount: team.memberships.length,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}
