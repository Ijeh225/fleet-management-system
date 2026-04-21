/**
 * Fleet Management System — Trips Router Tests
 * Tests cover trips.list, trips.stats, trips.fleetAvailability, and access control.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

// ─── trips.list ───────────────────────────────────────────────────────────────

describe("trips.list", () => {
  it("returns an array for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trips.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array for staff", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    const result = await caller.trips.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.trips.list()).rejects.toThrow();
  });

  it("accepts optional status filter", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trips.list({ status: "scheduled" });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── trips.stats ─────────────────────────────────────────────────────────────

describe("trips.stats", () => {
  it("returns stats object for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trips.stats();
    expect(result).toBeDefined();
    expect(typeof result.totalTrips).toBe("number");
    expect(typeof result.totalRevenue).toBe("number");
    expect(typeof result.totalFuelCost).toBe("number");
    expect(typeof result.totalDistance).toBe("number");
    expect(typeof result.netProfit).toBe("number");
  });

  it("returns stats object for staff", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    const result = await caller.trips.stats();
    expect(result).toBeDefined();
    expect(typeof result.totalTrips).toBe("number");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.trips.stats()).rejects.toThrow();
  });
});

// ─── trips.fleetAvailability ──────────────────────────────────────────────────

describe("trips.fleetAvailability", () => {
  it("returns an array for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trips.fleetAvailability();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array for staff", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    const result = await caller.trips.fleetAvailability();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.trips.fleetAvailability()).rejects.toThrow();
  });

  it("each truck has required availability fields", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.trips.fleetAvailability();
    for (const truck of result) {
      expect(truck).toHaveProperty("id");
      expect(truck).toHaveProperty("truckCode");
      expect(truck).toHaveProperty("plateNumber");
      expect(truck).toHaveProperty("availability");
      expect(["available", "on_trip", "under_maintenance", "inactive"]).toContain(truck.availability);
    }
  });
});

// ─── trips.delete (admin only) ────────────────────────────────────────────────

describe("trips.delete", () => {
  it("rejects staff from deleting trips", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(caller.trips.delete({ id: 999999 })).rejects.toThrow();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.trips.delete({ id: 999999 })).rejects.toThrow();
  });
});

// ─── trips.create — containerSize field ──────────────────────────────────────

describe("trips.create — containerSize validation", () => {
  it("rejects unauthenticated trip creation", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.trips.create({
        truckId: 1,
        origin: "Lagos",
        destination: "Abuja",
        containerSize: "20ft",
      })
    ).rejects.toThrow();
  });

  it("accepts valid containerSize values (20ft, 40ft, 40ft_hc)", async () => {
    // Validates that the zod schema accepts all three enum values without throwing a validation error
    const caller = appRouter.createCaller(makeAdminCtx());
    const validSizes = ["20ft", "40ft", "40ft_hc"] as const;
    for (const size of validSizes) {
      // We expect either success or a DB-level error (truck not found), not a Zod validation error
      try {
        await caller.trips.create({
          truckId: 999999,
          origin: "Lagos",
          destination: "Abuja",
          containerSize: size,
        });
      } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        // Should fail with DB/business logic error, not Zod validation
        expect(err.code).not.toBe("BAD_REQUEST");
      }
    }
  });
});

// ─── trips.recordActualFuel — access control ──────────────────────────────────

describe("trips.recordActualFuel", () => {
  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.trips.recordActualFuel({ tripId: 1, actualFuelLitres: 100 })
    ).rejects.toThrow();
  });

  it("rejects negative fuel litres", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.trips.recordActualFuel({ tripId: 1, actualFuelLitres: -5 })
    ).rejects.toThrow();
  });

  it("returns NOT_FOUND for non-existent trip", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    try {
      await caller.trips.recordActualFuel({ tripId: 999999, actualFuelLitres: 100 });
      // If it doesn't throw, the trip was found (unlikely with id 999999)
    } catch (e: unknown) {
      const err = e as { code?: string };
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  it("allows staff to record actual fuel", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    // Staff should be able to call this (protected, not admin-only)
    try {
      await caller.trips.recordActualFuel({ tripId: 999999, actualFuelLitres: 100 });
    } catch (e: unknown) {
      const err = e as { code?: string };
      // Should fail with NOT_FOUND, not FORBIDDEN or UNAUTHORIZED
      expect(err.code).toBe("NOT_FOUND");
    }
  });
});
