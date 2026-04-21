# Fleet Management System - TODO

## Database Schema
- [x] Users table (with roles: admin, staff)
- [x] Trucks table
- [x] Drivers table
- [x] Suppliers table
- [x] Parts/Inventory table
- [x] Categories table
- [x] Inventory transactions table
- [x] Maintenance records table
- [x] Maintenance parts used table
- [x] Service schedules table
- [x] Audit logs table

## Backend API
- [x] Auth procedures (me, logout)
- [x] Users CRUD (admin only)
- [x] Trucks CRUD + search/filter
- [x] Drivers CRUD + assignment
- [x] Suppliers CRUD
- [x] Parts CRUD + stock management
- [x] Inventory transactions (stock in/out/adjustment)
- [x] Maintenance records CRUD + parts usage
- [x] Service schedules CRUD
- [x] Dashboard summary data
- [x] Reports (cost per truck, monthly expenses, stock status, parts usage)
- [ ] Seed data script

## Frontend Pages
- [x] Login page (via DashboardLayout auth gate)
- [x] Dashboard with real data widgets
- [x] Trucks list page
- [x] Truck details page (with maintenance history)
- [x] Drivers page
- [x] Suppliers page
- [x] Parts inventory page
- [x] Part details page
- [x] Maintenance records page
- [x] Add maintenance page (with parts selection)
- [x] Service schedule page
- [x] Reports page (with charts)
- [x] Users management page (admin only)
- [x] Profile/settings page

## UI/UX
- [x] Sidebar navigation with all modules
- [x] Header bar with user info
- [x] Dashboard cards/widgets
- [x] Data tables with search, filter
- [x] Status badges
- [x] Modal forms with validation
- [x] Success/error feedback (toasts)
- [x] Empty states
- [x] Responsive design

## Business Logic
- [x] Role-based access control (Admin vs Staff)
- [x] Inventory auto-deduction on maintenance parts usage
- [x] Stock validation before deduction
- [x] Maintenance cost rollup
- [x] Low-stock alerts
- [x] Overdue/upcoming service indicators

## Tests
- [x] Auth tests (me, logout)
- [x] Role-based access control tests
- [x] Trucks router tests
- [x] Drivers router tests
- [x] Suppliers router tests
- [x] Parts router tests
- [x] Maintenance router tests
- [x] Schedules router tests
- [x] Dashboard router tests
- [x] Reports router tests
- [x] Users router tests

## Deployment
- [x] Dockerfile
- [x] docker-compose.yml
- [x] .env.example

## Custom Auth & Role-Based Access (New)
- [x] Add username + hashed password fields to users table
- [x] Add migration for new auth fields
- [x] Build login tRPC procedure (username/password → JWT cookie)
- [x] Build admin createUser procedure (admin only)
- [x] Build admin updateUser procedure (change role, reset password)
- [x] Build admin deleteUser procedure
- [x] Enforce role permissions in all protected procedures
- [x] Build Login page (username/password form, no OAuth)
- [x] Build User Management page (admin: create, edit, delete users)
- [x] Remove Manus OAuth login button from DashboardLayout
- [x] Enforce frontend route guards per role
- [x] Admin: full access (trucks, inventory, maintenance, users)
- [x] Staff: view trucks, record maintenance, use parts only
- [x] Write tests for custom auth and role permissions

## Parts Inventory - Stock Removal Fix
- [x] Add dedicated "Add Stock" and "Remove Stock" buttons on each part row
- [x] Pre-select Stock In / Stock Out based on which button was clicked
- [x] Validate that removal quantity does not exceed current stock
- [x] Show current stock clearly in the dialog title

## Inventory Restructure (Parts / Inventory / Stock Removal)
- [x] Separate parts table from stock quantity (parts = catalogue only)
- [x] Create stock_receipts table (stock-in: partId, qty, supplierId, date, reference)
- [x] Create stock_issues table (stock-out: partId, qty, truckId, driverId, date, reason)
- [x] Add computed quantityInStock view/logic based on transactions
- [x] Rewrite parts router (catalogue CRUD, no stock fields)
- [x] Rewrite inventory router (stock-in transactions)
- [x] Build stock_issues router (stock-out with truck + driver linkage)
- [x] Rebuild Parts page (catalogue only)
- [x] Build Inventory page (stock-in form + history table)
- [x] Build Stock Removal / Issue page (stock-out form + history with filters)
- [x] Update DashboardLayout navigation (Parts / Inventory / Stock Removal)
- [x] Update Dashboard summary cards
- [x] Update Reports page with stock-in/out history and filters

## Parts/Inventory Separation Fix
- [x] Parts page = pure catalogue only (no stock shown, no dashboard impact)
- [x] Inventory page = select category → part → quantity received (stock-in only)
- [x] Dashboard = only show data from stock_receipts, not from parts table
- [x] Dashboard "Parts In Stock" card = count of parts that have received stock
- [x] Dashboard "Low Stock" = based on received stock vs minimum level

## Trucks CSV Bulk Import
- [x] Add trucks.bulkImport tRPC procedure (validate + insert rows)
- [x] Build CSV import dialog on Trucks page (upload, parse, preview table)
- [x] Downloadable CSV template with correct column headers
- [x] Row-level validation feedback (show errors per row before confirming)
- [x] Skip duplicate plate numbers with warning
- [x] Write vitest test for bulkImport procedure

## Drivers CSV Bulk Import
- [x] Add getDriverByLicense helper to db.ts
- [x] Add drivers.bulkImport tRPC procedure (admin only, skip duplicate license numbers)
- [x] Rewrite Drivers page with Import CSV button and 3-step dialog
- [x] Downloadable CSV template for drivers
- [x] Row-level validation (required fields, status enum checks, date format)
- [x] Write vitest tests for drivers.bulkImport

## Audit Trail
- [x] Add audit_logs table to schema
- [x] Add logAudit helper in db.ts
- [x] Add getAuditLogs helper with filters (entityType, userId, pagination)
- [x] Add audit.list tRPC procedure (admin only)
- [x] Build Audit Trail page (filterable table, pagination, colour-coded actions)
- [x] Add Audit Trail to sidebar navigation (Administration group)
- [x] Write vitest tests for audit.list

## Parts Reorder & Purchase Order Generator
- [x] Add purchase_orders table to schema
- [x] Add getLowStockPartsForReorder helper (auto-detect parts below min stock)
- [x] Add createPurchaseOrder, getAllPurchaseOrders, updatePurchaseOrderStatus helpers
- [x] Add purchaseOrders tRPC router (lowStockParts, list, create, updateStatus)
- [x] Build Parts Reorder page (auto-detected low stock, grouped by supplier)
- [x] Editable order quantities per part before creating PO
- [x] Create Purchase Order dialog with line item summary
- [x] Printable purchase order HTML (opens print dialog)
- [x] Purchase Orders list tab with status management (draft → sent → received)
- [x] Add Parts Reorder to sidebar navigation (Analytics group)
- [x] Write vitest tests for purchaseOrders procedures

## Sidebar Navigation Fix
- [x] Move Suppliers into Inventory group (not overlapping Maintenance label)
- [x] Improve group label visibility and spacing
- [x] Fix cramped item spacing in sidebar

## Fleet Operations Module (Trips / Dispatch / Availability)
- [x] Add trips table to schema (truckId, driverId, cargo, origin, destination, departure, arrival, distance, revenue, status, notes)
- [x] Run migration for trips table
- [x] Add trips DB helpers (createTrip, getAllTrips, getTripById, updateTripStatus, getTripStats, getFleetAvailability)
- [x] Add trips tRPC router (list, get, create, update, updateStatus, stats, fleetAvailability, delete)
- [x] Build Trips page (list with filters, status badges, revenue column)
- [x] Build New Trip / Dispatch form (assign truck + driver + cargo + route)
- [x] Build Trip detail view (full trip info + status timeline)
- [x] Fleet Availability Board on Dashboard (truck cards: Available / On Trip / Under Maintenance / Inactive)
- [x] Rebuild Dashboard with advanced layout (KPI cards with trends, fleet board, charts, quick actions)
- [x] Update DashboardLayout navigation (add Trips under Fleet Operations group)
- [x] Write vitest tests for trips router (13 tests)

## Audit Logging Wired to Key Mutations
- [x] logAudit called on trucks.create
- [x] logAudit called on drivers.create
- [x] logAudit called on maintenance.create
- [x] logAudit called on stockIssues.create
- [x] logAudit called on trips.create
- [x] logAudit called on purchaseOrders.create

## Bug Fixes
- [x] Fix sidebar nav: MAINTENANCE section label overlapping Suppliers item in DashboardLayout (moved Suppliers to Maintenance group, added dividers between groups)

## Sidebar Spacing Fix
- [x] Reduce nav item height/padding so items are closer together (h-7, gap-0, pb-0.5)
- [x] Fix section labels still overlapping with last item of previous group (reduced mt-1, pt-1.5, pb-0.5)

## Trip Estimation Feature
- [x] Add fuelEfficiency fields to trucks schema (baseFuelEfficiencyKmL, avgFuelEfficiencyKmL, fuelEfficiencySampleCount, loadCapacityTons)
- [x] Add estimation fields to trips schema (estimatedDistanceKm, estimatedDurationMins, estimatedFuelLitres, estimatedFuelCost, loadFactor, dieselPricePerLitre, actualFuelLitres, actualFuelCost)
- [x] Run migration for new fields
- [x] Add updateTruckFuelEfficiency helper to db.ts
- [x] Add estimateRoute tRPC procedure (Maps Directions API + fuel calculation)
- [x] Add recordActualFuel tRPC procedure (saves actual fuel, updates truck rolling average)
- [x] Update New Trip form with Route Estimation panel (load condition, diesel price, Calculate button, pre-dispatch summary card)
- [x] Add Fuel Estimation section to Trip View dialog (est vs actual comparison)
- [x] Add Record Actual Fuel dialog (triggered from completed/delivered trips)
- [x] Auto-fill distance and fuel cost fields from estimation result
- [x] Rolling average efficiency update after recording actual fuel

## New Trip Dialog Layout Fix
- [x] Fix form fields squashed: switch from side-by-side to stacked layout (form fields on top, map below)

## Auto Route Estimation + Live Map Preview
- [ ] Auto-trigger route estimation when both origin and destination are filled (debounced, no button click needed)
- [ ] Show live Google Map in the New Trip dialog with the route drawn as a polyline
- [ ] Show origin/destination markers on the map
- [ ] Display distance in km and estimated travel time below the map
- [ ] Diesel estimate updates automatically when truck, load condition, or diesel price changes
- [ ] Use Google Maps Autocomplete on origin/destination fields for easy city/address entry

## Bug Fixes (continued)
- [ ] Fix Places Autocomplete: clicking suggested location does not fill the input inside Dialog

## Bug Fixes (continued)
- [ ] Fix: New Trip dialog closes when clicking a Places Autocomplete suggestion (onInteractOutside fires for pac-container)

## Trip Form Adjustments
- [x] Rename "Cargo Type" field to "Container Number" across form, list, and detail view
- [x] Keep diesel price as manual input (no auto-fill)
- [x] Auto-calculate and display estimated fuel litres immediately after route distance is computed (uses 3.5 km/L default if no truck selected)

## Trip Form & Currency Updates
- [x] Remove Load Condition field from trip form and schema
- [x] Add Container Size field (20ft / 40ft / 40ft HC) to trips schema and form
- [x] Replace all $ dollar signs with ₦ Naira symbol throughout the project
- [x] Implement actual fuel recording dialog on completed/delivered trips (also accessible from trip list row)

## Bug Fix: Google Maps Duplicate Load
- [x] Fix "Google Maps JavaScript API included multiple times" error on Trips page

## Fuel Efficiency Report & Container Size Filter
- [x] Add getFuelEfficiencyReport DB helper (trips with est vs actual fuel, per-truck summary)
- [x] Add reports.fuelEfficiency tRPC procedure
- [x] Build Fuel tab in Reports page (trip comparison table + per-truck efficiency trend chart)
- [x] Add Container Size chip filter on Trips list page (All / 20ft / 40ft / 40ft HC)
- [x] Write vitest tests for reports.fuelEfficiency procedure (3 tests added)
