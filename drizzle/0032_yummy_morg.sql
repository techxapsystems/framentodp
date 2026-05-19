CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`operacaoNome` varchar(255) NOT NULL,
	`cnpj` varchar(20) NOT NULL,
	`endereco` varchar(255) NOT NULL,
	`cidade` varchar(100) NOT NULL,
	`uf` varchar(2) NOT NULL,
	`cep` varchar(20) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_operacaoNome_unique` UNIQUE(`operacaoNome`)
);
--> statement-breakpoint
CREATE TABLE `import_batch_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`warningId` int,
	`cpf` varchar(20) NOT NULL,
	`nomeConductor` varchar(255) NOT NULL,
	`operacao` varchar(255) NOT NULL,
	`totalOcorrencias` int NOT NULL,
	`infracoesDetectadas` text,
	`status` enum('sucesso','erro','sem_infracao') NOT NULL,
	`mensagemErro` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_batch_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`hashArquivo` varchar(64) NOT NULL,
	`totalLinhas` int NOT NULL,
	`totalMotoristas` int NOT NULL,
	`totalAdvertenciasGeradas` int NOT NULL DEFAULT 0,
	`totalErros` int NOT NULL DEFAULT 0,
	`totalSemInfracao` int NOT NULL DEFAULT 0,
	`status` enum('processando','concluido','erro') NOT NULL DEFAULT 'processando',
	`mensagemErro` text,
	`importadoPor` varchar(320) NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`concluidoEm` timestamp,
	CONSTRAINT `import_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_operacaoNome` ON `branches` (`operacaoNome`);--> statement-breakpoint
CREATE INDEX `idx_cnpj` ON `branches` (`cnpj`);--> statement-breakpoint
CREATE INDEX `idx_batchId` ON `import_batch_details` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_warningId` ON `import_batch_details` (`warningId`);--> statement-breakpoint
CREATE INDEX `idx_cpf` ON `import_batch_details` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `import_batches` (`status`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `import_batches` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_importadoPor` ON `import_batches` (`importadoPor`);