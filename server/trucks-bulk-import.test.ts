import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    getTruckByPlate: vi.fn(),
    createTruck: vi.fn(),
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

describe("trucks.bulkImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports valid rows and returns correct counts", async () => {
    vi.mocked(db.getTruckByPlate).mockResolvedValue(undefined);
    vi.mocked(db.createTruck).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trucks.bulkImport({
      rows: [
        { truckCode: "TRK-001", plateNumber: "ABC-1234", brand: "Mack", model: "Granite", status: "active" },
        { truckCode: "TRK-002", plateNumber: "DEF-5678", brand: "Volvo", model: "FH16", status: "active" },
      ],
    });

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].status).toBe("imported");
    expect(result.results[1].status).toBe("imported");
  });

  it("skips rows with duplicate plate numbers", async () => {
    vi.mocked(db.getTruckByPlate)
      .mockResolvedValueOnce(undefined)           // first row — new
      .mockResolvedValueOnce({ id: 99 } as any);  // second row — duplicate

    vi.mocked(db.createTruck).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trucks.bulkImport({
      rows: [
        { truckCode: "TRK-001", plateNumber: "NEW-0001" },
        { truckCode: "TRK-002", plateNumber: "DUP-0002" },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[1].status).toBe("skipped");
    expect(result.results[1].reason).toMatch(/already exists/i);
  });

  it("handles createTruck errors gracefully and continues", async () => {
    vi.mocked(db.getTruckByPlate).mockResolvedValue(undefined);
    vi.mocked(db.createTruck)
      .mockRejectedValueOnce(new Error("DB write failed"))
      .mockResolvedValueOnce({} as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trucks.bulkImport({
      rows: [
        { truckCode: "TRK-ERR", plateNumber: "ERR-0001" },
        { truckCode: "TRK-OK",  plateNumber: "OK-0002" },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[0].status).toBe("skipped");
    expect(result.results[0].reason).toBe("DB write failed");
    expect(result.results[1].status).toBe("imported");
  });

  it("returns empty result for empty rows array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trucks.bulkImport({ rows: [] });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("throws FORBIDDEN for staff users", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(
      caller.trucks.bulkImport({ rows: [{ truckCode: "TRK-001", plateNumber: "ABC-1234" }] })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
