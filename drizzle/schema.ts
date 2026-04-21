import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  /** Username for custom login (admin-created accounts) */
  username: varchar("username", { length: 64 }).unique(),
  /** bcrypt hash of the user's password */
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** Whether the account is active; admins can deactivate users */
  isActive: boolean("isActive").default(true).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  notes: text("notes"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Drivers ──────────────────────────────────────────────────────────────────
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  licenseNumber: varchar("licenseNumber", { length: 50 }),
  licenseExpiry: date("licenseExpiry"),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active").notNull(),
  notes: text("notes"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// ─── Trucks ───────────────────────────────────────────────────────────────────
export const trucks = mysqlTable("trucks", {
  id: int("id").autoincrement().primaryKey(),
  truckCode: varchar("truckCode", { length: 50 }).notNull().unique(),
  plateNumber: varchar("plateNumber", { length: 30 }).notNull(),
  vin: varchar("vin", { length: 50 }),
  engineNumber: varchar("engineNumber", { length: 50 }),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  year: int("year"),
  color: varchar("color", { length: 50 }),
  mileage: int("mileage").default(0),
  fuelType: mysqlEnum("fuelType", ["diesel", "petrol", "electric", "hybrid"]).default("diesel"),
  purchaseDate: date("purchaseDate"),
  status: mysqlEnum("status", ["active", "under_maintenance", "inactive"]).default("active").notNull(),
  assignedDriverId: int("assignedDriverId"),
  insuranceExpiry: date("insuranceExpiry"),
  roadworthinessExpiry: date("roadworthinessExpiry"),
  /** Fuel efficiency in km per litre at standard load (used for trip estimation) */
  fuelEfficiencyKmL: decimal("fuelEfficiencyKmL", { precision: 6, scale: 2 }),
  /** Load capacity in tonnes */
  loadCapacityTons: decimal("loadCapacityTons", { precision: 8, scale: 2 }),
  /** Rolling average km/L computed from actual trip records */
  avgFuelEfficiencyKmL: decimal("avgFuelEfficiencyKmL", { precision: 6, scale: 2 }),
  /** Total trips used to compute the rolling average */
  fuelEfficiencySampleCount: int("fuelEfficiencySampleCount").default(0),
  notes: text("notes"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = typeof trucks.$inferInsert;

// ─── Parts (Catalogue only — no stock quantity stored here) ──────────────────
export const parts = mysqlTable("parts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  partNumber: varchar("partNumber", { length: 100 }),
  categoryId: int("categoryId"),
  compatibleModel: varchar("compatibleModel", { length: 200 }),
  /** Unit of measure, e.g. "piece", "litre", "set" */
  unitType: varchar("unitType", { length: 50 }).default("piece"),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  minimumStockLevel: int("minimumStockLevel").default(5).notNull(),
  reorderLevel: int("reorderLevel").default(10).notNull(),
  storageLocation: varchar("storageLocation", { length: 100 }),
  description: text("description"),
  notes: text("notes"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Part = typeof parts.$inferSelect;
export type InsertPart = typeof parts.$inferInsert;

// ─── Stock Receipts (Inventory / Stock-In) ────────────────────────────────────
// Records every time parts are received into stock from a supplier.
export const stockReceipts = mysqlTable("stock_receipts", {
  id: int("id").autoincrement().primaryKey(),
  partId: int("partId").notNull(),
  quantity: int("quantity").notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  supplierId: int("supplierId"),
  receiptDate: date("receiptDate").notNull(),
  purchaseReference: varchar("purchaseReference", { length: 100 }),
  notes: text("notes"),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockReceipt = typeof stockReceipts.$inferSelect;
export type InsertStockReceipt = typeof stockReceipts.$inferInsert;

// ─── Stock Issues (Stock Removal / Issue) ─────────────────────────────────────
// Records every time parts are taken out of stock, linked to a truck and driver.
export const stockIssues = mysqlTable("stock_issues", {
  id: int("id").autoincrement().primaryKey(),
  partId: int("partId").notNull(),
  quantity: int("quantity").notNull(),
  truckId: int("truckId").notNull(),
  driverId: int("driverId"),
  issueDate: date("issueDate").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockIssue = typeof stockIssues.$inferSelect;
export type InsertStockIssue = typeof stockIssues.$inferInsert;

// ─── Inventory Transactions (legacy — kept for audit trail) ───────────────────
export const inventoryTransactions = mysqlTable("inventory_transactions", {
  id: int("id").autoincrement().primaryKey(),
  partId: int("partId").notNull(),
  transactionType: mysqlEnum("transactionType", ["stock_in", "stock_out", "maintenance_usage", "adjustment"]).notNull(),
  quantity: int("quantity").notNull(),
  previousQuantity: int("previousQuantity").notNull(),
  newQuantity: int("newQuantity").notNull(),
  referenceId: int("referenceId"),
  referenceType: varchar("referenceType", { length: 50 }),
  notes: text("notes"),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = typeof inventoryTransactions.$inferInsert;

// ─── Maintenance Records ──────────────────────────────────────────────────────
export const maintenanceRecords = mysqlTable("maintenance_records", {
  id: int("id").autoincrement().primaryKey(),
  truckId: int("truckId").notNull(),
  maintenanceDate: date("maintenanceDate").notNull(),
  serviceType: mysqlEnum("serviceType", [
    "oil_change",
    "tire_replacement",
    "brake_service",
    "engine_repair",
    "electrical_repair",
    "suspension_work",
    "gearbox_service",
    "body_repair",
    "general_servicing",
    "other",
  ]).notNull(),
  issueReported: text("issueReported"),
  diagnosis: text("diagnosis"),
  workPerformed: text("workPerformed"),
  technicianName: varchar("technicianName", { length: 100 }),
  laborCost: decimal("laborCost", { precision: 10, scale: 2 }).default("0.00"),
  totalPartsCost: decimal("totalPartsCost", { precision: 10, scale: 2 }).default("0.00"),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).default("0.00"),
  mileageAtService: int("mileageAtService"),
  downtimeDuration: int("downtimeDuration"),
  nextServiceDate: date("nextServiceDate"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  notes: text("notes"),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = typeof maintenanceRecords.$inferInsert;

// ─── Maintenance Parts Used ───────────────────────────────────────────────────
export const maintenancePartsUsed = mysqlTable("maintenance_parts_used", {
  id: int("id").autoincrement().primaryKey(),
  maintenanceId: int("maintenanceId").notNull(),
  partId: int("partId").notNull(),
  quantity: int("quantity").notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenancePartUsed = typeof maintenancePartsUsed.$inferSelect;
export type InsertMaintenancePartUsed = typeof maintenancePartsUsed.$inferInsert;

// ─── Service Schedules ────────────────────────────────────────────────────────
export const serviceSchedules = mysqlTable("service_schedules", {
  id: int("id").autoincrement().primaryKey(),
  truckId: int("truckId").notNull(),
  serviceType: mysqlEnum("serviceType", [
    "oil_change",
    "tire_replacement",
    "brake_service",
    "engine_repair",
    "electrical_repair",
    "suspension_work",
    "gearbox_service",
    "body_repair",
    "general_servicing",
    "other",
  ]).notNull(),
  nextServiceDate: date("nextServiceDate").notNull(),
  nextServiceMileage: int("nextServiceMileage"),
  reminderStatus: mysqlEnum("reminderStatus", ["pending", "sent", "dismissed"]).default("pending").notNull(),
  notes: text("notes"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceSchedule = typeof serviceSchedules.$inferSelect;
export type InsertServiceSchedule = typeof serviceSchedules.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  supplierId: int("supplierId"),
  status: mysqlEnum("status", ["draft", "sent", "received", "cancelled"]).default("draft").notNull(),
  /** JSON array of line items: [{partId, partName, partNumber, quantity, unitCost, totalCost}] */
  items: text("items").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  notes: text("notes"),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

// ─── Trips ────────────────────────────────────────────────────────────────────
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  tripCode: varchar("tripCode", { length: 50 }).notNull().unique(),
  truckId: int("truckId").notNull(),
  driverId: int("driverId"),
  /** Container number e.g. MSCU1234567 */
  cargoType: varchar("cargoType", { length: 200 }),
  /** Container size: 20ft or 40ft */
  containerSize: mysqlEnum("containerSize", ["20ft", "40ft", "40ft_hc"]),
  cargoDescription: text("cargoDescription"),
  origin: varchar("origin", { length: 200 }).notNull(),
  destination: varchar("destination", { length: 200 }).notNull(),
  scheduledDeparture: timestamp("scheduledDeparture"),
  actualDeparture: timestamp("actualDeparture"),
  scheduledArrival: timestamp("scheduledArrival"),
  actualArrival: timestamp("actualArrival"),
  distanceKm: decimal("distanceKm", { precision: 10, scale: 2 }),
  /** Route estimation fields (populated from Maps API before dispatch) */
  estimatedDistanceKm: decimal("estimatedDistanceKm", { precision: 10, scale: 2 }),
  estimatedDurationMins: int("estimatedDurationMins"),
  estimatedFuelLitres: decimal("estimatedFuelLitres", { precision: 8, scale: 2 }),
  estimatedFuelCost: decimal("estimatedFuelCost", { precision: 10, scale: 2 }),
  /** Diesel price per litre used at time of estimation */
  dieselPricePerLitre: decimal("dieselPricePerLitre", { precision: 6, scale: 2 }),
  /** Actual fuel fields (recorded after trip completion) */
  actualFuelLitres: decimal("actualFuelLitres", { precision: 8, scale: 2 }),
  actualFuelCost: decimal("actualFuelCost", { precision: 10, scale: 2 }),
  revenueAmount: decimal("revenueAmount", { precision: 12, scale: 2 }).default("0.00"),
  fuelCost: decimal("fuelCost", { precision: 10, scale: 2 }).default("0.00"),
  otherExpenses: decimal("otherExpenses", { precision: 10, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", ["scheduled", "loading", "in_transit", "delivered", "completed", "cancelled"]).default("scheduled").notNull(),
  clientName: varchar("clientName", { length: 200 }),
  notes: text("notes"),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;
