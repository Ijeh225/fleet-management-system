ALTER TABLE `trips` ADD `containerSize` enum('20ft','40ft','40ft_hc');--> statement-breakpoint
ALTER TABLE `trips` DROP COLUMN `loadFactor`;