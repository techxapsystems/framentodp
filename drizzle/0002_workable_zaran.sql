CREATE TABLE `warnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`tipo` enum('pouco_rodado','horas_extras') NOT NULL,
	`nivelAdvertencia` int NOT NULL,
	`motivo` text NOT NULL,
	`observacao` text,
	`aplicadoPor` varchar(320) NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_conductorTipo` ON `warnings` (`conductorName`,`tipo`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `warnings` (`criadoEm`);