CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`supplierId` int,
	`status` enum('draft','sent','received','cancelled') NOT NULL DEFAULT 'draft',
	`items` text NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
