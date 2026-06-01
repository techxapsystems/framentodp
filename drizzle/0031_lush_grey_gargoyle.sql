CREATE TABLE `warning_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warningId` int NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`acao` enum('criado','editado','deletado','assinado') NOT NULL,
	`camposAlterados` text,
	`valorAnterior` text,
	`valorNovo` text,
	`usuarioId` int NOT NULL,
	`usuarioEmail` varchar(320) NOT NULL,
	`usuarioNome` varchar(255) NOT NULL,
	`motivo` text,
	`ipAddress` varchar(45),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warning_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_warningId` ON `warning_audit_log` (`warningId`);--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `warning_audit_log` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_usuarioId` ON `warning_audit_log` (`usuarioId`);--> statement-breakpoint
CREATE INDEX `idx_acao` ON `warning_audit_log` (`acao`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `warning_audit_log` (`criadoEm`);