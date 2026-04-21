ALTER TABLE `trips` ADD `estimatedDistanceKm` decimal(10,2);--> statement-breakpoint
ALTER TABLE `trips` ADD `estimatedDurationMins` int;--> statement-breakpoint
ALTER TABLE `trips` ADD `estimatedFuelLitres` decimal(8,2);--> statement-breakpoint
ALTER TABLE `trips` ADD `estimatedFuelCost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `trips` ADD `loadFactor` decimal(4,2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE `trips` ADD `dieselPricePerLitre` decimal(6,2);--> statement-breakpoint
ALTER TABLE `trips` ADD `actualFuelLitres` decimal(8,2);--> statement-breakpoint
ALTER TABLE `trips` ADD `actualFuelCost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `trucks` ADD `fuelEfficiencyKmL` decimal(6,2);--> statement-breakpoint
ALTER TABLE `trucks` ADD `loadCapacityTons` decimal(8,2);--> statement-breakpoint
ALTER TABLE `trucks` ADD `avgFuelEfficiencyKmL` decimal(6,2);--> statement-breakpoint
ALTER TABLE `trucks` ADD `fuelEfficiencySampleCount` int DEFAULT 0;