import { beforeEach, describe, expect, it, vi } from "vitest";

import { purgeUserEntries, restoreUser, softDeleteUser } from "@/actions/admin-users";

const getAdminSessionMock = vi.hoisted(() => vi.fn());
const logAdminActionMock = vi.hoisted(() => vi.fn());
const getEntriesCountForUserMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/admin", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/actions/admin-audit", () => ({
  logAdminAction: logAdminActionMock,
  getEntriesCountForUser: getEntriesCountForUserMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: updateMock,
    delete: deleteMock,
    select: selectMock,
  },
}));

const createUpdateChain = () => ({
  set: () => ({
    where: () => Promise.resolve([]),
  }),
});

const createDeleteChain = () => ({
  where: () => Promise.resolve([]),
});

const createSelectChain = (result: Array<{ count: number }>) => ({
  from: () => ({
    where: () => Promise.resolve(result),
  }),
});

describe("admin user actions", () => {
  beforeEach(() => {
    getAdminSessionMock.mockReset();
    logAdminActionMock.mockReset();
    getEntriesCountForUserMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    selectMock.mockReset();
    revalidatePathMock.mockReset();

    updateMock.mockReturnValue(createUpdateChain());
    deleteMock.mockReturnValue(createDeleteChain());
    selectMock.mockReturnValue(createSelectChain([{ count: 3 }]));
  });

  it("blocks admin actions when not signed in", async () => {
    getAdminSessionMock.mockResolvedValue(null);

    const result = await softDeleteUser("user-1");

    expect(result.status).toBe("error");
    expect(result.message).toBe("Admin access required.");
  });

  it("prevents self-deactivation", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });

    const result = await softDeleteUser("admin-1");

    expect(result.status).toBe("error");
    expect(result.message).toBe("You cannot deactivate your own account.");
  });

  it("logs deactivate action", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });

    const result = await softDeleteUser("user-2");

    expect(result.status).toBe("success");
    expect(logAdminActionMock).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "user.deactivated",
      targetUserId: "user-2",
    });
  });

  it("logs restore action", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });

    const result = await restoreUser("user-2");

    expect(result.status).toBe("success");
    expect(logAdminActionMock).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "user.restored",
      targetUserId: "user-2",
    });
  });

  it("logs purge action with metadata", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });
    getEntriesCountForUserMock.mockResolvedValue(5);

    const result = await purgeUserEntries("user-2");

    expect(result.status).toBe("success");
    expect(logAdminActionMock).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "entries.purged",
      targetUserId: "user-2",
      metadata: { entriesPurged: 5 },
    });
  });
});
