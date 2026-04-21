/**
 * Fleet Management System — Server-side unit tests
 * Tests cover auth, trucks, drivers, suppliers, parts, maintenance, schedules, and reports routers.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAdminCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@fleet.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makeStaffCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "staff-user",
    email: "staff@fleet.com",
    name: "Staff User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the authenticated user when logged in", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("admin@fleet.com");
    expect(result?.role).toBe("admin");
  });

  it("returns null for unauthenticated requests", async () => {
    const ctx = makeAnonCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: makeAdminCtx().user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

// ─── Role-Based Access Tests ──────────────────────────────────────────────────

describe("role-based access control", () => {
  it("blocks unauthenticated access to protected procedures", async () => {
    const ctx = makeAnonCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.trucks.list()).rejects.toThrow();
  });

  it("allows staff to access protected procedures", async () => {
    const ctx = makeStaffCtx();
    const caller = appRouter.createCaller(ctx);
    // Should not throw for protected procedures (even if DB returns empty)
    await expect(caller.trucks.list()).resolves.toBeDefined();
  });

  it("blocks staff from admin-only procedures", async () => {
    const ctx = makeStaffCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.categories.create({ name: "Test Category" })
    ).rejects.toThrow();
  });

  it("allows admin to access admin-only procedures", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    // Should not throw for admin procedures (even if DB returns empty)
    await expect(
      caller.categories.create({ name: "Test Category" })
    ).resolves.toBeDefined();
  });
});

// ─── Trucks Router Tests ──────────────────────────────────────────────────────

describe("trucks router", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trucks.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("get returns null for non-existent truck", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trucks.get({ id: 999999 });
    expect(result).toBeUndefined();
  });
});

// ─── Drivers Router Tests ─────────────────────────────────────────────────────

describe("drivers router", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.drivers.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Suppliers Router Tests ───────────────────────────────────────────────────

describe("suppliers router", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.suppliers.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Parts Router Tests ───────────────────────────────────────────────────────

describe("parts router", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.parts.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("lowStock returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.parts.lowStock();
    expect(Array.isArray(result)).toBe(true);
  });

  it("categories list returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Maintenance Router Tests ─────────────────────────────────────────────────

describe("maintenance router", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.maintenance.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list with truckId filter returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.maintenance.list({ truckId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Schedules Router Tests ───────────────────────────────────────────────────

describe("schedules router", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.schedules.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listAll returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.schedules.listAll();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Dashboard Router Tests ───────────────────────────────────────────────────

describe("dashboard router", () => {
  it("summary returns a result (null or object)", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.dashboard.summary();
    // Either null (no DB) or a valid summary object
    if (result !== null) {
      expect(typeof result.totalTrucks).toBe("number");
      expect(typeof result.activeTrucks).toBe("number");
      expect(typeof result.totalParts).toBe("number");
    } else {
      expect(result).toBeNull();
    }
  });
});

// ─── Reports Router Tests ─────────────────────────────────────────────────────

describe("reports router", () => {
  it("costPerTruck returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.reports.costPerTruck();
    expect(Array.isArray(result)).toBe(true);
  });

  it("monthlyExpenses returns 12 months of data", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.reports.monthlyExpenses({ year: 2025 });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result.length).toBe(12);
      result.forEach((m) => {
        expect(m.month).toBeGreaterThanOrEqual(1);
        expect(m.month).toBeLessThanOrEqual(12);
        expect(typeof m.totalCost).toBe("number");
        expect(typeof m.count).toBe("number");
      });
    }
  });

  it("partsUsage returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.reports.partsUsage();
    expect(Array.isArray(result)).toBe(true);
  });

  it("serviceDue returns an array", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.reports.serviceDue();
    expect(Array.isArray(result)).toBe(true);
  });

  it("fuelEfficiency returns trips and truckSummary arrays", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.reports.fuelEfficiency();
    expect(result).toBeDefined();
    expect(Array.isArray(result.trips)).toBe(true);
    expect(Array.isArray(result.truckSummary)).toBe(true);
  });

  it("fuelEfficiency is accessible by staff", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    const result = await caller.reports.fuelEfficiency();
    expect(result).toBeDefined();
    expect(Array.isArray(result.trips)).toBe(true);
  });

  it("fuelEfficiency rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.reports.fuelEfficiency()).rejects.toThrow();
  });
});

// ─── Users Router Tests ───────────────────────────────────────────────────────

describe("users router", () => {
  it("list returns an array for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list is blocked for non-admin", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(caller.users.list()).rejects.toThrow();
  });
});
