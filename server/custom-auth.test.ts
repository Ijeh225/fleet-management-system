/**
 * Custom Auth & User Management Tests
 * Tests the username/password login flow, user creation, update, reset password, and delete.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAdminCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "local:admin",
    username: "admin",
    passwordHash: null,
    name: "Admin User",
    email: "admin@fleet.com",
    loginMethod: "local",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function makeStaffCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "local:staff",
    username: "staff",
    passwordHash: null,
    name: "Staff User",
    email: "staff@fleet.com",
    loginMethod: "local",
    role: "user",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Login Procedure Tests ────────────────────────────────────────────────────

describe("auth.login", () => {
  it("rejects login with empty username", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.auth.login({ username: "", password: "password123" })
    ).rejects.toThrow();
  });

  it("rejects login with empty password", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.auth.login({ username: "admin", password: "" })
    ).rejects.toThrow();
  });

  it("rejects login for non-existent user", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.auth.login({ username: "nonexistent_xyz_999", password: "password123" })
    ).rejects.toThrow(/Invalid username or password/);
  });
});

// ─── User Creation Validation Tests ──────────────────────────────────────────

describe("users.create — input validation", () => {
  it("rejects username shorter than 3 characters", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.users.create({ username: "ab", password: "password123", name: "Test", role: "user" })
    ).rejects.toThrow();
  });

  it("rejects username with invalid characters", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.users.create({ username: "user name!", password: "password123", name: "Test", role: "user" })
    ).rejects.toThrow();
  });

  it("rejects password shorter than 6 characters", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.users.create({ username: "validuser", password: "abc", name: "Test", role: "user" })
    ).rejects.toThrow();
  });

  it("rejects empty name", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.users.create({ username: "validuser", password: "password123", name: "", role: "user" })
    ).rejects.toThrow();
  });

  it("rejects invalid email format", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.users.create({ username: "validuser", password: "password123", name: "Test", email: "not-an-email", role: "user" })
    ).rejects.toThrow();
  });

  it("blocks staff from creating users", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(
      caller.users.create({ username: "newuser", password: "password123", name: "New User", role: "user" })
    ).rejects.toThrow(/Admin access required/);
  });

  it("blocks anonymous from creating users", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.users.create({ username: "newuser", password: "password123", name: "New User", role: "user" })
    ).rejects.toThrow();
  });
});

// ─── Reset Password Validation Tests ─────────────────────────────────────────

describe("users.resetPassword — input validation", () => {
  it("rejects password shorter than 6 characters", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.users.resetPassword({ userId: 999, newPassword: "abc" })
    ).rejects.toThrow();
  });

  it("blocks staff from resetting passwords", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(
      caller.users.resetPassword({ userId: 999, newPassword: "newpassword123" })
    ).rejects.toThrow(/Admin access required/);
  });
});

// ─── Delete User Tests ────────────────────────────────────────────────────────

describe("users.delete", () => {
  it("prevents admin from deleting their own account", async () => {
    const caller = appRouter.createCaller(makeAdminCtx({ id: 1 }));
    await expect(
      caller.users.delete({ userId: 1 })
    ).rejects.toThrow(/cannot delete your own account/);
  });

  it("blocks staff from deleting users", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(
      caller.users.delete({ userId: 999 })
    ).rejects.toThrow(/Admin access required/);
  });
});

// ─── Update User Tests ────────────────────────────────────────────────────────

describe("users.update", () => {
  it("blocks staff from updating users", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(
      caller.users.update({ userId: 999, name: "New Name" })
    ).rejects.toThrow(/Admin access required/);
  });

  it("rejects invalid email in update", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.users.update({ userId: 999, email: "not-an-email" })
    ).rejects.toThrow();
  });
});

// ─── Role-Based Access: Staff Permissions ─────────────────────────────────────

describe("staff role permissions", () => {
  it("staff can view trucks", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(caller.trucks.list()).resolves.toBeDefined();
  });

  it("staff can view parts", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(caller.parts.list()).resolves.toBeDefined();
  });

  it("staff can view maintenance records", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(caller.maintenance.list()).resolves.toBeDefined();
  });

  it("staff cannot list users", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(caller.users.list()).rejects.toThrow(/Admin access required/);
  });

  it("staff cannot create categories", async () => {
    const caller = appRouter.createCaller(makeStaffCtx());
    await expect(caller.categories.create({ name: "Test" })).rejects.toThrow(/Admin access required/);
  });
});

// ─── Role-Based Access: Admin Permissions ─────────────────────────────────────

describe("admin role permissions", () => {
  it("admin can list users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.users.list()).resolves.toBeDefined();
  });

  it("admin can view trucks", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.trucks.list()).resolves.toBeDefined();
  });

  it("admin can view reports", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.reports.costPerTruck()).resolves.toBeDefined();
  });
});
