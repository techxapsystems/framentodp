CREATE TABLE `infraction_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `infraction_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `infraction_types_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
ALTER TABLE `warnings` ADD `assinada` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `warnings` ADD `dataAssinatura` timestamp;--> statement-breakpoint
ALTER TABLE `warnings` ADD `assinadaPor` varchar(320);--> statement-breakpoint
CREATE INDEX `idx_ativo` ON `infraction_types` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_assinada` ON `warnings` (`assinada`);