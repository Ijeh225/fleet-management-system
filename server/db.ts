import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  auditLogs,
  categories,
  drivers,
  inventoryTransactions,
  maintenancePartsUsed,
  maintenanceRecords,
  parts,
  purchaseOrders,
  serviceSchedules,
  stockIssues,
  stockReceipts,
  suppliers,
  trips,
  trucks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(result[0]?.count ?? 0);
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  username: string;
  passwordHash: string;
  name: string;
  email?: string;
  role: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local:${data.username}`;
  await db.insert(users).values({
    openId,
    username: data.username,
    passwordHash: data.passwordHash,
    name: data.name,
    email: data.email ?? null,
    loginMethod: "local",
    role: data.role,
    isActive: true,
    lastSignedIn: new Date(),
  });
  const created = await getUserByUsername(data.username);
  return created!;
}

export async function updateLocalUser(userId: number, data: {
  name?: string;
  email?: string;
  role?: "user" | "admin";
  passwordHash?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.email !== undefined) set.email = data.email;
  if (data.role !== undefined) set.role = data.role;
  if (data.passwordHash !== undefined) set.passwordHash = data.passwordHash;
  if (data.isActive !== undefined) set.isActive = data.isActive;
  if (Object.keys(set).length > 0) {
    await db.update(users).set(set).where(eq(users.id, userId));
  }
  return getUserById(userId);
}

export async function deleteLocalUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(data: { name: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(categories).values(data);
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
export async function getAllSuppliers(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(suppliers);
  if (!includeArchived) return query.where(eq(suppliers.isArchived, false)).orderBy(suppliers.name);
  return query.orderBy(suppliers.name);
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0];
}

export async function createSupplier(data: typeof suppliers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(suppliers).values(data);
}

export async function updateSupplier(id: number, data: Partial<typeof suppliers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function archiveSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set({ isArchived: true }).where(eq(suppliers.id, id));
}

// ─── Drivers ──────────────────────────────────────────────────────────────────
export async function getAllDrivers(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(drivers);
  if (!includeArchived) return query.where(eq(drivers.isArchived, false)).orderBy(drivers.name);
  return query.orderBy(drivers.name);
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result[0];
}

export async function getDriverByLicense(licenseNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.licenseNumber, licenseNumber)).limit(1);
  return result[0];
}

export async function createDriver(data: typeof drivers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(drivers).values(data);
}

export async function updateDriver(id: number, data: Partial<typeof drivers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(drivers).set(data).where(eq(drivers.id, id));
}

export async function archiveDriver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(drivers).set({ isArchived: true }).where(eq(drivers.id, id));
}

// ─── Trucks ───────────────────────────────────────────────────────────────────
export async function getAllTrucks(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(trucks);
  if (!includeArchived) return query.where(eq(trucks.isArchived, false)).orderBy(trucks.truckCode);
  return query.orderBy(trucks.truckCode);
}

export async function getTruckById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trucks).where(eq(trucks.id, id)).limit(1);
  return result[0];
}

export async function getTruckByPlate(plateNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trucks).where(eq(trucks.plateNumber, plateNumber)).limit(1);
  return result[0];
}

export async function createTruck(data: typeof trucks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(trucks).values(data);
}

export async function updateTruck(id: number, data: Partial<typeof trucks.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trucks).set(data).where(eq(trucks.id, id));
}

export async function archiveTruck(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trucks).set({ isArchived: true, status: "inactive" }).where(eq(trucks.id, id));
}

// ─── Parts (Catalogue) ────────────────────────────────────────────────────────
export async function getAllParts(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(parts);
  if (!includeArchived) return query.where(eq(parts.isArchived, false)).orderBy(parts.name);
  return query.orderBy(parts.name);
}

export async function getPartById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(parts).where(eq(parts.id, id)).limit(1);
  return result[0];
}

export async function createPart(data: typeof parts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(parts).values(data);
}

export async function updatePart(id: number, data: Partial<typeof parts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(parts).set(data).where(eq(parts.id, id));
}

export async function archivePart(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(parts).set({ isArchived: true }).where(eq(parts.id, id));
}

// ─── Stock Balance (computed from receipts minus issues) ──────────────────────
/**
 * Compute the current stock balance for a single part.
 * Balance = SUM(stock_receipts.quantity) - SUM(stock_issues.quantity)
 */
export async function getPartStockBalance(partId: number): Promise<{ balance: number; totalReceived: number; totalIssued: number }> {
  const db = await getDb();
  if (!db) return { balance: 0, totalReceived: 0, totalIssued: 0 };
  const [receiptRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(quantity), 0)` })
    .from(stockReceipts)
    .where(eq(stockReceipts.partId, partId));
  const [issueRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(quantity), 0)` })
    .from(stockIssues)
    .where(eq(stockIssues.partId, partId));
  const totalReceived = Number(receiptRow?.total ?? 0);
  const totalIssued = Number(issueRow?.total ?? 0);
  return { balance: totalReceived - totalIssued, totalReceived, totalIssued };
}

/**
 * Returns all parts with their computed stock balance.
 */
export async function getAllPartsWithBalance(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  const allParts = await getAllParts(includeArchived);
  const result = await Promise.all(
    allParts.map(async (p) => {
      const balanceResult = await getPartStockBalance(p.id);
      return { ...p, quantityInStock: balanceResult.balance };
    })
  );
  return result;
}

/**
 * Returns parts whose computed balance is at or below minimum stock level.
 */
export async function getLowStockParts() {
  const all = await getAllPartsWithBalance(false);
  return all.filter((p) => p.quantityInStock <= p.minimumStockLevel);
}

// ─── Stock Receipts (Inventory / Stock-In) ────────────────────────────────────
export async function getStockReceipts(partId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (partId) {
    return db.select().from(stockReceipts)
      .where(eq(stockReceipts.partId, partId))
      .orderBy(desc(stockReceipts.receiptDate));
  }
  return db.select().from(stockReceipts).orderBy(desc(stockReceipts.receiptDate));
}

export async function createStockReceipt(data: typeof stockReceipts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(stockReceipts).values(data);
}

export async function deleteStockReceipt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(stockReceipts).where(eq(stockReceipts.id, id));
}

// ─── Stock Issues (Stock Removal / Issue) ─────────────────────────────────────
export async function getStockIssues(filters?: { partId?: number; truckId?: number; driverId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.partId) conditions.push(eq(stockIssues.partId, filters.partId));
  if (filters?.truckId) conditions.push(eq(stockIssues.truckId, filters.truckId));
  if (filters?.driverId) conditions.push(eq(stockIssues.driverId, filters.driverId));
  const query = db.select().from(stockIssues);
  if (conditions.length > 0) return query.where(and(...conditions)).orderBy(desc(stockIssues.issueDate));
  return query.orderBy(desc(stockIssues.issueDate));
}

export async function createStockIssue(data: typeof stockIssues.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Validate sufficient stock
  const balanceResult = await getPartStockBalance(data.partId);
  if (balanceResult.balance < data.quantity) {
    const part = await getPartById(data.partId);
    throw new Error(`Insufficient stock for "${part?.name ?? "part"}". Available: ${balanceResult.balance}, Requested: ${data.quantity}`);
  }
  return db.insert(stockIssues).values(data);
}

export async function deleteStockIssue(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(stockIssues).where(eq(stockIssues.id, id));
}

// ─── Legacy Inventory Transactions ───────────────────────────────────────────
export async function getInventoryTransactionsByPart(partId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryTransactions)
    .where(eq(inventoryTransactions.partId, partId))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(50);
}

export async function getRecentInventoryTransactions(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryTransactions)
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(limit);
}

// ─── Maintenance Records ──────────────────────────────────────────────────────
export async function getMaintenanceRecords(truckId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (truckId) {
    return db.select().from(maintenanceRecords)
      .where(eq(maintenanceRecords.truckId, truckId))
      .orderBy(desc(maintenanceRecords.maintenanceDate));
  }
  return db.select().from(maintenanceRecords).orderBy(desc(maintenanceRecords.maintenanceDate));
}

export async function getMaintenanceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id)).limit(1);
  return result[0];
}

export async function getMaintenancePartsUsed(maintenanceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenancePartsUsed).where(eq(maintenancePartsUsed.maintenanceId, maintenanceId));
}

export async function createMaintenanceRecord(
  data: typeof maintenanceRecords.$inferInsert,
  partsUsed: Array<{ partId: number; quantity: number; unitCost: number }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate stock for all parts first
  for (const pu of partsUsed) {
    const balanceResult = await getPartStockBalance(pu.partId);
    const part = await getPartById(pu.partId);
    if (!part) throw new Error(`Part ${pu.partId} not found`);
    if (balanceResult.balance < pu.quantity) {
      throw new Error(`Insufficient stock for part "${part.name}". Available: ${balanceResult.balance}, Requested: ${pu.quantity}`);
    }
  }

  // Calculate parts cost
  let totalPartsCost = 0;
  for (const pu of partsUsed) totalPartsCost += pu.quantity * pu.unitCost;
  const laborCost = parseFloat(String(data.laborCost ?? 0));
  const totalCost = laborCost + totalPartsCost;

  const insertData = {
    ...data,
    totalPartsCost: String(totalPartsCost.toFixed(2)),
    totalCost: String(totalCost.toFixed(2)),
  };

  const result = await db.insert(maintenanceRecords).values(insertData);
  const maintenanceId = (result as any)[0]?.insertId as number;

  // Insert parts used and create stock issues
  for (const pu of partsUsed) {
    const totalCostForPart = pu.quantity * pu.unitCost;
    await db.insert(maintenancePartsUsed).values({
      maintenanceId,
      partId: pu.partId,
      quantity: pu.quantity,
      unitCost: String(pu.unitCost),
      totalCost: String(totalCostForPart.toFixed(2)),
    });
    // Record as stock issue (linked to the truck from the maintenance record)
    if (data.truckId) {
      await db.insert(stockIssues).values({
        partId: pu.partId,
        quantity: pu.quantity,
        truckId: data.truckId,
        issueDate: data.maintenanceDate,
        reason: `Used in maintenance record #${maintenanceId}`,
        createdById: data.createdById,
      });
    }
  }

  return maintenanceId;
}

export async function updateMaintenanceRecord(id: number, data: Partial<typeof maintenanceRecords.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(maintenanceRecords).set(data).where(eq(maintenanceRecords.id, id));
}

// ─── Service Schedules ────────────────────────────────────────────────────────
export async function getServiceSchedules(truckId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (truckId) {
    return db.select().from(serviceSchedules)
      .where(and(eq(serviceSchedules.truckId, truckId), eq(serviceSchedules.isCompleted, false)))
      .orderBy(serviceSchedules.nextServiceDate);
  }
  return db.select().from(serviceSchedules)
    .where(eq(serviceSchedules.isCompleted, false))
    .orderBy(serviceSchedules.nextServiceDate);
}

export async function getAllServiceSchedules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceSchedules).orderBy(serviceSchedules.nextServiceDate);
}

export async function createServiceSchedule(data: typeof serviceSchedules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(serviceSchedules).values(data);
}

export async function updateServiceSchedule(id: number, data: Partial<typeof serviceSchedules.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(serviceSchedules).set(data).where(eq(serviceSchedules.id, id));
}

export async function deleteServiceSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(serviceSchedules).where(eq(serviceSchedules.id, id));
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export async function getDashboardSummary() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

  // Truck counts
  const allTrucks = await db.select().from(trucks).where(eq(trucks.isArchived, false));
  const totalTrucks = allTrucks.length;
  const activeTrucks = allTrucks.filter((t) => t.status === "active").length;
  const underMaintenanceTrucks = allTrucks.filter((t) => t.status === "under_maintenance").length;
  const inactiveTrucks = allTrucks.filter((t) => t.status === "inactive").length;

  // Parts counts — only count parts that have actually received stock (balance > 0)
  // This ensures the dashboard reflects real inventory, not just the catalogue
  const allPartsWithBalance = await getAllPartsWithBalance(false);
  const partsWithStock = allPartsWithBalance.filter((p) => p.quantityInStock > 0);
  const totalParts = partsWithStock.length; // only parts with stock received
  const lowStockParts = allPartsWithBalance.filter((p) => p.quantityInStock > 0 && p.quantityInStock <= p.minimumStockLevel).length;
  const outOfStockParts = allPartsWithBalance.filter((p) => p.quantityInStock === 0 && (p as any)._hasReceipts).length;

  // Maintenance this month
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];
  const endOfMonthStr = endOfMonth.toISOString().split("T")[0];
  const monthlyMaintenance = await db.select().from(maintenanceRecords).where(
    sql`${maintenanceRecords.maintenanceDate} >= ${startOfMonthStr} AND ${maintenanceRecords.maintenanceDate} <= ${endOfMonthStr}`
  );
  const maintenanceThisMonth = monthlyMaintenance.length;
  const maintenanceCostThisMonth = monthlyMaintenance.reduce((sum, m) => sum + parseFloat(String(m.totalCost ?? 0)), 0);

  // Service schedules
  const pendingSchedules = await db.select().from(serviceSchedules).where(eq(serviceSchedules.isCompleted, false));
  const overdueServices = pendingSchedules.filter((s) => {
    const d = s.nextServiceDate instanceof Date ? s.nextServiceDate.toISOString().split("T")[0] : String(s.nextServiceDate ?? "");
    return d < todayStr;
  }).length;
  const upcomingServices = pendingSchedules.filter((s) => {
    const d = s.nextServiceDate instanceof Date ? s.nextServiceDate.toISOString().split("T")[0] : String(s.nextServiceDate ?? "");
    return d >= todayStr && d <= sevenDaysStr;
  }).length;

  // Recent maintenance
  const recentMaintenance = await db.select().from(maintenanceRecords)
    .orderBy(desc(maintenanceRecords.createdAt))
    .limit(5);

  // Recent stock activity
  const recentReceipts = await db.select().from(stockReceipts).orderBy(desc(stockReceipts.createdAt)).limit(5);
  const recentIssues = await db.select().from(stockIssues).orderBy(desc(stockIssues.createdAt)).limit(5);

  return {
    totalTrucks, activeTrucks, underMaintenanceTrucks, inactiveTrucks,
    totalParts, lowStockParts, outOfStockParts,
    maintenanceThisMonth, maintenanceCostThisMonth,
    overdueServices, upcomingServices,
    recentMaintenance, recentReceipts, recentIssues,
  };
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export async function getMaintenanceCostPerTruck() {
  const db = await getDb();
  if (!db) return [];
  const allTrucks = await db.select().from(trucks).where(eq(trucks.isArchived, false));
  const results = [];
  for (const truck of allTrucks) {
    const records = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.truckId, truck.id));
    const totalCost = records.reduce((sum, r) => sum + parseFloat(String(r.totalCost ?? 0)), 0);
    const count = records.length;
    results.push({ truck, totalCost, count });
  }
  return results.sort((a, b) => b.totalCost - a.totalCost);
}

export async function getMonthlyMaintenanceExpenses(year: number) {
  const db = await getDb();
  if (!db) return [];
  const records = await db.select().from(maintenanceRecords).where(
    sql`${maintenanceRecords.maintenanceDate} >= ${`${year}-01-01`} AND ${maintenanceRecords.maintenanceDate} <= ${`${year}-12-31`}`
  );
  const monthly: Record<number, { month: number; totalCost: number; count: number }> = {};
  for (let m = 1; m <= 12; m++) monthly[m] = { month: m, totalCost: 0, count: 0 };
  for (const r of records) {
    const d = r.maintenanceDate instanceof Date ? r.maintenanceDate : new Date(r.maintenanceDate);
    const month = d.getMonth() + 1;
    monthly[month].totalCost += parseFloat(String(r.totalCost ?? 0));
    monthly[month].count += 1;
  }
  return Object.values(monthly);
}

export async function getPartsUsageReport() {
  const db = await getDb();
  if (!db) return [];
  const allParts = await db.select().from(parts).where(eq(parts.isArchived, false));
  const results = [];
  for (const part of allParts) {
    const issues = await db.select().from(stockIssues).where(eq(stockIssues.partId, part.id));
    const totalIssued = issues.reduce((sum, i) => sum + i.quantity, 0);
    const receipts = await db.select().from(stockReceipts).where(eq(stockReceipts.partId, part.id));
    const totalReceived = receipts.reduce((sum, r) => sum + r.quantity, 0);
    const balance = totalReceived - totalIssued;
    results.push({ part, totalIssued, totalReceived, balance, issueCount: issues.length });
  }
  return results.sort((a, b) => b.totalIssued - a.totalIssued);
}

export async function getServiceDueReport() {
  const db = await getDb();
  if (!db) return [];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const all = await db.select().from(serviceSchedules).where(eq(serviceSchedules.isCompleted, false)).orderBy(serviceSchedules.nextServiceDate);
  return all.filter((s) => {
    const d = s.nextServiceDate instanceof Date ? s.nextServiceDate.toISOString().split("T")[0] : String(s.nextServiceDate ?? "");
    return d <= thirtyDaysFromNow;
  });
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export async function logAudit(entry: {
  userId?: number | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details ? JSON.stringify({ ...JSON.parse(entry.details || "{}"), performedBy: entry.userName }) : JSON.stringify({ performedBy: entry.userName }),
    });
  } catch (e) {
    console.warn("[Audit] Failed to log audit entry:", e);
  }
}

export async function getAuditLogs(filters?: {
  entityType?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  const query = db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters?.limit ?? 100)
    .offset(filters?.offset ?? 0);
  return query;
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function getLowStockPartsForReorder() {
  const db = await getDb();
  if (!db) return [];
  const allParts = await db
    .select({
      id: parts.id,
      name: parts.name,
      partNumber: parts.partNumber,
      categoryId: parts.categoryId,
      unitCost: parts.unitCost,
      minimumStockLevel: parts.minimumStockLevel,
      reorderLevel: parts.reorderLevel,
      unitType: parts.unitType,
    })
    .from(parts)
    .where(eq(parts.isArchived, false));

  const results = [];
  for (const part of allParts) {
    const receipts = await db.select().from(stockReceipts).where(eq(stockReceipts.partId, part.id));
    const issues = await db.select().from(stockIssues).where(eq(stockIssues.partId, part.id));
    const totalReceived = receipts.reduce((s, r) => s + r.quantity, 0);
    const totalIssued = issues.reduce((s, i) => s + i.quantity, 0);
    const balance = totalReceived - totalIssued;
    if (balance <= (part.minimumStockLevel ?? 5)) {
      // Find the last supplier used for this part
      const lastReceipt = receipts.sort((a, b) => {
        const da = a.receiptDate instanceof Date ? a.receiptDate.getTime() : new Date(a.receiptDate ?? 0).getTime();
        const db2 = b.receiptDate instanceof Date ? b.receiptDate.getTime() : new Date(b.receiptDate ?? 0).getTime();
        return db2 - da;
      })[0];
      let supplierName: string | null = null;
      let supplierId: number | null = null;
      if (lastReceipt?.supplierId) {
        const sup = await db.select().from(suppliers).where(eq(suppliers.id, lastReceipt.supplierId)).limit(1);
        supplierName = sup[0]?.name ?? null;
        supplierId = lastReceipt.supplierId;
      }
      results.push({
        partId: part.id,
        partName: part.name,
        partNumber: part.partNumber,
        unitCost: part.unitCost,
        unitType: part.unitType,
        currentStock: balance,
        minimumStockLevel: part.minimumStockLevel,
        reorderLevel: part.reorderLevel,
        suggestedOrderQty: Math.max((part.reorderLevel ?? 10) - balance, 1),
        supplierId,
        supplierName,
      });
    }
  }
  return results;
}

export async function getAllPurchaseOrders() {
  const db = await getDb();
  if (!db) return [];
  const orders = await db
    .select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      supplierId: purchaseOrders.supplierId,
      status: purchaseOrders.status,
      items: purchaseOrders.items,
      totalAmount: purchaseOrders.totalAmount,
      notes: purchaseOrders.notes,
      createdById: purchaseOrders.createdById,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      supplierName: suppliers.name,
      createdByName: users.name,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(users, eq(purchaseOrders.createdById, users.id))
    .orderBy(desc(purchaseOrders.createdAt));
  return orders;
}

export async function createPurchaseOrder(data: {
  supplierId?: number | null;
  items: Array<{
    partId: number;
    partName: string;
    partNumber?: string | null;
    quantity: number;
    unitCost?: string | null;
    totalCost?: number;
  }>;
  notes?: string;
  createdById?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const orderNumber = `PO-${Date.now()}`;
  const totalAmount = data.items.reduce((sum, item) => {
    return sum + (item.totalCost ?? (parseFloat(item.unitCost ?? "0") * item.quantity));
  }, 0);
  await db.insert(purchaseOrders).values({
    orderNumber,
    supplierId: data.supplierId ?? null,
    status: "draft",
    items: JSON.stringify(data.items),
    totalAmount: totalAmount.toFixed(2),
    notes: data.notes ?? null,
    createdById: data.createdById ?? null,
  });
  const created = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderNumber, orderNumber)).limit(1);
  return created[0];
}

export async function updatePurchaseOrderStatus(id: number, status: "draft" | "sent" | "received" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrders).set({ status }).where(eq(purchaseOrders.id, id));
}

// ─── Trips ────────────────────────────────────────────────────────────────────

function generateTripCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `TRP-${ts}-${rand}`;
}

export async function getAllTrips(filters?: {
  status?: string;
  truckId?: number;
  driverId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      id: trips.id,
      tripCode: trips.tripCode,
      truckId: trips.truckId,
      truckCode: trucks.truckCode,
      plateNumber: trucks.plateNumber,
      driverId: trips.driverId,
      driverName: drivers.name,
      cargoType: trips.cargoType,
      cargoDescription: trips.cargoDescription,
      containerSize: trips.containerSize,
      origin: trips.origin,
      destination: trips.destination,
      scheduledDeparture: trips.scheduledDeparture,
      actualDeparture: trips.actualDeparture,
      scheduledArrival: trips.scheduledArrival,
      actualArrival: trips.actualArrival,
      distanceKm: trips.distanceKm,
      revenueAmount: trips.revenueAmount,
      fuelCost: trips.fuelCost,
      otherExpenses: trips.otherExpenses,
      status: trips.status,
      clientName: trips.clientName,
      notes: trips.notes,
      createdAt: trips.createdAt,
      updatedAt: trips.updatedAt,
    })
    .from(trips)
    .leftJoin(trucks, eq(trips.truckId, trucks.id))
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .orderBy(desc(trips.createdAt))
    .limit(filters?.limit ?? 100)
    .offset(filters?.offset ?? 0);

  return rows;
}

export async function getTripById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({
      id: trips.id,
      tripCode: trips.tripCode,
      truckId: trips.truckId,
      truckCode: trucks.truckCode,
      plateNumber: trucks.plateNumber,
      driverId: trips.driverId,
      driverName: drivers.name,
      cargoType: trips.cargoType,
      cargoDescription: trips.cargoDescription,
      origin: trips.origin,
      destination: trips.destination,
      scheduledDeparture: trips.scheduledDeparture,
      actualDeparture: trips.actualDeparture,
      scheduledArrival: trips.scheduledArrival,
      actualArrival: trips.actualArrival,
      distanceKm: trips.distanceKm,
      estimatedDistanceKm: trips.estimatedDistanceKm,
      estimatedDurationMins: trips.estimatedDurationMins,
      estimatedFuelLitres: trips.estimatedFuelLitres,
      estimatedFuelCost: trips.estimatedFuelCost,
      containerSize: trips.containerSize,
      dieselPricePerLitre: trips.dieselPricePerLitre,
      actualFuelLitres: trips.actualFuelLitres,
      actualFuelCost: trips.actualFuelCost,
      revenueAmount: trips.revenueAmount,
      fuelCost: trips.fuelCost,
      otherExpenses: trips.otherExpenses,
      status: trips.status,
      clientName: trips.clientName,
      notes: trips.notes,
      createdAt: trips.createdAt,
      updatedAt: trips.updatedAt,
    })
    .from(trips)
    .leftJoin(trucks, eq(trips.truckId, trucks.id))
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .where(eq(trips.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTrip(data: {
  truckId: number;
  driverId?: number | null;
  cargoType?: string;
  cargoDescription?: string;
  containerSize?: "20ft" | "40ft" | "40ft_hc" | null;
  origin: string;
  destination: string;
  scheduledDeparture?: Date | null;
  scheduledArrival?: Date | null;
  distanceKm?: number | null;
  revenueAmount?: number;
  fuelCost?: number;
  otherExpenses?: number;
  clientName?: string;
  notes?: string;
  createdById?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const tripCode = generateTripCode();
  await db.insert(trips).values({
    tripCode,
    truckId: data.truckId,
    driverId: data.driverId ?? null,
    cargoType: data.cargoType ?? null,
    cargoDescription: data.cargoDescription ?? null,
    containerSize: data.containerSize ?? null,
    origin: data.origin,
    destination: data.destination,
    scheduledDeparture: data.scheduledDeparture ?? null,
    scheduledArrival: data.scheduledArrival ?? null,
    distanceKm: data.distanceKm != null ? String(data.distanceKm) : null,
    revenueAmount: data.revenueAmount != null ? String(data.revenueAmount) : "0.00",
    fuelCost: data.fuelCost != null ? String(data.fuelCost) : "0.00",
    otherExpenses: data.otherExpenses != null ? String(data.otherExpenses) : "0.00",
    status: "scheduled",
    clientName: data.clientName ?? null,
    notes: data.notes ?? null,
    createdById: data.createdById ?? null,
  });
  const created = await db.select().from(trips).where(eq(trips.tripCode, tripCode)).limit(1);
  return created[0];
}

export async function updateTrip(
  id: number,
  data: {
    truckId?: number;
    driverId?: number | null;
    cargoType?: string;
    cargoDescription?: string;
    origin?: string;
    destination?: string;
    scheduledDeparture?: Date | null;
    actualDeparture?: Date | null;
    scheduledArrival?: Date | null;
    actualArrival?: Date | null;
    distanceKm?: number | null;
    estimatedDistanceKm?: number | null;
    estimatedDurationMins?: number | null;
    estimatedFuelLitres?: number | null;
    estimatedFuelCost?: number | null;
    containerSize?: "20ft" | "40ft" | "40ft_hc" | null;
    dieselPricePerLitre?: number | null;
    actualFuelLitres?: number | null;
    actualFuelCost?: number | null;
    revenueAmount?: number;
    fuelCost?: number;
    otherExpenses?: number;
    clientName?: string;
    status?: "scheduled" | "loading" | "in_transit" | "delivered" | "completed" | "cancelled";
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.truckId !== undefined) updateData.truckId = data.truckId;
  if (data.driverId !== undefined) updateData.driverId = data.driverId;
  if (data.cargoType !== undefined) updateData.cargoType = data.cargoType;
  if (data.cargoDescription !== undefined) updateData.cargoDescription = data.cargoDescription;
  if (data.origin !== undefined) updateData.origin = data.origin;
  if (data.destination !== undefined) updateData.destination = data.destination;
  if (data.scheduledDeparture !== undefined) updateData.scheduledDeparture = data.scheduledDeparture;
  if (data.actualDeparture !== undefined) updateData.actualDeparture = data.actualDeparture;
  if (data.scheduledArrival !== undefined) updateData.scheduledArrival = data.scheduledArrival;
  if (data.actualArrival !== undefined) updateData.actualArrival = data.actualArrival;
  if (data.distanceKm !== undefined) updateData.distanceKm = data.distanceKm != null ? String(data.distanceKm) : null;
  if (data.estimatedDistanceKm !== undefined) updateData.estimatedDistanceKm = data.estimatedDistanceKm != null ? String(data.estimatedDistanceKm) : null;
  if (data.estimatedDurationMins !== undefined) updateData.estimatedDurationMins = data.estimatedDurationMins;
  if (data.estimatedFuelLitres !== undefined) updateData.estimatedFuelLitres = data.estimatedFuelLitres != null ? String(data.estimatedFuelLitres) : null;
  if (data.estimatedFuelCost !== undefined) updateData.estimatedFuelCost = data.estimatedFuelCost != null ? String(data.estimatedFuelCost) : null;
  if (data.containerSize !== undefined) updateData.containerSize = data.containerSize;
  if (data.dieselPricePerLitre !== undefined) updateData.dieselPricePerLitre = data.dieselPricePerLitre != null ? String(data.dieselPricePerLitre) : null;
  if (data.actualFuelLitres !== undefined) updateData.actualFuelLitres = data.actualFuelLitres != null ? String(data.actualFuelLitres) : null;
  if (data.actualFuelCost !== undefined) updateData.actualFuelCost = data.actualFuelCost != null ? String(data.actualFuelCost) : null;
  if (data.revenueAmount !== undefined) updateData.revenueAmount = String(data.revenueAmount);
  if (data.fuelCost !== undefined) updateData.fuelCost = String(data.fuelCost);
  if (data.otherExpenses !== undefined) updateData.otherExpenses = String(data.otherExpenses);
  if (data.clientName !== undefined) updateData.clientName = data.clientName;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  await db.update(trips).set(updateData).where(eq(trips.id, id));
}

export async function updateTruckFuelEfficiency(
  id: number,
  data: { avgFuelEfficiencyKmL: number; fuelEfficiencySampleCount: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trucks).set({
    avgFuelEfficiencyKmL: String(data.avgFuelEfficiencyKmL),
    fuelEfficiencySampleCount: data.fuelEfficiencySampleCount,
  }).where(eq(trucks.id, id));
}

export async function updateTripStatus(
  id: number,
  status: "scheduled" | "loading" | "in_transit" | "delivered" | "completed" | "cancelled",
  timestamps?: { actualDeparture?: Date; actualArrival?: Date }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (timestamps?.actualDeparture) updateData.actualDeparture = timestamps.actualDeparture;
  if (timestamps?.actualArrival) updateData.actualArrival = timestamps.actualArrival;
  await db.update(trips).set(updateData).where(eq(trips.id, id));
}

export async function deleteTrip(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(trips).where(eq(trips.id, id));
}

export async function getTripStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allTrips = await db.select({
    status: trips.status,
    revenueAmount: trips.revenueAmount,
    fuelCost: trips.fuelCost,
    otherExpenses: trips.otherExpenses,
    distanceKm: trips.distanceKm,
  }).from(trips);

  const totalTrips = allTrips.length;
  const activeTrips = allTrips.filter(t => ["scheduled", "loading", "in_transit"].includes(t.status)).length;
  const completedTrips = allTrips.filter(t => t.status === "completed").length;
  const totalRevenue = allTrips.reduce((s, t) => s + parseFloat(t.revenueAmount ?? "0"), 0);
  const totalFuelCost = allTrips.reduce((s, t) => s + parseFloat(t.fuelCost ?? "0"), 0);
  const totalOtherExpenses = allTrips.reduce((s, t) => s + parseFloat(t.otherExpenses ?? "0"), 0);
  const totalDistance = allTrips.reduce((s, t) => s + parseFloat(t.distanceKm ?? "0"), 0);
  const netProfit = totalRevenue - totalFuelCost - totalOtherExpenses;

  return {
    totalTrips,
    activeTrips,
    completedTrips,
    totalRevenue,
    totalFuelCost,
    totalOtherExpenses,
    totalDistance,
    netProfit,
  };
}

export async function getFleetAvailability() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allTrucks = await db
    .select({
      id: trucks.id,
      truckCode: trucks.truckCode,
      plateNumber: trucks.plateNumber,
      brand: trucks.brand,
      model: trucks.model,
      status: trucks.status,
      driverName: drivers.name,
    })
    .from(trucks)
    .leftJoin(drivers, eq(trucks.assignedDriverId, drivers.id))
    .where(eq(trucks.isArchived, false));

  // Find active trips for each truck
  const activeTrips = await db
    .select({ truckId: trips.truckId, status: trips.status, destination: trips.destination })
    .from(trips)
    .where(sql`${trips.status} IN ('scheduled','loading','in_transit')`);

  const activeTripMap = new Map(activeTrips.map(t => [t.truckId, t]));

  return allTrucks.map(truck => {
    const activeTrip = activeTripMap.get(truck.id);
    let availability: "available" | "on_trip" | "under_maintenance" | "inactive" = "available";
    if (truck.status === "under_maintenance") availability = "under_maintenance";
    else if (truck.status === "inactive") availability = "inactive";
    else if (activeTrip) availability = "on_trip";
    return {
      ...truck,
      availability,
      activeTripStatus: activeTrip?.status ?? null,
      activeTripDestination: activeTrip?.destination ?? null,
    };
  });
}

// ─── Fuel Efficiency Report ───────────────────────────────────────────────────

/**
 * Returns all trips that have at least an estimated OR actual fuel figure,
 * plus a per-truck summary of base vs rolling-average efficiency.
 */
export async function getFuelEfficiencyReport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Trip-level rows: only trips that have estimation or actual data
  const tripRows = await db
    .select({
      id: trips.id,
      tripCode: trips.tripCode,
      truckCode: trucks.truckCode,
      plateNumber: trucks.plateNumber,
      driverName: drivers.name,
      origin: trips.origin,
      destination: trips.destination,
      distanceKm: trips.distanceKm,
      estimatedDistanceKm: trips.estimatedDistanceKm,
      estimatedFuelLitres: trips.estimatedFuelLitres,
      estimatedFuelCost: trips.estimatedFuelCost,
      actualFuelLitres: trips.actualFuelLitres,
      actualFuelCost: trips.actualFuelCost,
      status: trips.status,
      actualDeparture: trips.actualDeparture,
      scheduledDeparture: trips.scheduledDeparture,
      containerSize: trips.containerSize,
    })
    .from(trips)
    .leftJoin(trucks, eq(trips.truckId, trucks.id))
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .where(
      sql`(${trips.estimatedFuelLitres} IS NOT NULL OR ${trips.actualFuelLitres} IS NOT NULL)`
    )
    .orderBy(desc(trips.scheduledDeparture));

  // Per-truck efficiency summary
  const truckSummary = await db
    .select({
      id: trucks.id,
      truckCode: trucks.truckCode,
      plateNumber: trucks.plateNumber,
      brand: trucks.brand,
      model: trucks.model,
      baseFuelEfficiencyKmL: trucks.fuelEfficiencyKmL,
      avgFuelEfficiencyKmL: trucks.avgFuelEfficiencyKmL,
      fuelEfficiencySampleCount: trucks.fuelEfficiencySampleCount,
    })
    .from(trucks)
    .where(eq(trucks.isArchived, false))
    .orderBy(trucks.truckCode);

  return { trips: tripRows, truckSummary };
}
