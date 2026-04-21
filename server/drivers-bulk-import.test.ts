import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getDriverByLicense: vi.fn(),
    createDriver: vi.fn(),
    getAllUsers: vi.fn().mockResolvedValue([]),
    getAllTrucks: vi.fn().mockResolvedValue([]),
    getAllDrivers: vi.fn().mockResolvedValue([]),
    getDashboardSummary: vi.fn().mockResolvedValue({}),
  };
});

import * as db from "./db";

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "local:admin",
      name: "Admin",
      email: null,
      loginMethod: "local",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeStaffCtx(): TrpcContext {
  return {
    ...makeAdminCtx(),
    user: { ...makeAdminCtx().user!, role: "user" },
  };
}

describe("drivers.bulkImport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports valid rows and returns correct counts", async () => {
    vi.mocked(db.getDriverByLicense).mockResolvedValue(undefined);
    vi.mocked(db.createDriver).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.drivers.bulkImport({
      rows: [
        { name: "John Doe", licenseNumber: "DL-001", status: "active" },
        { name: "Jane Smith", licenseNumber: "DL-002", status: "active" },
      ],
    });

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.results[0].status).toBe("imported");
    expect(result.results[1].status).toBe("imported");
  });

  it("skips rows with duplicate license numbers", async () => {
    vi.mocked(db.getDriverByLicense)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 5 } as any);
    vi.mocked(db.createDriver).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.drivers.bulkImport({
      rows: [
        { name: "New Driver", licenseNumber: "NEW-001" },
        { name: "Duplicate Driver", licenseNumber: "DUP-002" },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[1].status).toBe("skipped");
    expect(result.results[1].reason).toMatch(/already exists/i);
  });

  it("imports rows without license numbers without duplicate check", async () => {
    vi.mocked(db.createDriver).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.drivers.bulkImport({
      rows: [
        { name: "Driver No License" },
        { name: "Another Driver" },
      ],
    });

    expect(result.imported).toBe(2);
    expect(db.getDriverByLicense).not.toHaveBeenCalled();
  });

  it("handles createDriver errors gracefully and continues", async () => {
    vi.mocked(db.getDriverByLicense).mockResolvedValue(undefined);
    vi.mocked(db.createDriver)
      .mockRejectedValueOnce(new Error("DB write failed"))
      .mockResolvedValueOnce({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.drivers.bulkImport({
      rows: [
        { name: "Error Driver", licenseNumber: "ERR-001" },
        { name: "OK Driver", licenseNumber: "OK-002" },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[0].reason).toBe("DB write failed");
  });

  it("returns empty result for empty rows array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.drivers.bulkImport({ rows: [] });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("throws FORBIDDEN for staff users", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(
      caller.drivers.bulkImport({ rows: [{ name: "Test Driver" }] })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts on_leave as a valid status", async () => {
    vi.mocked(db.getDriverByLicense).mockResolvedValue(undefined);
    vi.mocked(db.createDriver).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.drivers.bulkImport({
      rows: [{ name: "Leave Driver", licenseNumber: "LV-001", status: "on_leave" }],
    });

    expect(result.imported).toBe(1);
    expect(result.results[0].status).toBe("imported");
  });
});
