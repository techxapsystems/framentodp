DROP TABLE `infraction_types`;--> statement-breakpoint
DROP INDEX `idx_assinada` ON `warnings`;--> statement-breakpoint
ALTER TABLE `warnings` DROP COLUMN `assinada`;--> statement-breakpoint
ALTER TABLE `warnings` DROP COLUMN `dataAssinatura`;--> statement-breakpoint
ALTER TABLE `warnings` DROP COLUMN `assinadaPor`;