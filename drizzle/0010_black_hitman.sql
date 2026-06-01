ALTER TABLE `orientations` MODIFY COLUMN `tipo` enum('advertencia','suspensao') NOT NULL;--> statement-breakpoint
ALTER TABLE `suggested_actions` MODIFY COLUMN `tipo` enum('advertencia','suspensao') NOT NULL;--> statement-breakpoint
ALTER TABLE `treatments` MODIFY COLUMN `tipo` enum('advertencia','suspensao') NOT NULL;--> statement-breakpoint
ALTER TABLE `warnings` MODIFY COLUMN `tipo` enum('advertencia','suspensao') NOT NULL;