import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateSchedule } from "@/app/actions/schedule";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    team: {
      findMany: vi.fn(),
    },
    teamMembership: {
      findUnique: vi.fn(),
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
  TeamAccessDeniedError,
  UnauthorizedTeamAccessError,
  createTeamForCurrentUser,
  loadTeamMembersForCurrentUser,
  listTeamsForCurrentUser,
  saveTeamMembersForCurrentUser,
} from "@/lib/team/service";

describe("team service integration behaviors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a team with owner membership for authenticated user", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_1",
      },
    });

    const createdAt = new Date("2026-04-24T12:00:00.000Z");
    const updatedAt = new Date("2026-04-24T12:00:00.000Z");

    const txMock = {
      team: {
        create: vi.fn().mockResolvedValue({
          id: "team_1",
          name: "Ops Team",
          ownerId: "user_1",
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "team_1",
          name: "Ops Team",
          ownerId: "user_1",
          createdAt,
          updatedAt,
          memberships: [{ userId: "user_1", role: "OWNER" }],
        }),
      },
      teamMembership: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    const result = await createTeamForCurrentUser({ name: "Ops Team" });

    expect(txMock.team.create).toHaveBeenCalledWith({
      data: {
        name: "Ops Team",
        ownerId: "user_1",
      },
    });
    expect(txMock.teamMembership.create).toHaveBeenCalledWith({
      data: {
        teamId: "team_1",
        userId: "user_1",
        role: "OWNER",
      },
    });
    expect(result.ownerRole).toBe("OWNER");
    expect(result.memberCount).toBe(1);
  });

  it("lists only teams visible to the current user", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_1",
      },
    });

    prismaMock.team.findMany.mockResolvedValue([
      {
        id: "team_1",
        name: "Ops Team",
        ownerId: "user_1",
        createdAt: new Date("2026-04-24T12:00:00.000Z"),
        updatedAt: new Date("2026-04-24T12:00:00.000Z"),
        memberships: [
          { userId: "user_1", role: "OWNER" },
          { userId: "user_2", role: "MEMBER" },
        ],
      },
    ]);

    const result = await listTeamsForCurrentUser();

    expect(prismaMock.team.findMany).toHaveBeenCalledWith({
      where: {
        memberships: {
          some: { userId: "user_1" },
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
    expect(result).toHaveLength(1);
    expect(result[0]?.ownerRole).toBe("OWNER");
    expect(result[0]?.memberCount).toBe(2);
  });

  it("denies unauthenticated users for team persistence operations", async () => {
    authMock.mockResolvedValue(null);

    await expect(createTeamForCurrentUser({ name: "Hidden Team" })).rejects.toBeInstanceOf(
      UnauthorizedTeamAccessError,
    );
    await expect(listTeamsForCurrentUser()).rejects.toBeInstanceOf(
      UnauthorizedTeamAccessError,
    );
  });

  it("saves team members and availability for accessible team", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue({ id: "membership_1" });
    prismaMock.teamRoster.upsert.mockResolvedValue({});

    const result = await saveTeamMembersForCurrentUser({
      teamId: "team_1",
      members: [
        {
          id: "member_a",
          name: "Alice",
          unavailableDates: ["2026-04-29"],
        },
        {
          id: "member_b",
          name: "Bob",
          unavailableDates: [],
        },
      ],
    });

    expect(prismaMock.teamMembership.findUnique).toHaveBeenCalledWith({
      where: {
        teamId_userId: {
          teamId: "team_1",
          userId: "user_1",
        },
      },
      select: { id: true },
    });
    expect(prismaMock.teamRoster.upsert).toHaveBeenCalledWith({
      where: { teamId: "team_1" },
      create: {
        teamId: "team_1",
        members: result.members,
      },
      update: {
        members: result.members,
      },
    });
    expect(result.members).toHaveLength(2);
  });

  it("returns empty members when a team has no saved roster yet", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue({ id: "membership_1" });
    prismaMock.teamRoster.findUnique.mockResolvedValue(null);

    const result = await loadTeamMembersForCurrentUser("team_1");
    expect(result.members).toEqual([]);
  });

  it("denies roster access for non-members", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue(null);

    await expect(
      saveTeamMembersForCurrentUser({
        teamId: "team_2",
        members: [
          { id: "m1", name: "A", unavailableDates: [] },
          { id: "m2", name: "B", unavailableDates: [] },
        ],
      }),
    ).rejects.toBeInstanceOf(TeamAccessDeniedError);
  });

  it("supports save then load then schedule generation with loaded roster", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue({ id: "membership_1" });
    prismaMock.teamRoster.upsert.mockResolvedValue({});
    prismaMock.teamRoster.findUnique.mockResolvedValue({
      members: [
        {
          id: "member_a",
          name: "Alice",
          unavailableDates: ["2026-05-01"],
        },
        {
          id: "member_b",
          name: "Bob",
          unavailableDates: [],
        },
      ],
    });

    await saveTeamMembersForCurrentUser({
      teamId: "team_1",
      members: [
        {
          id: "member_a",
          name: "Alice",
          unavailableDates: ["2026-05-01"],
        },
        {
          id: "member_b",
          name: "Bob",
          unavailableDates: [],
        },
      ],
    });

    const loaded = await loadTeamMembersForCurrentUser("team_1");
    const schedule = await calculateSchedule({
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      holidayCountry: "US",
      members: loaded.members,
    });

    expect(schedule.ok).toBe(true);
    if (schedule.ok) {
      expect(schedule.data.assignments.length).toBeGreaterThan(0);
      expect(schedule.data.report).toHaveLength(2);
    }
  });
});
