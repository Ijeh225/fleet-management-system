CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`phone` varchar(30),
	`licenseNumber` varchar(50),
	`licenseExpiry` date,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`notes` text,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partId` int NOT NULL,
	`transactionType` enum('stock_in','stock_out','maintenance_usage','adjustment') NOT NULL,
	`quantity` int NOT NULL,
	`previousQuantity` int NOT NULL,
	`newQuantity` int NOT NULL,
	`referenceId` int,
	`referenceType` varchar(50),
	`notes` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_parts_used` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maintenanceId` int NOT NULL,
	`partId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitCost` decimal(10,2) NOT NULL,
	`totalCost` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_parts_used_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`truckId` int NOT NULL,
	`maintenanceDate` date NOT NULL,
	`serviceType` enum('oil_change','tire_replacement','brake_service','engine_repair','electrical_repair','suspension_work','gearbox_service','body_repair','general_servicing','other') NOT NULL,
	`issueReported` text,
	`diagnosis` text,
	`workPerformed` text,
	`technicianName` varchar(100),
	`laborCost` decimal(10,2) DEFAULT '0.00',
	`totalPartsCost` decimal(10,2) DEFAULT '0.00',
	`totalCost` decimal(10,2) DEFAULT '0.00',
	`mileageAtService` int,
	`downtimeDuration` int,
	`nextServiceDate` date,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`partNumber` varchar(100),
	`categoryId` int,
	`compatibleModel` varchar(200),
	`supplierId` int,
	`unitCost` decimal(10,2) DEFAULT '0.00',
	`quantityInStock` int NOT NULL DEFAULT 0,
	`minimumStockLevel` int NOT NULL DEFAULT 5,
	`reorderLevel` int NOT NULL DEFAULT 10,
	`storageLocation` varchar(100),
	`notes` text,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`truckId` int NOT NULL,
	`serviceType` enum('oil_change','tire_replacement','brake_service','engine_repair','electrical_repair','suspension_work','gearbox_service','body_repair','general_servicing','other') NOT NULL,
	`nextServiceDate` date NOT NULL,
	`nextServiceMileage` int,
	`reminderStatus` enum('pending','sent','dismissed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`contactPerson` varchar(100),
	`phone` varchar(30),
	`email` varchar(320),
	`address` text,
	`notes` text,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trucks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`truckCode` varchar(50) NOT NULL,
	`plateNumber` varchar(30) NOT NULL,
	`vin` varchar(50),
	`engineNumber` varchar(50),
	`brand` varchar(100),
	`model` varchar(100),
	`year` int,
	`color` varchar(50),
	`mileage` int DEFAULT 0,
	`fuelType` enum('diesel','petrol','electric','hybrid') DEFAULT 'diesel',
	`purchaseDate` date,
	`status` enum('active','under_maintenance','inactive') NOT NULL DEFAULT 'active',
	`assignedDriverId` int,
	`insuranceExpiry` date,
	`roadworthinessExpiry` date,
	`notes` text,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trucks_id` PRIMARY KEY(`id`),
	CONSTRAINT `trucks_truckCode_unique` UNIQUE(`truckCode`)
);
