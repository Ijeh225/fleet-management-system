/**
 * Seed script: inserts all Mack Truck parts into the database.
 * Run with: node seed-parts.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

// ── Connect ──────────────────────────────────────────────────────────────────
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// ── Fetch category IDs ────────────────────────────────────────────────────────
const [rows] = await connection.execute("SELECT id, name FROM categories");
const catMap = {};
for (const row of rows) {
  catMap[row.name] = row.id;
}
console.log("Categories loaded:", Object.keys(catMap).length);

// ── Parts data ────────────────────────────────────────────────────────────────
const parts = [
  // 1️⃣ Engine System
  { name: "Engine Block",            categoryId: catMap["Engine System"],        quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Cylinder Head",           categoryId: catMap["Engine System"],        quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Pistons",                 categoryId: catMap["Engine System"],        quantityInStock: 12, minimumStockLevel: 4,  reorderLevel: 8  },
  { name: "Piston Rings",            categoryId: catMap["Engine System"],        quantityInStock: 20, minimumStockLevel: 8,  reorderLevel: 16 },
  { name: "Connecting Rods",         categoryId: catMap["Engine System"],        quantityInStock: 12, minimumStockLevel: 4,  reorderLevel: 8  },
  { name: "Crankshaft",              categoryId: catMap["Engine System"],        quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Camshaft",                categoryId: catMap["Engine System"],        quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Timing Gear",             categoryId: catMap["Engine System"],        quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Oil Pump",                categoryId: catMap["Engine System"],        quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Oil Filter",              categoryId: catMap["Engine System"],        quantityInStock: 20, minimumStockLevel: 5,  reorderLevel: 10 },
  { name: "Fuel Injectors",          categoryId: catMap["Engine System"],        quantityInStock: 12, minimumStockLevel: 4,  reorderLevel: 8  },
  { name: "Fuel Pump",               categoryId: catMap["Engine System"],        quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Turbocharger",            categoryId: catMap["Engine System"],        quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Intercooler",             categoryId: catMap["Engine System"],        quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Intake Manifold",         categoryId: catMap["Engine System"],        quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Exhaust Manifold",        categoryId: catMap["Engine System"],        quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Engine Gasket Kit",       categoryId: catMap["Engine System"],        quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Engine Mount",            categoryId: catMap["Engine System"],        quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Flywheel",                categoryId: catMap["Engine System"],        quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },

  // 2️⃣ Cooling System
  { name: "Radiator",                categoryId: catMap["Cooling System"],       quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Radiator Cap",            categoryId: catMap["Cooling System"],       quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },
  { name: "Cooling Fan",             categoryId: catMap["Cooling System"],       quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Fan Clutch",              categoryId: catMap["Cooling System"],       quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Water Pump",              categoryId: catMap["Cooling System"],       quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Thermostat",              categoryId: catMap["Cooling System"],       quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },
  { name: "Coolant Reservoir",       categoryId: catMap["Cooling System"],       quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Radiator Hoses",          categoryId: catMap["Cooling System"],       quantityInStock: 10, minimumStockLevel: 4,  reorderLevel: 6  },
  { name: "Heater Core",             categoryId: catMap["Cooling System"],       quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Coolant Temperature Sensor", categoryId: catMap["Cooling System"],   quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },

  // 3️⃣ Fuel System
  { name: "Fuel Tank",               categoryId: catMap["Fuel System"],          quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Fuel Rail",               categoryId: catMap["Fuel System"],          quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Fuel Pressure Regulator", categoryId: catMap["Fuel System"],          quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Fuel Filter",             categoryId: catMap["Fuel System"],          quantityInStock: 15, minimumStockLevel: 5,  reorderLevel: 10 },
  { name: "Fuel Lines",              categoryId: catMap["Fuel System"],          quantityInStock: 10, minimumStockLevel: 4,  reorderLevel: 6  },
  { name: "Water Separator",         categoryId: catMap["Fuel System"],          quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },

  // 4️⃣ Air Intake System
  { name: "Air Filter",              categoryId: catMap["Air Intake System"],    quantityInStock: 20, minimumStockLevel: 5,  reorderLevel: 10 },
  { name: "Air Filter Housing",      categoryId: catMap["Air Intake System"],    quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Air Intake Pipe",         categoryId: catMap["Air Intake System"],    quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Boost Pressure Sensor",   categoryId: catMap["Air Intake System"],    quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },

  // 5️⃣ Exhaust System
  { name: "Exhaust Pipe",            categoryId: catMap["Exhaust System"],       quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Muffler",                 categoryId: catMap["Exhaust System"],       quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Diesel Particulate Filter (DPF)", categoryId: catMap["Exhaust System"], quantityInStock: 2, minimumStockLevel: 1, reorderLevel: 2 },
  { name: "Catalytic Converter",     categoryId: catMap["Exhaust System"],       quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Exhaust Clamps",          categoryId: catMap["Exhaust System"],       quantityInStock: 20, minimumStockLevel: 8,  reorderLevel: 12 },
  { name: "Exhaust Sensors",         categoryId: catMap["Exhaust System"],       quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },

  // 6️⃣ Transmission System
  { name: "Transmission Gearbox",    categoryId: catMap["Transmission System"],  quantityInStock: 1,  minimumStockLevel: 1,  reorderLevel: 1  },
  { name: "Clutch Plate",            categoryId: catMap["Transmission System"],  quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Clutch Pressure Plate",   categoryId: catMap["Transmission System"],  quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Clutch Release Bearing",  categoryId: catMap["Transmission System"],  quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Transmission Oil Filter", categoryId: catMap["Transmission System"],  quantityInStock: 10, minimumStockLevel: 3,  reorderLevel: 6  },
  { name: "Transmission Mount",      categoryId: catMap["Transmission System"],  quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Shift Linkage",           categoryId: catMap["Transmission System"],  quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },

  // 7️⃣ Drivetrain System
  { name: "Driveshaft",              categoryId: catMap["Drivetrain System"],    quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Universal Joints (U-joints)", categoryId: catMap["Drivetrain System"], quantityInStock: 8, minimumStockLevel: 3, reorderLevel: 5  },
  { name: "Differential",            categoryId: catMap["Drivetrain System"],    quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 1  },
  { name: "Axle Shafts",             categoryId: catMap["Drivetrain System"],    quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Propeller Shaft",         categoryId: catMap["Drivetrain System"],    quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Carrier Bearing",         categoryId: catMap["Drivetrain System"],    quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },

  // 8️⃣ Brake System
  { name: "Brake Pads",              categoryId: catMap["Brake System"],         quantityInStock: 24, minimumStockLevel: 8,  reorderLevel: 16 },
  { name: "Brake Shoes",             categoryId: catMap["Brake System"],         quantityInStock: 16, minimumStockLevel: 6,  reorderLevel: 10 },
  { name: "Brake Drums",             categoryId: catMap["Brake System"],         quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 6  },
  { name: "Brake Discs (Rotors)",    categoryId: catMap["Brake System"],         quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 6  },
  { name: "Brake Calipers",          categoryId: catMap["Brake System"],         quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 6  },
  { name: "Brake Chambers",          categoryId: catMap["Brake System"],         quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 6  },
  { name: "Air Compressor",          categoryId: catMap["Brake System"],         quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Air Dryer",               categoryId: catMap["Brake System"],         quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Brake Valves",            categoryId: catMap["Brake System"],         quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Brake Lines",             categoryId: catMap["Brake System"],         quantityInStock: 12, minimumStockLevel: 4,  reorderLevel: 8  },

  // 9️⃣ Suspension System
  { name: "Leaf Springs",            categoryId: catMap["Suspension System"],    quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },
  { name: "Shock Absorbers",         categoryId: catMap["Suspension System"],    quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 6  },
  { name: "Suspension Bushings",     categoryId: catMap["Suspension System"],    quantityInStock: 20, minimumStockLevel: 6,  reorderLevel: 10 },
  { name: "Stabilizer Bar",          categoryId: catMap["Suspension System"],    quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Torque Rods",             categoryId: catMap["Suspension System"],    quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Suspension Brackets",     categoryId: catMap["Suspension System"],    quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },

  // 🔟 Steering System
  { name: "Steering Wheel",          categoryId: catMap["Steering System"],      quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Steering Column",         categoryId: catMap["Steering System"],      quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Steering Gearbox",        categoryId: catMap["Steering System"],      quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Power Steering Pump",     categoryId: catMap["Steering System"],      quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Tie Rods",                categoryId: catMap["Steering System"],      quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },
  { name: "Drag Link",               categoryId: catMap["Steering System"],      quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Steering Knuckle",        categoryId: catMap["Steering System"],      quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },

  // 1️⃣1️⃣ Electrical System
  { name: "Battery",                 categoryId: catMap["Electrical System"],    quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Alternator",              categoryId: catMap["Electrical System"],    quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Starter Motor",           categoryId: catMap["Electrical System"],    quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Wiring Harness",          categoryId: catMap["Electrical System"],    quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
  { name: "Relays",                  categoryId: catMap["Electrical System"],    quantityInStock: 20, minimumStockLevel: 6,  reorderLevel: 10 },
  { name: "Fuses",                   categoryId: catMap["Electrical System"],    quantityInStock: 50, minimumStockLevel: 15, reorderLevel: 25 },
  { name: "Sensors (General)",       categoryId: catMap["Electrical System"],    quantityInStock: 15, minimumStockLevel: 5,  reorderLevel: 8  },
  { name: "ECU (Engine Control Unit)", categoryId: catMap["Electrical System"],  quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Headlights",              categoryId: catMap["Electrical System"],    quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },
  { name: "Tail Lights",             categoryId: catMap["Electrical System"],    quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },
  { name: "Indicators",              categoryId: catMap["Electrical System"],    quantityInStock: 10, minimumStockLevel: 4,  reorderLevel: 6  },

  // 1️⃣2️⃣ Cabin / Interior Parts
  { name: "Dashboard",               categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 2, minimumStockLevel: 1, reorderLevel: 1 },
  { name: "Gauges",                  categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 6, minimumStockLevel: 2, reorderLevel: 4 },
  { name: "AC Compressor",           categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 3, minimumStockLevel: 1, reorderLevel: 2 },
  { name: "AC Condenser",            categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 3, minimumStockLevel: 1, reorderLevel: 2 },
  { name: "AC Evaporator",           categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 3, minimumStockLevel: 1, reorderLevel: 2 },
  { name: "Cabin Air Filter",        categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 12, minimumStockLevel: 4, reorderLevel: 6 },
  { name: "Seats",                   categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 4, minimumStockLevel: 2, reorderLevel: 2 },
  { name: "Seat Belts",              categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 8, minimumStockLevel: 3, reorderLevel: 4 },
  { name: "Window Regulators",       categoryId: catMap["Cabin / Interior Parts"], quantityInStock: 6, minimumStockLevel: 2, reorderLevel: 4 },

  // 1️⃣3️⃣ Wheels & Tires
  { name: "Tires",                   categoryId: catMap["Wheels & Tires"],       quantityInStock: 12, minimumStockLevel: 4,  reorderLevel: 8  },
  { name: "Wheel Rims",              categoryId: catMap["Wheels & Tires"],       quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 6  },
  { name: "Wheel Studs",             categoryId: catMap["Wheels & Tires"],       quantityInStock: 50, minimumStockLevel: 15, reorderLevel: 25 },
  { name: "Wheel Nuts",              categoryId: catMap["Wheels & Tires"],       quantityInStock: 50, minimumStockLevel: 15, reorderLevel: 25 },
  { name: "Wheel Hub",               categoryId: catMap["Wheels & Tires"],       quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Bearings",                categoryId: catMap["Wheels & Tires"],       quantityInStock: 16, minimumStockLevel: 6,  reorderLevel: 10 },
  { name: "Hub Seals",               categoryId: catMap["Wheels & Tires"],       quantityInStock: 16, minimumStockLevel: 6,  reorderLevel: 10 },

  // 1️⃣4️⃣ Body Parts
  { name: "Bumper",                  categoryId: catMap["Body Parts"],           quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Grill",                   categoryId: catMap["Body Parts"],           quantityInStock: 3,  minimumStockLevel: 1,  reorderLevel: 2  },
  { name: "Hood",                    categoryId: catMap["Body Parts"],           quantityInStock: 2,  minimumStockLevel: 1,  reorderLevel: 1  },
  { name: "Doors",                   categoryId: catMap["Body Parts"],           quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 2  },
  { name: "Mirrors",                 categoryId: catMap["Body Parts"],           quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Mudguards",               categoryId: catMap["Body Parts"],           quantityInStock: 8,  minimumStockLevel: 3,  reorderLevel: 5  },
  { name: "Steps",                   categoryId: catMap["Body Parts"],           quantityInStock: 6,  minimumStockLevel: 2,  reorderLevel: 4  },
  { name: "Fuel Tank Cover",         categoryId: catMap["Body Parts"],           quantityInStock: 4,  minimumStockLevel: 2,  reorderLevel: 3  },
];

// ── Insert parts ──────────────────────────────────────────────────────────────
console.log(`Inserting ${parts.length} parts...`);

const now = new Date();
const values = parts.map(p => [
  p.name,
  null,                        // partNumber
  p.categoryId ?? null,
  null,                        // supplierId
  "Mack Truck",                // compatibleModel
  null,                        // unitCost
  p.quantityInStock,
  p.minimumStockLevel,
  p.reorderLevel,
  null,                        // storageLocation
  null,                        // notes
  now,
  now,
]);

const placeholders = values.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
const flat = values.flat();

await connection.execute(
  `INSERT INTO parts (name, partNumber, categoryId, supplierId, compatibleModel, unitCost, quantityInStock, minimumStockLevel, reorderLevel, storageLocation, notes, createdAt, updatedAt) VALUES ${placeholders}`,
  flat
);

console.log(`✅ Successfully inserted ${parts.length} parts across 14 categories.`);
await connection.end();
