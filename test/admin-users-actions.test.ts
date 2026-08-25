import { beforeEach, describe, expect, it, vi } from "vitest";

import { purgeUserEntries, restoreUser, softDeleteUser } from "@/actions/admin-users";

const getAdminSessionMock = vi.hoisted(() => vi.fn());
const getEntriesCountForUserMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/admin", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/actions/admin-audit", () => ({
  getEntriesCountForUser: getEntriesCountForUserMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: updateMock,
    delete: deleteMock,
    insert: insertMock,
    select: selectMock,
    transaction: transactionMock,
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

const createInsertChain = () => ({
  values: vi.fn(() => Promise.resolve([])),
});

const createSelectChain = (result: Array<{ count: number }>) => ({
  from: () => ({
    where: () => Promise.resolve(result),
  }),
});

describe("admin user actions", () => {
  beforeEach(() => {
    getAdminSessionMock.mockReset();
    getEntriesCountForUserMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    insertMock.mockReset();
    transactionMock.mockReset();
    selectMock.mockReset();
    revalidatePathMock.mockReset();

    updateMock.mockReturnValue(createUpdateChain());
    deleteMock.mockReturnValue(createDeleteChain());
    insertMock.mockReturnValue(createInsertChain());
    selectMock.mockReturnValue(createSelectChain([{ count: 3 }]));
    transactionMock.mockImplementation(async (callback) =>
      callback({ update: updateMock, delete: deleteMock, insert: insertMock }),
    );
  });

  it("blocks admin actions when not signed in", async () => {
    getAdminSessionMock.mockResolvedValue(null);

    const result = await softDeleteUser("user-1");

    expect(result.status).toBe("error");
    expect(result.message).toBe("Admin access required.");
  });

  it("prevents self-deactivation", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1", authenticatedAt: Date.now() } });

    const result = await softDeleteUser("admin-1");

    expect(result.status).toBe("error");
    expect(result.message).toBe("You cannot deactivate your own account.");
  });

  it("deactivates and audits in one transaction", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1", authenticatedAt: Date.now() } });

    const result = await softDeleteUser("user-2");

    expect(result.status).toBe("success");
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("restores and audits in one transaction", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1", authenticatedAt: Date.now() } });

    const result = await restoreUser("user-2");

    expect(result.status).toBe("success");
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("purges and audits in one transaction", async () => {
    getAdminSessionMock.mockResolvedValue({ user: { id: "admin-1", authenticatedAt: Date.now() } });
    getEntriesCountForUserMock.mockResolvedValue(5);

    const result = await purgeUserEntries("user-2");

    expect(result.status).toBe("success");
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(deleteMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
  });
});
