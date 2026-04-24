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
  TeamMemberAlreadyExistsError,
  TeamMemberTargetNotFoundError,
  TeamAccessDeniedError,
  TeamPermissionDeniedError,
  UnauthorizedTeamAccessError,
  addTeamMemberByEmailForCurrentUser,
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
    expect(result.currentUserRole).toBe("OWNER");
    expect(result.canManageRoster).toBe(true);
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
    expect(result[0]?.currentUserRole).toBe("OWNER");
    expect(result[0]?.canManageRoster).toBe(true);
    expect(result[0]?.memberCount).toBe(2);
  });

  it("lists member teams as read-only for roster management", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_2",
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

    expect(result[0]?.currentUserRole).toBe("MEMBER");
    expect(result[0]?.canManageRoster).toBe(false);
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
    prismaMock.teamMembership.findUnique.mockResolvedValue({ role: "OWNER" });
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
      select: { role: true },
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
    prismaMock.teamMembership.findUnique.mockResolvedValue({ role: "OWNER" });
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

  it("denies roster writes for members without write permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue({ role: "MEMBER" });

    await expect(
      saveTeamMembersForCurrentUser({
        teamId: "team_1",
        members: [
          { id: "m1", name: "A", unavailableDates: [] },
          { id: "m2", name: "B", unavailableDates: [] },
        ],
      }),
    ).rejects.toBeInstanceOf(TeamPermissionDeniedError);
  });

  it("allows roster reads for member role", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue({ role: "MEMBER" });
    prismaMock.teamRoster.findUnique.mockResolvedValue({
      members: [
        { id: "m1", name: "Alice", unavailableDates: [] },
        { id: "m2", name: "Bob", unavailableDates: [] },
      ],
    });

    const loaded = await loadTeamMembersForCurrentUser("team_1");
    expect(loaded.members).toHaveLength(2);
  });

  it("supports save then load then schedule generation with loaded roster", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue({ role: "OWNER" });
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

  it("adds existing users to a team by email when caller has permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_admin" },
    });
    prismaMock.teamMembership.findUnique
      .mockResolvedValueOnce({ role: "ADMIN" })
      .mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_target",
      email: "member@example.com",
    });
    prismaMock.teamMembership.create.mockResolvedValue({
      teamId: "team_1",
      userId: "user_target",
      role: "MEMBER",
    });

    const result = await addTeamMemberByEmailForCurrentUser({
      teamId: "team_1",
      email: " MEMBER@example.com ",
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "member@example.com" },
      select: { id: true, email: true },
    });
    expect(prismaMock.teamMembership.create).toHaveBeenCalledWith({
      data: {
        teamId: "team_1",
        userId: "user_target",
        role: "MEMBER",
      },
      select: {
        teamId: true,
        userId: true,
        role: true,
      },
    });
    expect(result.email).toBe("member@example.com");
  });

  it("fails to add member when target email account does not exist", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_admin" },
    });
    prismaMock.teamMembership.findUnique.mockResolvedValue({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      addTeamMemberByEmailForCurrentUser({
        teamId: "team_1",
        email: "missing@example.com",
      }),
    ).rejects.toBeInstanceOf(TeamMemberTargetNotFoundError);
  });

  it("fails to add member when user is already in team", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_admin" },
    });
    prismaMock.teamMembership.findUnique
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce({ id: "membership_1" });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_target",
      email: "member@example.com",
    });

    await expect(
      addTeamMemberByEmailForCurrentUser({
        teamId: "team_1",
        email: "member@example.com",
      }),
    ).rejects.toBeInstanceOf(TeamMemberAlreadyExistsError);
  });
});
