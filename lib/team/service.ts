import { TeamRole } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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

  return toTeamSummary(team);
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

  return teams.map(toTeamSummary);
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new UnauthorizedTeamAccessError();
  }
  return userId;
}

function toTeamSummary(team: TeamWithMemberships): TeamSummary {
  const ownerMembership = team.memberships.find(
    (membership) =>
      membership.userId === team.ownerId && membership.role === TeamRole.OWNER,
  );

  if (!ownerMembership) {
    throw new Error(`Team ${team.id} is missing an OWNER membership invariant.`);
  }

  return {
    id: team.id,
    name: team.name,
    ownerId: team.ownerId,
    ownerRole: ownerMembership.role,
    memberCount: team.memberships.length,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}
