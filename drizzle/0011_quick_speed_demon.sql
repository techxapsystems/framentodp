DROP INDEX `idx_conductorTipo` ON `orientations`;--> statement-breakpoint
DROP INDEX `idx_criadoEm` ON `orientations`;--> statement-breakpoint
ALTER TABLE `orientations` ADD `licensePlate` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `operacao` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `observacao` text NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `usuarioId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `usuarioNome` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `usuarioEmail` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `dataOrientacao` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `advertenciaGerada` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orientations` ADD `warningId` int;--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `orientations` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_dataOrientacao` ON `orientations` (`dataOrientacao`);--> statement-breakpoint
CREATE INDEX `idx_operacao` ON `orientations` (`operacao`);--> statement-breakpoint
ALTER TABLE `orientations` DROP COLUMN `tipo`;--> statement-breakpoint
ALTER TABLE `orientations` DROP COLUMN `motivo`;--> statement-breakpoint
ALTER TABLE `orientations` DROP COLUMN `orientadoPor`;