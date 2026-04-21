import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@fleet.com",
    name: "Admin User",
    loginMethod: "local",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createStaffContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "staff-user",
    email: "staff@fleet.com",
    name: "Staff User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("audit.list", () => {
  it("allows admin to list audit logs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw — returns array (may be empty if no DB)
    const result = await caller.audit.list({}).catch((e: any) => {
      // If DB not available in test env, that's OK
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return [];
      throw e;
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("blocks staff from listing audit logs", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.audit.list({})).rejects.toThrow();
  });

  it("accepts entityType filter", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.list({ entityType: "truck", limit: 10, offset: 0 }).catch((e: any) => {
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return [];
      throw e;
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts pagination parameters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.list({ limit: 25, offset: 0 }).catch((e: any) => {
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return [];
      throw e;
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("purchaseOrders.list", () => {
  it("allows authenticated users to list purchase orders", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.purchaseOrders.list().catch((e: any) => {
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return [];
      throw e;
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows staff to list purchase orders", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.purchaseOrders.list().catch((e: any) => {
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return [];
      throw e;
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("purchaseOrders.create", () => {
  it("allows admin to create a purchase order", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.purchaseOrders.create({
      items: [
        { partId: 1, partName: "Oil Filter", partNumber: "OF-001", quantity: 10, unitCost: "25.00", totalCost: 250 },
      ],
      notes: "Test purchase order",
    }).catch((e: any) => {
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return null;
      throw e;
    });
    // If DB available, should return an object with orderNumber
    if (result !== null) {
      expect(result).toHaveProperty("orderNumber");
      expect(result?.orderNumber).toMatch(/^PO-/);
    }
  });

  it("blocks staff from creating purchase orders", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.purchaseOrders.create({
        items: [{ partId: 1, partName: "Oil Filter", quantity: 5 }],
      })
    ).rejects.toThrow();
  });

  it("validates that items array is required and non-empty", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error testing invalid input
    await expect(caller.purchaseOrders.create({})).rejects.toThrow();
  });
});

describe("purchaseOrders.updateStatus", () => {
  it("blocks staff from updating purchase order status", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.purchaseOrders.updateStatus({ id: 1, status: "sent" })
    ).rejects.toThrow();
  });

  it("validates status enum values", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error testing invalid status
    await expect(caller.purchaseOrders.updateStatus({ id: 1, status: "invalid_status" })).rejects.toThrow();
  });
});

describe("purchaseOrders.lowStockParts", () => {
  it("allows admin to query low stock parts", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.purchaseOrders.lowStockParts().catch((e: any) => {
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return [];
      throw e;
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows staff to query low stock parts", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.purchaseOrders.lowStockParts().catch((e: any) => {
      if (e.message?.includes("database") || e.message?.includes("ECONNREFUSED")) return [];
      throw e;
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
