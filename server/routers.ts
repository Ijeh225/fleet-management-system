import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { makeRequest, DirectionsResult } from "./_core/map";
import * as db from "./db";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// ─── Shared Zod schemas ───────────────────────────────────────────────────────
const serviceTypeEnum = z.enum([
  "oil_change", "tire_replacement", "brake_service", "engine_repair",
  "electrical_repair", "suspension_work", "gearbox_service", "body_repair",
  "general_servicing", "other",
]);

export const appRouter = router({
  system: systemRouter,
  // ─── Auth ───────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    /** Custom username/password login — returns a session cookie */
    login: publicProcedure
      .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import("bcryptjs");
        const user = await db.getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        if (!user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Account is deactivated. Contact your administrator." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        // Sign a JWT that carries the local user ID
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.signSession(
          { openId: `local:${user.username}`, appId: "fleet", name: user.name ?? user.username ?? "", localUserId: user.id },
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        return { success: true, user: { id: user.id, name: user.name, role: user.role } };
      }),
  }),
  // ─── Users ───────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(() => db.getAllUsers()),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(({ input }) => db.updateUserRole(input.userId, input.role)),
    /** Admin creates a new local user with username + password */
    create: adminProcedure
      .input(z.object({
        username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        name: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        const bcrypt = await import("bcryptjs");
        // Check username uniqueness
        const existing = await db.getUserByUsername(input.username);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });
        const passwordHash = await bcrypt.hash(input.password, 12);
        return db.createLocalUser({
          username: input.username,
          passwordHash,
          name: input.name,
          email: input.email || undefined,
          role: input.role,
        });
      }),
    /** Admin updates a user's name, email, role, or active status */
    update: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal("")),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input: { userId, ...data } }) => db.updateLocalUser(userId, data)),
    /** Admin resets a user's password */
    resetPassword: adminProcedure
      .input(z.object({ userId: z.number(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateLocalUser(input.userId, { passwordHash });
        return { success: true };
      }),
    /** Admin deletes a user (cannot delete yourself) */
    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ input, ctx }) => {
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
        }
        return db.deleteLocalUser(input.userId);
      }),
  }),
  // ─── Categories ────────────────────────────────────────────────────────────
  categories: router({
    list: protectedProcedure.query(() => db.getAllCategories()),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(({ input }) => db.createCategory(input)),
  }),

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  suppliers: router({
    list: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }).optional())
      .query(({ input }) => db.getAllSuppliers(input?.includeArchived)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getSupplierById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createSupplier(input)),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => db.updateSupplier(id, data)),
    archive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.archiveSupplier(input.id)),
  }),

  // ─── Drivers ───────────────────────────────────────────────────────────────
  drivers: router({
    list: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }).optional())
      .query(({ input }) => db.getAllDrivers(input?.includeArchived)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getDriverById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
        licenseExpiry: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createDriver(input as any);
        const insertId = (result as any)[0]?.insertId as number | undefined;
        await db.logAudit({ userId: ctx.user.id, userName: ctx.user.name, action: "CREATE", entityType: "driver", entityId: insertId ?? null, details: JSON.stringify({ name: input.name }) });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
        licenseExpiry: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => db.updateDriver(id, data as any)),
    archive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.archiveDriver(input.id)),
    bulkImport: adminProcedure
      .input(z.object({
        rows: z.array(z.object({
          name: z.string().min(1),
          licenseNumber: z.string().optional(),
          licenseExpiry: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          address: z.string().optional(),
          status: z.enum(["active", "inactive", "on_leave"]).optional(),
          notes: z.string().optional(),
        }))
      }))
      .mutation(async ({ input }) => {
        const results: { row: number; name: string; status: "imported" | "skipped"; reason?: string }[] = [];
        for (let i = 0; i < input.rows.length; i++) {
          const row = input.rows[i];
          try {
            // Skip duplicate license numbers (only if provided)
            if (row.licenseNumber) {
              const existing = await db.getDriverByLicense(row.licenseNumber);
              if (existing) {
                results.push({ row: i + 1, name: row.name, status: "skipped", reason: "License number already exists" });
                continue;
              }
            }
            await db.createDriver(row as any);
            results.push({ row: i + 1, name: row.name, status: "imported" });
          } catch (err: any) {
            results.push({ row: i + 1, name: row.name, status: "skipped", reason: err?.message ?? "Unknown error" });
          }
        }
        const imported = results.filter(r => r.status === "imported").length;
        const skipped = results.filter(r => r.status === "skipped").length;
        return { imported, skipped, results };
      }),
  }),

  // ─── Trucks ────────────────────────────────────────────────────────────────
  trucks: router({
    list: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }).optional())
      .query(({ input }) => db.getAllTrucks(input?.includeArchived)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTruckById(input.id)),
    create: protectedProcedure
      .input(z.object({
        truckCode: z.string().min(1),
        plateNumber: z.string().min(1),
        vin: z.string().optional(),
        engineNumber: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        color: z.string().optional(),
        mileage: z.number().optional(),
        fuelType: z.enum(["diesel", "petrol", "electric", "hybrid"]).optional(),
        purchaseDate: z.string().optional(),
        status: z.enum(["active", "under_maintenance", "inactive"]).optional(),
        assignedDriverId: z.number().optional(),
        // audit logging added below
        insuranceExpiry: z.string().optional(),
        roadworthinessExpiry: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createTruck(input as any);
        const insertId = (result as any)[0]?.insertId as number | undefined;
        await db.logAudit({ userId: ctx.user.id, userName: ctx.user.name, action: "CREATE", entityType: "truck", entityId: insertId ?? null, details: JSON.stringify({ truckCode: input.truckCode, plateNumber: input.plateNumber }) });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        truckCode: z.string().min(1).optional(),
        plateNumber: z.string().min(1).optional(),
        vin: z.string().optional(),
        engineNumber: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        color: z.string().optional(),
        mileage: z.number().optional(),
        fuelType: z.enum(["diesel", "petrol", "electric", "hybrid"]).optional(),
        purchaseDate: z.string().optional(),
        status: z.enum(["active", "under_maintenance", "inactive"]).optional(),
        assignedDriverId: z.number().nullable().optional(),
        insuranceExpiry: z.string().optional(),
        roadworthinessExpiry: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => db.updateTruck(id, data as any)),
    archive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.archiveTruck(input.id)),
    bulkImport: adminProcedure
      .input(z.object({
        rows: z.array(z.object({
          truckCode: z.string().min(1),
          plateNumber: z.string().min(1),
          brand: z.string().optional(),
          model: z.string().optional(),
          year: z.number().optional(),
          color: z.string().optional(),
          vin: z.string().optional(),
          engineNumber: z.string().optional(),
          mileage: z.number().optional(),
          fuelType: z.enum(["diesel", "petrol", "electric", "hybrid"]).optional(),
          status: z.enum(["active", "under_maintenance", "inactive"]).optional(),
          notes: z.string().optional(),
        }))
      }))
      .mutation(async ({ input }) => {
        const results: { row: number; plateNumber: string; status: "imported" | "skipped"; reason?: string }[] = [];
        for (let i = 0; i < input.rows.length; i++) {
          const row = input.rows[i];
          try {
            // Check for duplicate plate number
            const existing = await db.getTruckByPlate(row.plateNumber);
            if (existing) {
              results.push({ row: i + 1, plateNumber: row.plateNumber, status: "skipped", reason: "Plate number already exists" });
              continue;
            }
            await db.createTruck(row as any);
            results.push({ row: i + 1, plateNumber: row.plateNumber, status: "imported" });
          } catch (err: any) {
            results.push({ row: i + 1, plateNumber: row.plateNumber, status: "skipped", reason: err?.message ?? "Unknown error" });
          }
        }
        const imported = results.filter(r => r.status === "imported").length;
        const skipped = results.filter(r => r.status === "skipped").length;
        return { imported, skipped, results };
      }),
    maintenanceHistory: protectedProcedure
      .input(z.object({ truckId: z.number() }))
      .query(({ input }) => db.getMaintenanceRecords(input.truckId)),
    serviceSchedules: protectedProcedure
      .input(z.object({ truckId: z.number() }))
      .query(({ input }) => db.getServiceSchedules(input.truckId)),
  }),

  // ─── Parts (Catalogue) ─────────────────────────────────────────────────────
  parts: router({
    list: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }).optional())
      .query(({ input }) => db.getAllParts(input?.includeArchived)),
    listWithBalance: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }).optional())
      .query(({ input }) => db.getAllPartsWithBalance(input?.includeArchived)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getPartById(input.id)),
    balance: protectedProcedure
      .input(z.object({ partId: z.number() }))
      .query(({ input }) => db.getPartStockBalance(input.partId)),
    lowStock: protectedProcedure.query(() => db.getLowStockParts()),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        partNumber: z.string().optional(),
        categoryId: z.number().optional(),
        compatibleModel: z.string().optional(),
        unitType: z.string().optional(),
        unitCost: z.string().optional(),
        minimumStockLevel: z.number().optional(),
        reorderLevel: z.number().optional(),
        storageLocation: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createPart(input as any)),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        partNumber: z.string().optional(),
        categoryId: z.number().optional(),
        compatibleModel: z.string().optional(),
        unitType: z.string().optional(),
        unitCost: z.string().optional(),
        minimumStockLevel: z.number().optional(),
        reorderLevel: z.number().optional(),
        storageLocation: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => db.updatePart(id, data as any)),
    archive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.archivePart(input.id)),
  }),

  // ─── Inventory / Stock Receipts (Stock-In) ──────────────────────────────────
  inventory: router({
    list: protectedProcedure
      .input(z.object({ partId: z.number().optional() }).optional())
      .query(({ input }) => db.getStockReceipts(input?.partId)),
    create: protectedProcedure
      .input(z.object({
        partId: z.number(),
        quantity: z.number().positive(),
        unitCost: z.string().optional(),
        supplierId: z.number().optional(),
        receiptDate: z.string(),
        purchaseReference: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input, ctx }) =>
        db.createStockReceipt({ ...input as any, createdById: ctx.user.id })
      ),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteStockReceipt(input.id)),
  }),

  // ─── Stock Issues (Stock Removal) ───────────────────────────────────────────
  stockIssues: router({
    list: protectedProcedure
      .input(z.object({
        partId: z.number().optional(),
        truckId: z.number().optional(),
        driverId: z.number().optional(),
      }).optional())
      .query(({ input }) => db.getStockIssues(input)),
    create: protectedProcedure
      .input(z.object({
        partId: z.number(),
        quantity: z.number().positive(),
        truckId: z.number(),
        driverId: z.number().optional(),
        issueDate: z.string(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createStockIssue({ ...input as any, createdById: ctx.user.id });
        const insertId = (result as any)[0]?.insertId as number | undefined;
        await db.logAudit({ userId: ctx.user.id, userName: ctx.user.name, action: "ISSUE_PARTS", entityType: "stock_issue", entityId: insertId ?? null, details: JSON.stringify({ partId: input.partId, quantity: input.quantity, truckId: input.truckId }) });
        return result;
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteStockIssue(input.id)),
  }),

  // ─── Maintenance ───────────────────────────────────────────────────────────
  maintenance: router({
    list: protectedProcedure
      .input(z.object({ truckId: z.number().optional() }).optional())
      .query(({ input }) => db.getMaintenanceRecords(input?.truckId)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getMaintenanceById(input.id)),
    getParts: protectedProcedure
      .input(z.object({ maintenanceId: z.number() }))
      .query(({ input }) => db.getMaintenancePartsUsed(input.maintenanceId)),
    create: protectedProcedure
      .input(z.object({
        truckId: z.number(),
        maintenanceDate: z.string(),
        serviceType: serviceTypeEnum,
        issueReported: z.string().optional(),
        diagnosis: z.string().optional(),
        workPerformed: z.string().optional(),
        technicianName: z.string().optional(),
        laborCost: z.string().optional(),
        mileageAtService: z.number().optional(),
        downtimeDuration: z.number().optional(),
        nextServiceDate: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        notes: z.string().optional(),
        partsUsed: z.array(z.object({
          partId: z.number(),
          quantity: z.number().positive(),
          unitCost: z.number(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { partsUsed, ...data } = input;
        const maintenanceId = await db.createMaintenanceRecord(
          { ...data as any, createdById: ctx.user.id },
          partsUsed ?? []
        );
        await db.logAudit({ userId: ctx.user.id, userName: ctx.user.name, action: "CREATE", entityType: "maintenance", entityId: maintenanceId ?? null, details: JSON.stringify({ truckId: input.truckId, serviceType: input.serviceType }) });
        return maintenanceId;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        technicianName: z.string().optional(),
        diagnosis: z.string().optional(),
        workPerformed: z.string().optional(),
        laborCost: z.string().optional(),
        nextServiceDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => db.updateMaintenanceRecord(id, data as any)),
  }),

  // ─── Service Schedules ─────────────────────────────────────────────────────
  schedules: router({
    list: protectedProcedure
      .input(z.object({ truckId: z.number().optional() }).optional())
      .query(({ input }) => db.getServiceSchedules(input?.truckId)),
    listAll: protectedProcedure.query(() => db.getAllServiceSchedules()),
    create: protectedProcedure
      .input(z.object({
        truckId: z.number(),
        serviceType: serviceTypeEnum,
        nextServiceDate: z.string(),
        nextServiceMileage: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createServiceSchedule(input as any)),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        serviceType: serviceTypeEnum.optional(),
        nextServiceDate: z.string().optional(),
        nextServiceMileage: z.number().optional(),
        reminderStatus: z.enum(["pending", "sent", "dismissed"]).optional(),
        isCompleted: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => db.updateServiceSchedule(id, data as any)),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteServiceSchedule(input.id)),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: router({
    summary: protectedProcedure.query(() => db.getDashboardSummary()),
  }),

  // ─── Reports ───────────────────────────────────────────────────────────────
  reports: router({
    costPerTruck: protectedProcedure.query(() => db.getMaintenanceCostPerTruck()),
    monthlyExpenses: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(({ input }) => db.getMonthlyMaintenanceExpenses(input.year)),
    partsUsage: protectedProcedure.query(() => db.getPartsUsageReport()),
    serviceDue: protectedProcedure.query(() => db.getServiceDueReport()),
    stockStatus: protectedProcedure.query(() => db.getAllPartsWithBalance()),
    fuelEfficiency: protectedProcedure.query(() => db.getFuelEfficiencyReport()),
  }),
  // ─── Audit Trail ──────────────────────────────────────────────────────────────
  audit: router({
    list: adminProcedure
      .input(z.object({
        entityType: z.string().optional(),
        userId: z.number().optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      }))
      .query(({ input }) => db.getAuditLogs(input)),
  }),
  // ─── Purchase Orders ──────────────────────────────────────────────────────────
  purchaseOrders: router({
    lowStockParts: protectedProcedure.query(() => db.getLowStockPartsForReorder()),
    list: protectedProcedure.query(() => db.getAllPurchaseOrders()),
    create: adminProcedure
      .input(z.object({
        supplierId: z.number().optional(),
        items: z.array(z.object({
          partId: z.number(),
          partName: z.string(),
          partNumber: z.string().optional(),
          quantity: z.number().min(1),
          unitCost: z.string().optional(),
          totalCost: z.number().optional(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createPurchaseOrder({ ...input, createdById: ctx.user.id });
        await db.logAudit({ userId: ctx.user.id, userName: ctx.user.name, action: "CREATE", entityType: "purchase_order", entityId: result.id, details: JSON.stringify({ itemCount: input.items.length }) });
        return result;
      }),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "received", "cancelled"]),
      }))
      .mutation(({ input }) => db.updatePurchaseOrderStatus(input.id, input.status)),
  }),

  // ─── Trips / Fleet Operations ─────────────────────────────────────────────────────────
  trips: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        truckId: z.number().optional(),
        driverId: z.number().optional(),
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(({ input }) => db.getAllTrips(input ?? {})),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTripById(input.id)),
    stats: protectedProcedure.query(() => db.getTripStats()),
    fleetAvailability: protectedProcedure.query(() => db.getFleetAvailability()),
    create: protectedProcedure
      .input(z.object({
        truckId: z.number(),
        driverId: z.number().optional(),
        cargoType: z.string().optional(),
        cargoDescription: z.string().optional(),
        containerSize: z.enum(["20ft", "40ft", "40ft_hc"]).optional(),
        origin: z.string().min(1),
        destination: z.string().min(1),
        scheduledDeparture: z.string().optional(),
        scheduledArrival: z.string().optional(),
        distanceKm: z.number().optional(),
        revenueAmount: z.number().optional(),
        fuelCost: z.number().optional(),
        otherExpenses: z.number().optional(),
        clientName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createTrip({
          ...input,
          scheduledDeparture: input.scheduledDeparture ? new Date(input.scheduledDeparture) : null,
          scheduledArrival: input.scheduledArrival ? new Date(input.scheduledArrival) : null,
          createdById: ctx.user.id,
        });
        await db.logAudit({ userId: ctx.user.id, userName: ctx.user.name, action: "CREATE", entityType: "trip", entityId: result.id, details: JSON.stringify({ origin: input.origin, destination: input.destination, truckId: input.truckId }) });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        truckId: z.number().optional(),
        driverId: z.number().nullable().optional(),
        cargoType: z.string().optional(),
        cargoDescription: z.string().optional(),
        containerSize: z.enum(["20ft", "40ft", "40ft_hc"]).nullable().optional(),
        origin: z.string().optional(),
        destination: z.string().optional(),
        scheduledDeparture: z.string().nullable().optional(),
        actualDeparture: z.string().nullable().optional(),
        scheduledArrival: z.string().nullable().optional(),
        actualArrival: z.string().nullable().optional(),
        distanceKm: z.number().nullable().optional(),
        revenueAmount: z.number().optional(),
        fuelCost: z.number().optional(),
        otherExpenses: z.number().optional(),
        clientName: z.string().optional(),
        status: z.enum(["scheduled","loading","in_transit","delivered","completed","cancelled"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateTrip(id, {
          ...data,
          scheduledDeparture: data.scheduledDeparture ? new Date(data.scheduledDeparture) : data.scheduledDeparture === null ? null : undefined,
          actualDeparture: data.actualDeparture ? new Date(data.actualDeparture) : data.actualDeparture === null ? null : undefined,
          scheduledArrival: data.scheduledArrival ? new Date(data.scheduledArrival) : data.scheduledArrival === null ? null : undefined,
          actualArrival: data.actualArrival ? new Date(data.actualArrival) : data.actualArrival === null ? null : undefined,
        });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["scheduled","loading","in_transit","delivered","completed","cancelled"]),
        actualDeparture: z.string().optional(),
        actualArrival: z.string().optional(),
      }))
      .mutation(({ input }) =>
        db.updateTripStatus(input.id, input.status, {
          actualDeparture: input.actualDeparture ? new Date(input.actualDeparture) : undefined,
          actualArrival: input.actualArrival ? new Date(input.actualArrival) : undefined,
        })
      ),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteTrip(input.id)),

    /** Estimate route distance, duration, and diesel cost before dispatching a trip */
    estimateRoute: protectedProcedure
      .input(z.object({
        origin: z.string().min(1),
        destination: z.string().min(1),
        truckId: z.number(),
        loadCondition: z.enum(["empty", "half", "full"]).default("half"),
        dieselPricePerLitre: z.number().min(0).default(1.20),
      }))
      .mutation(async ({ input }) => {
        // 1. Fetch route from Google Maps Directions API
        const directionsResult = await makeRequest<DirectionsResult>(
          "/maps/api/directions/json",
          {
            origin: input.origin,
            destination: input.destination,
            mode: "driving",
          }
        );

        if (directionsResult.status !== "OK" || !directionsResult.routes.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Could not calculate route: ${directionsResult.status}. Please check the origin and destination names.`,
          });
        }

        const leg = directionsResult.routes[0].legs[0];
        const distanceMeters = leg.distance.value;
        const durationSeconds = leg.duration.value;
        const distanceKm = distanceMeters / 1000;
        const durationMins = Math.round(durationSeconds / 60);

        // 2. Fetch truck fuel efficiency profile
        const truck = await db.getTruckById(input.truckId);
        if (!truck) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Truck not found" });
        }

        // Use rolling average if available, otherwise use base efficiency, otherwise default to 3.5 km/L (typical Mack)
        const baseEfficiency = parseFloat(truck.avgFuelEfficiencyKmL ?? truck.fuelEfficiencyKmL ?? "3.5");

        // Load factor adjustments: empty=1.0, half load=1.15, full load=1.30
        const loadFactorMap: Record<string, number> = { empty: 1.0, half: 1.15, full: 1.30 };
        const loadFactor = loadFactorMap[input.loadCondition];

        // Effective consumption = distance / (efficiency / loadFactor)
        const effectiveEfficiency = baseEfficiency / loadFactor;
        const estimatedFuelLitres = distanceKm / effectiveEfficiency;
        const estimatedFuelCost = estimatedFuelLitres * input.dieselPricePerLitre;

        return {
          distanceKm: Math.round(distanceKm * 10) / 10,
          durationMins,
          durationText: leg.duration.text,
          distanceText: leg.distance.text,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          estimatedFuelLitres: Math.round(estimatedFuelLitres * 10) / 10,
          estimatedFuelCost: Math.round(estimatedFuelCost * 100) / 100,
          loadFactor,
          dieselPricePerLitre: input.dieselPricePerLitre,
          fuelEfficiencyUsed: Math.round(baseEfficiency * 100) / 100,
          sampleCount: truck.fuelEfficiencySampleCount ?? 0,
          usingRollingAverage: !!truck.avgFuelEfficiencyKmL,
        };
      }),

    /** Record actual fuel used after a trip and update the truck's rolling average efficiency */
    recordActualFuel: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        actualFuelLitres: z.number().min(0),
        actualFuelCost: z.number().min(0).optional(),
        dieselPricePerLitre: z.number().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const trip = await db.getTripById(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

        const actualFuelCost = input.actualFuelCost ??
          (input.dieselPricePerLitre ? input.actualFuelLitres * input.dieselPricePerLitre : 0);

        // Save actual fuel on the trip
        await db.updateTrip(input.tripId, {
          actualFuelLitres: input.actualFuelLitres,
          actualFuelCost,
          fuelCost: actualFuelCost,
        });

        // Update truck's rolling average fuel efficiency if we have distance
        const distanceKm = parseFloat(trip.distanceKm ?? trip.estimatedDistanceKm ?? "0");
        if (distanceKm > 0 && input.actualFuelLitres > 0) {
          const truck = await db.getTruckById(trip.truckId);
          if (truck) {
            const actualKmL = distanceKm / input.actualFuelLitres;
            const prevAvg = parseFloat(truck.avgFuelEfficiencyKmL ?? truck.fuelEfficiencyKmL ?? "3.5");
            const prevCount = truck.fuelEfficiencySampleCount ?? 0;
            // Weighted rolling average
            const newCount = prevCount + 1;
            const newAvg = (prevAvg * prevCount + actualKmL) / newCount;
            await db.updateTruckFuelEfficiency(truck.id, {
              avgFuelEfficiencyKmL: Math.round(newAvg * 100) / 100,
              fuelEfficiencySampleCount: newCount,
            });
          }
        }

        return { success: true, actualFuelCost };
      }),
  }),
});
export type AppRouter = typeof appRouter;
