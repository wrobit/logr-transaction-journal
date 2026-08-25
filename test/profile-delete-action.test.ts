// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteAccount } from "@/actions/profile";

const getServerSessionMock = vi.hoisted(() => vi.fn());
const ensureUserIdMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/auth/users", () => ({
  ensureUserId: ensureUserIdMock,
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  getUserByLogin: vi.fn(),
}));
vi.mock("@/lib/i18n/translate", () => ({
  getServerTranslator: vi.fn(async () => (key: string) => key),
}));
vi.mock("@/lib/db", () => ({
  db: { transaction: transactionMock },
}));

describe("deleteAccount", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    ensureUserIdMock.mockReset();
    transactionMock.mockReset();
    deleteMock.mockReset();
    insertMock.mockReset();
    revalidatePathMock.mockReset();

    getServerSessionMock.mockResolvedValue({
      user: { id: "user-1", authenticatedAt: Date.now() },
    });
    ensureUserIdMock.mockResolvedValue("user-1");
    deleteMock.mockImplementation(() => ({
      where: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "user-1" }]) })),
    }));
    insertMock.mockImplementation(() => ({ values: vi.fn(async () => []) }));
    transactionMock.mockImplementation(async (callback) =>
      callback({ delete: deleteMock, insert: insertMock }),
    );
  });

  it("deletes linked feedback and the user atomically while retaining only a safe reason", async () => {
    const formData = new FormData();
    formData.set("confirmation", "DELETE");
    formData.set("reason", "privacy");

    const result = await deleteAccount({ status: "idle" }, formData);

    expect(result.status).toBe("success");
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("requires a recent OAuth authentication", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "user-1", authenticatedAt: Date.now() - 11 * 60_000 },
    });
    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    const result = await deleteAccount({ status: "idle" }, formData);

    expect(result.status).toBe("error");
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
