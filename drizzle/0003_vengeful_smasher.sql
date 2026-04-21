CREATE TABLE `stock_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partId` int NOT NULL,
	`quantity` int NOT NULL,
	`truckId` int NOT NULL,
	`driverId` int,
	`issueDate` date NOT NULL,
	`reason` text,
	`notes` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitCost` decimal(10,2),
	`supplierId` int,
	`receiptDate` date NOT NULL,
	`purchaseReference` varchar(100),
	`notes` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `parts` MODIFY COLUMN `unitCost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `parts` ADD `unitType` varchar(50) DEFAULT 'piece';--> statement-breakpoint
ALTER TABLE `parts` ADD `description` text;--> statement-breakpoint
ALTER TABLE `parts` DROP COLUMN `supplierId`;--> statement-breakpoint
ALTER TABLE `parts` DROP COLUMN `quantityInStock`;