import { TeamRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { calculateSchedule } from "@/app/actions/schedule";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    team: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    teamMembership: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    teamRoster: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import {
  TeamPermissionDeniedError,
  addTeamMemberByEmailForCurrentUser,
  createTeamForCurrentUser,
  loadTeamMembersForCurrentUser,
  saveTeamMembersForCurrentUser,
} from "@/lib/team/service";

type TestTeam = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type TestMembership = {
  teamId: string;
  userId: string;
  role: TeamRole;
};

type TestRoster = {
  teamId: string;
  members: Array<{ id: string; name: string; unavailableDates: string[] }>;
};

describe("SCA0010 team collaboration acceptance", () => {
  let activeUserId: string | null;
  let teamCounter: number;
  let membershipCounter: number;
  let teams: TestTeam[];
  let memberships: TestMembership[];
  let rosters: TestRoster[];
  const users = new Map([
    ["owner@example.com", { id: "user_owner", email: "owner@example.com" }],
    ["admin@example.com", { id: "user_admin", email: "admin@example.com" }],
    ["member@example.com", { id: "user_member", email: "member@example.com" }],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();

    activeUserId = null;
    teamCounter = 1;
    membershipCounter = 1;
    teams = [];
    memberships = [];
    rosters = [];

    authMock.mockImplementation(async () => {
      if (!activeUserId) return null;
      return { user: { id: activeUserId } };
    });

    prismaMock.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        team: {
          create: vi.fn().mockImplementation(async ({ data }: { data: { name: string; ownerId: string } }) => {
            const now = new Date(`2026-04-24T12:00:0${teamCounter}.000Z`);
            const created: TestTeam = {
              id: `team_${teamCounter}`,
              name: data.name,
              ownerId: data.ownerId,
              createdAt: now,
              updatedAt: now,
            };
            teamCounter += 1;
            teams.push(created);
            return created;
          }),
          findUniqueOrThrow: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
            const team = teams.find((entry) => entry.id === where.id);
            if (!team) {
              throw new Error("team not found");
            }
            return {
              ...team,
              memberships: memberships
                .filter((entry) => entry.teamId === team.id)
                .map((entry) => ({ userId: entry.userId, role: entry.role })),
            };
          }),
        },
        teamMembership: {
          create: vi.fn().mockImplementation(async ({ data }: { data: TestMembership }) => {
            memberships.push({ ...data });
            membershipCounter += 1;
            return { id: `membership_${membershipCounter}`, ...data };
          }),
        },
      };

      return callback(tx);
    });

    prismaMock.team.findMany.mockImplementation(async ({ where }: { where: { memberships: { some: { userId: string } } } }) => {
      const visibleTeamIds = new Set(
        memberships
          .filter((entry) => entry.userId === where.memberships.some.userId)
          .map((entry) => entry.teamId),
      );
      return teams
        .filter((entry) => visibleTeamIds.has(entry.id))
        .map((entry) => ({
          ...entry,
          memberships: memberships
            .filter((membership) => membership.teamId === entry.id)
            .map((membership) => ({
              userId: membership.userId,
              role: membership.role,
            })),
        }));
    });

    prismaMock.teamMembership.findUnique.mockImplementation(async ({ where }: { where: { teamId_userId: { teamId: string; userId: string } } }) => {
      const membership = memberships.find(
        (entry) =>
          entry.teamId === where.teamId_userId.teamId &&
          entry.userId === where.teamId_userId.userId,
      );
      if (!membership) {
        return null;
      }
      return { id: "membership_lookup", role: membership.role };
    });

    prismaMock.teamMembership.create.mockImplementation(async ({ data }: { data: TestMembership }) => {
      memberships.push({ ...data });
      membershipCounter += 1;
      return {
        id: `membership_${membershipCounter}`,
        teamId: data.teamId,
        userId: data.userId,
        role: data.role,
      };
    });

    prismaMock.teamMembership.update.mockImplementation(async ({ where, data }: { where: { teamId_userId: { teamId: string; userId: string } }; data: { role: TeamRole } }) => {
      const target = memberships.find(
        (entry) =>
          entry.teamId === where.teamId_userId.teamId &&
          entry.userId === where.teamId_userId.userId,
      );
      if (!target) {
        throw new Error("membership not found");
      }
      target.role = data.role;
      return { ...target };
    });

    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { email: string } }) => {
      return users.get(where.email.toLowerCase()) ?? null;
    });

    prismaMock.teamRoster.upsert.mockImplementation(async ({ where, create, update }: { where: { teamId: string }; create: TestRoster; update: TestRoster }) => {
      const existingIndex = rosters.findIndex((entry) => entry.teamId === where.teamId);
      if (existingIndex >= 0) {
        rosters[existingIndex] = {
          teamId: where.teamId,
          members: update.members,
        };
      } else {
        rosters.push({
          teamId: where.teamId,
          members: create.members,
        });
      }
      return {};
    });

    prismaMock.teamRoster.findUnique.mockImplementation(async ({ where }: { where: { teamId: string } }) => {
      const roster = rosters.find((entry) => entry.teamId === where.teamId);
      if (!roster) {
        return null;
      }
      return { members: roster.members };
    });
  });

  it("covers owner/admin/member collaboration while keeping anonymous scheduling available", async () => {
    activeUserId = "user_owner";
    const createdTeam = await createTeamForCurrentUser({ name: "Team Phoenix" });
    expect(createdTeam.currentUserRole).toBe("OWNER");

    await saveTeamMembersForCurrentUser({
      teamId: createdTeam.id,
      members: [
        { id: "m1", name: "Alice", unavailableDates: [] },
        { id: "m2", name: "Bruno", unavailableDates: ["2026-05-01"] },
      ],
    });

    await addTeamMemberByEmailForCurrentUser({
      teamId: createdTeam.id,
      email: "admin@example.com",
    });
    await prismaMock.teamMembership.update({
      where: {
        teamId_userId: {
          teamId: createdTeam.id,
          userId: "user_admin",
        },
      },
      data: { role: TeamRole.ADMIN },
    });
    await addTeamMemberByEmailForCurrentUser({
      teamId: createdTeam.id,
      email: "member@example.com",
    });

    activeUserId = "user_admin";
    await saveTeamMembersForCurrentUser({
      teamId: createdTeam.id,
      members: [
        { id: "m1", name: "Alice", unavailableDates: ["2026-05-02"] },
        { id: "m2", name: "Bruno", unavailableDates: [] },
      ],
    });

    activeUserId = "user_member";
    await expect(
      saveTeamMembersForCurrentUser({
        teamId: createdTeam.id,
        members: [
          { id: "m1", name: "Alice", unavailableDates: [] },
          { id: "m2", name: "Bruno", unavailableDates: [] },
        ],
      }),
    ).rejects.toBeInstanceOf(TeamPermissionDeniedError);

    const memberView = await loadTeamMembersForCurrentUser(createdTeam.id);
    expect(memberView.members).toHaveLength(2);
    const teamSchedule = await calculateSchedule({
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      holidayCountry: "US",
      members: memberView.members,
    });
    expect(teamSchedule.ok).toBe(true);

    activeUserId = null;
    const anonymousSchedule = await calculateSchedule({
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      holidayCountry: "US",
      members: [
        { id: "anon_1", name: "Anon One", unavailableDates: [] },
        { id: "anon_2", name: "Anon Two", unavailableDates: [] },
      ],
    });

    expect(anonymousSchedule.ok).toBe(true);
  });
});
