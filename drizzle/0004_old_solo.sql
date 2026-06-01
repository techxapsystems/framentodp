CREATE TABLE `orientations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`tipo` enum('pouco_rodado','horas_extras') NOT NULL,
	`motivo` text NOT NULL,
	`orientadoPor` varchar(320) NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orientations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `warnings` ADD `geradaAutomaticamente` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_conductorTipo` ON `orientations` (`conductorName`,`tipo`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `orientations` (`criadoEm`);