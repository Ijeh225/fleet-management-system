import mysql from 'mysql2/promise';

// Category IDs from the database
const CAT = {
  engine: 3,
  cooling: 4,
  fuel: 5,
  airIntake: 6,
  exhaust: 7,
  transmission: 8,
  drivetrain: 9,
  brake: 10,
  suspension: 11,
  steering: 12,
  electrical: 13,
  cabin: 14,
  wheels: 15,
  body: 16,
};

const parts = [
  // 1. Engine System
  { name: 'Engine Block', partNumber: 'MK-ENG-001', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '4500.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Cylinder Head', partNumber: 'MK-ENG-002', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1800.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Pistons', partNumber: 'MK-ENG-003', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '950.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Piston Rings', partNumber: 'MK-ENG-004', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '320.00', minimumStockLevel: 2, reorderLevel: 5 },
  { name: 'Connecting Rods', partNumber: 'MK-ENG-005', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '760.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Crankshaft', partNumber: 'MK-ENG-006', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '2200.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Camshaft', partNumber: 'MK-ENG-007', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1100.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Timing Gear', partNumber: 'MK-ENG-008', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '480.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Oil Pump', partNumber: 'MK-ENG-009', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '390.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Oil Filter', partNumber: 'MK-ENG-010', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '35.00', minimumStockLevel: 10, reorderLevel: 20 },
  { name: 'Fuel Injectors', partNumber: 'MK-ENG-011', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '1400.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Fuel Pump', partNumber: 'MK-ENG-012', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '620.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Turbocharger', partNumber: 'MK-ENG-013', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '2800.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Intercooler', partNumber: 'MK-ENG-014', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '950.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Intake Manifold', partNumber: 'MK-ENG-015', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '540.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Exhaust Manifold', partNumber: 'MK-ENG-016', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '480.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Engine Gasket Kit', partNumber: 'MK-ENG-017', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '280.00', minimumStockLevel: 3, reorderLevel: 6 },
  { name: 'Engine Mount', partNumber: 'MK-ENG-018', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '180.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Flywheel', partNumber: 'MK-ENG-019', categoryId: CAT.engine, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '760.00', minimumStockLevel: 1, reorderLevel: 2 },

  // 2. Cooling System
  { name: 'Radiator', partNumber: 'MK-CLG-001', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1200.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Radiator Cap', partNumber: 'MK-CLG-002', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '18.00', minimumStockLevel: 5, reorderLevel: 10 },
  { name: 'Cooling Fan', partNumber: 'MK-CLG-003', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '420.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Fan Clutch', partNumber: 'MK-CLG-004', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '380.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Water Pump', partNumber: 'MK-CLG-005', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '290.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Thermostat', partNumber: 'MK-CLG-006', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '45.00', minimumStockLevel: 5, reorderLevel: 10 },
  { name: 'Coolant Reservoir', partNumber: 'MK-CLG-007', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '95.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Radiator Hoses', partNumber: 'MK-CLG-008', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '120.00', minimumStockLevel: 3, reorderLevel: 6 },
  { name: 'Heater Core', partNumber: 'MK-CLG-009', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '340.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Coolant Temperature Sensor', partNumber: 'MK-CLG-010', categoryId: CAT.cooling, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '55.00', minimumStockLevel: 5, reorderLevel: 10 },

  // 3. Fuel System
  { name: 'Fuel Tank', partNumber: 'MK-FUL-001', categoryId: CAT.fuel, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1800.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Fuel Rail', partNumber: 'MK-FUL-002', categoryId: CAT.fuel, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '380.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Fuel Pressure Regulator', partNumber: 'MK-FUL-003', categoryId: CAT.fuel, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '145.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Fuel Filter', partNumber: 'MK-FUL-004', categoryId: CAT.fuel, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '42.00', minimumStockLevel: 10, reorderLevel: 20 },
  { name: 'Fuel Lines', partNumber: 'MK-FUL-005', categoryId: CAT.fuel, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '220.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Water Separator', partNumber: 'MK-FUL-006', categoryId: CAT.fuel, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '185.00', minimumStockLevel: 3, reorderLevel: 6 },

  // 4. Air Intake System
  { name: 'Air Filter', partNumber: 'MK-AIR-001', categoryId: CAT.airIntake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '65.00', minimumStockLevel: 10, reorderLevel: 20 },
  { name: 'Air Filter Housing', partNumber: 'MK-AIR-002', categoryId: CAT.airIntake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '240.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Air Intake Pipe', partNumber: 'MK-AIR-003', categoryId: CAT.airIntake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '180.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Boost Pressure Sensor', partNumber: 'MK-AIR-004', categoryId: CAT.airIntake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '95.00', minimumStockLevel: 3, reorderLevel: 6 },

  // 5. Exhaust System
  { name: 'Exhaust Pipe', partNumber: 'MK-EXH-001', categoryId: CAT.exhaust, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '380.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Muffler', partNumber: 'MK-EXH-002', categoryId: CAT.exhaust, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '520.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Diesel Particulate Filter (DPF)', partNumber: 'MK-EXH-003', categoryId: CAT.exhaust, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '2400.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Catalytic Converter', partNumber: 'MK-EXH-004', categoryId: CAT.exhaust, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1800.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Exhaust Clamps', partNumber: 'MK-EXH-005', categoryId: CAT.exhaust, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '45.00', minimumStockLevel: 10, reorderLevel: 20 },
  { name: 'Exhaust Sensors', partNumber: 'MK-EXH-006', categoryId: CAT.exhaust, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '120.00', minimumStockLevel: 4, reorderLevel: 8 },

  // 6. Transmission System
  { name: 'Transmission Gearbox', partNumber: 'MK-TRN-001', categoryId: CAT.transmission, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '8500.00', minimumStockLevel: 1, reorderLevel: 1 },
  { name: 'Clutch Plate', partNumber: 'MK-TRN-002', categoryId: CAT.transmission, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '480.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Clutch Pressure Plate', partNumber: 'MK-TRN-003', categoryId: CAT.transmission, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '620.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Clutch Release Bearing', partNumber: 'MK-TRN-004', categoryId: CAT.transmission, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '95.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Transmission Oil Filter', partNumber: 'MK-TRN-005', categoryId: CAT.transmission, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '55.00', minimumStockLevel: 5, reorderLevel: 10 },
  { name: 'Transmission Mount', partNumber: 'MK-TRN-006', categoryId: CAT.transmission, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '145.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Shift Linkage', partNumber: 'MK-TRN-007', categoryId: CAT.transmission, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '280.00', minimumStockLevel: 2, reorderLevel: 4 },

  // 7. Drivetrain System
  { name: 'Driveshaft', partNumber: 'MK-DRV-001', categoryId: CAT.drivetrain, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1200.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Universal Joints (U-joints)', partNumber: 'MK-DRV-002', categoryId: CAT.drivetrain, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '180.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Differential', partNumber: 'MK-DRV-003', categoryId: CAT.drivetrain, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '3200.00', minimumStockLevel: 1, reorderLevel: 1 },
  { name: 'Axle Shafts', partNumber: 'MK-DRV-004', categoryId: CAT.drivetrain, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '960.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Propeller Shaft', partNumber: 'MK-DRV-005', categoryId: CAT.drivetrain, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '850.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Carrier Bearing', partNumber: 'MK-DRV-006', categoryId: CAT.drivetrain, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '145.00', minimumStockLevel: 3, reorderLevel: 6 },

  // 8. Brake System
  { name: 'Brake Pads', partNumber: 'MK-BRK-001', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '220.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Brake Shoes', partNumber: 'MK-BRK-002', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '185.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Brake Drums', partNumber: 'MK-BRK-003', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '340.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Brake Discs (Rotors)', partNumber: 'MK-BRK-004', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '420.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Brake Calipers', partNumber: 'MK-BRK-005', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '580.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Brake Chambers', partNumber: 'MK-BRK-006', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '195.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Air Compressor', partNumber: 'MK-BRK-007', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1100.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Air Dryer', partNumber: 'MK-BRK-008', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '480.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Brake Valves', partNumber: 'MK-BRK-009', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '165.00', minimumStockLevel: 3, reorderLevel: 6 },
  { name: 'Brake Lines', partNumber: 'MK-BRK-010', categoryId: CAT.brake, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '145.00', minimumStockLevel: 3, reorderLevel: 6 },

  // 9. Suspension System
  { name: 'Leaf Springs', partNumber: 'MK-SUS-001', categoryId: CAT.suspension, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '980.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Shock Absorbers', partNumber: 'MK-SUS-002', categoryId: CAT.suspension, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '640.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Suspension Bushings', partNumber: 'MK-SUS-003', categoryId: CAT.suspension, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '185.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Stabilizer Bar', partNumber: 'MK-SUS-004', categoryId: CAT.suspension, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '320.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Torque Rods', partNumber: 'MK-SUS-005', categoryId: CAT.suspension, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '480.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Suspension Brackets', partNumber: 'MK-SUS-006', categoryId: CAT.suspension, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '220.00', minimumStockLevel: 2, reorderLevel: 4 },

  // 10. Steering System
  { name: 'Steering Wheel', partNumber: 'MK-STR-001', categoryId: CAT.steering, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '280.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Steering Column', partNumber: 'MK-STR-002', categoryId: CAT.steering, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '620.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Steering Gearbox', partNumber: 'MK-STR-003', categoryId: CAT.steering, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1800.00', minimumStockLevel: 1, reorderLevel: 1 },
  { name: 'Power Steering Pump', partNumber: 'MK-STR-004', categoryId: CAT.steering, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '580.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Tie Rods', partNumber: 'MK-STR-005', categoryId: CAT.steering, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '320.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Drag Link', partNumber: 'MK-STR-006', categoryId: CAT.steering, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '245.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Steering Knuckle', partNumber: 'MK-STR-007', categoryId: CAT.steering, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '480.00', minimumStockLevel: 1, reorderLevel: 2 },

  // 11. Electrical System
  { name: 'Battery', partNumber: 'MK-ELC-001', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '380.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Alternator', partNumber: 'MK-ELC-002', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '680.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Starter Motor', partNumber: 'MK-ELC-003', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '520.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Wiring Harness', partNumber: 'MK-ELC-004', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1200.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Relays', partNumber: 'MK-ELC-005', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '85.00', minimumStockLevel: 5, reorderLevel: 10 },
  { name: 'Fuses', partNumber: 'MK-ELC-006', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '25.00', minimumStockLevel: 10, reorderLevel: 20 },
  { name: 'Sensors (General)', partNumber: 'MK-ELC-007', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '95.00', minimumStockLevel: 5, reorderLevel: 10 },
  { name: 'ECU (Engine Control Unit)', partNumber: 'MK-ELC-008', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '3200.00', minimumStockLevel: 1, reorderLevel: 1 },
  { name: 'Headlights', partNumber: 'MK-ELC-009', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '280.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Tail Lights', partNumber: 'MK-ELC-010', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '185.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Indicators', partNumber: 'MK-ELC-011', categoryId: CAT.electrical, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '95.00', minimumStockLevel: 4, reorderLevel: 8 },

  // 12. Cabin / Interior Parts
  { name: 'Dashboard', partNumber: 'MK-CAB-001', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1800.00', minimumStockLevel: 1, reorderLevel: 1 },
  { name: 'Gauges', partNumber: 'MK-CAB-002', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '480.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Air Conditioning Compressor', partNumber: 'MK-CAB-003', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1200.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'AC Condenser', partNumber: 'MK-CAB-004', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '580.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'AC Evaporator', partNumber: 'MK-CAB-005', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '480.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Cabin Air Filter', partNumber: 'MK-CAB-006', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '28.00', minimumStockLevel: 10, reorderLevel: 20 },
  { name: 'Seats', partNumber: 'MK-CAB-007', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '950.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Seat Belts', partNumber: 'MK-CAB-008', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '220.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Window Regulators', partNumber: 'MK-CAB-009', categoryId: CAT.cabin, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '145.00', minimumStockLevel: 2, reorderLevel: 4 },

  // 13. Wheels & Tires
  { name: 'Tires', partNumber: 'MK-WHL-001', categoryId: CAT.wheels, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '480.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Wheel Rims', partNumber: 'MK-WHL-002', categoryId: CAT.wheels, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '320.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Wheel Studs', partNumber: 'MK-WHL-003', categoryId: CAT.wheels, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '45.00', minimumStockLevel: 5, reorderLevel: 10 },
  { name: 'Wheel Nuts', partNumber: 'MK-WHL-004', categoryId: CAT.wheels, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '35.00', minimumStockLevel: 5, reorderLevel: 10 },
  { name: 'Wheel Hub', partNumber: 'MK-WHL-005', categoryId: CAT.wheels, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '580.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Bearings', partNumber: 'MK-WHL-006', categoryId: CAT.wheels, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '185.00', minimumStockLevel: 4, reorderLevel: 8 },
  { name: 'Hub Seals', partNumber: 'MK-WHL-007', categoryId: CAT.wheels, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '65.00', minimumStockLevel: 5, reorderLevel: 10 },

  // 14. Body Parts
  { name: 'Bumper', partNumber: 'MK-BDY-001', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '680.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Grill', partNumber: 'MK-BDY-002', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '380.00', minimumStockLevel: 1, reorderLevel: 2 },
  { name: 'Hood', partNumber: 'MK-BDY-003', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '1200.00', minimumStockLevel: 1, reorderLevel: 1 },
  { name: 'Doors', partNumber: 'MK-BDY-004', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '1800.00', minimumStockLevel: 1, reorderLevel: 1 },
  { name: 'Mirrors', partNumber: 'MK-BDY-005', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '320.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Mudguards', partNumber: 'MK-BDY-006', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'set', unitCost: '245.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Steps', partNumber: 'MK-BDY-007', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'pair', unitCost: '185.00', minimumStockLevel: 2, reorderLevel: 4 },
  { name: 'Fuel Tank Cover', partNumber: 'MK-BDY-008', categoryId: CAT.body, compatibleModel: 'Mack Granite', unitType: 'piece', unitCost: '95.00', minimumStockLevel: 2, reorderLevel: 4 },
];

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Seeding ${parts.length} Mack truck parts...`);
  let inserted = 0;
  for (const p of parts) {
    await conn.execute(
      `INSERT INTO parts (name, partNumber, categoryId, compatibleModel, unitType, unitCost, minimumStockLevel, reorderLevel, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [p.name, p.partNumber, p.categoryId, p.compatibleModel, p.unitType, p.unitCost, p.minimumStockLevel, p.reorderLevel]
    );
    inserted++;
    if (inserted % 20 === 0) console.log(`  ${inserted}/${parts.length} inserted...`);
  }
  console.log(`✅ Done! Inserted ${inserted} parts.`);
  await conn.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
