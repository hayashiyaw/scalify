import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    team: {
      findMany: vi.fn(),
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
  UnauthorizedTeamAccessError,
  createTeamForCurrentUser,
  listTeamsForCurrentUser,
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
});
