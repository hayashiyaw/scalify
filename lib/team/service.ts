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

const saveTeamMembersInputSchema = z.object({
  teamId: z.string().min(1, "Team is required."),
  members: z.array(scheduleMemberSchema).min(2, "Add at least two team members."),
});

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

  const members = z.array(scheduleMemberSchema).parse(roster?.members ?? []);
  return {
    teamId: parsedTeamId,
    members,
  };
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
): Promise<void> {
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
