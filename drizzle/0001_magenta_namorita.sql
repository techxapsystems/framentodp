CREATE TABLE `administrative_employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cadastro` varchar(50) NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`admissao` varchar(50) NOT NULL,
	`cargo` varchar(255) NOT NULL,
	`situacao` varchar(100) NOT NULL,
	`cpf` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `administrative_employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `administrative_employees_cpf_unique` UNIQUE(`cpf`)
);
--> statement-breakpoint
CREATE TABLE `ai_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`dataInicio` timestamp NOT NULL,
	`dataFim` timestamp NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`conteudo` text NOT NULL,
	`tipo` enum('comportamento','alerta','recomendacao') NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`userEmail` varchar(320) NOT NULL,
	`action` varchar(100) NOT NULL,
	`resource` varchar(100) NOT NULL,
	`resourceId` int,
	`description` text NOT NULL,
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failed','warning') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cleanup_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource` varchar(100) NOT NULL,
	`recordsDeleted` int NOT NULL,
	`deletedBefore` timestamp NOT NULL,
	`executedBy` varchar(320),
	`isAutomatic` boolean NOT NULL DEFAULT true,
	`status` enum('success','failed','partial') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cleanup_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conductors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpf` varchar(20) NOT NULL,
	`ctps` varchar(50),
	`matricula` varchar(50) NOT NULL,
	`operacao` varchar(255) NOT NULL,
	`cargo` varchar(255) NOT NULL,
	`placa` varchar(50) NOT NULL,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conductors_id` PRIMARY KEY(`id`),
	CONSTRAINT `conductors_cpf_unique` UNIQUE(`cpf`)
);
--> statement-breakpoint
CREATE TABLE `configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`limitePoucoRodadoMin` int NOT NULL DEFAULT 120,
	`limiteHeAlertaMin` int NOT NULL DEFAULT 90,
	`janelaReincidenciaDias` int NOT NULL DEFAULT 7,
	`janelaCronicoDias` int NOT NULL DEFAULT 30,
	`thresholdPoucoRodado1` int NOT NULL DEFAULT 1,
	`thresholdPoucoRodado2` int NOT NULL DEFAULT 2,
	`thresholdPoucoRodado3` int NOT NULL DEFAULT 3,
	`thresholdPouco30d` int NOT NULL DEFAULT 5,
	`thresholdHe30d` int NOT NULL DEFAULT 5,
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_allowlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_allowlist_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_allowlist_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`gestorEmail` varchar(320) NOT NULL,
	`tipo` enum('pouco_rodado','horas_extras','insight') NOT NULL,
	`assunto` varchar(255) NOT NULL,
	`conteudo` text NOT NULL,
	`status` enum('enviado','falha','pendente') NOT NULL DEFAULT 'pendente',
	`tentativas` int NOT NULL DEFAULT 0,
	`proximaTentativa` timestamp,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`enviadoEm` timestamp,
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hourly_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`motoristaNome` varchar(255) NOT NULL,
	`cargo` varchar(100) NOT NULL,
	`cpf` varchar(20),
	`matricula` varchar(50),
	`data` timestamp NOT NULL,
	`zeramento` varchar(50),
	`credito` varchar(50),
	`debito` varchar(50),
	`saldo` varchar(50) NOT NULL,
	`saldoMinutos` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hourly_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hourly_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`totalRecords` int DEFAULT 0,
	`status` enum('pendente','processado','erro') DEFAULT 'pendente',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hourly_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileHash` varchar(64) NOT NULL,
	`rowCount` int NOT NULL,
	`newRowsCount` int NOT NULL,
	`importedBy` varchar(64) NOT NULL,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` int NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`gestorName` varchar(255),
	`operacao` varchar(255),
	`cargo` varchar(255),
	`placa` varchar(50),
	`data` timestamp NOT NULL,
	`inicioJornada` timestamp,
	`fimJornada` timestamp,
	`dirigidoMin` int NOT NULL DEFAULT 0,
	`he50Min` int NOT NULL DEFAULT 0,
	`he100Min` int NOT NULL DEFAULT 0,
	`heMin` int NOT NULL DEFAULT 0,
	`tempoEsperaMin` int NOT NULL DEFAULT 0,
	`tempoDescansoMin` int NOT NULL DEFAULT 0,
	`poucoRodado` boolean NOT NULL DEFAULT false,
	`temHe` boolean NOT NULL DEFAULT false,
	`heAlerta` boolean NOT NULL DEFAULT false,
	`tratativaOperacional` text,
	`rawData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`type` enum('advertencia','suspensao') NOT NULL,
	`icon` varchar(50),
	`color` varchar(7),
	`order` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `model_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `model_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `orientations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`licensePlate` varchar(20) NOT NULL,
	`operacao` varchar(255) NOT NULL,
	`observacao` text NOT NULL,
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255) NOT NULL,
	`usuarioEmail` varchar(320) NOT NULL,
	`dataOrientacao` timestamp NOT NULL DEFAULT (now()),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`advertenciaGerada` boolean NOT NULL DEFAULT false,
	`warningId` int,
	CONSTRAINT `orientations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurrences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`data` timestamp NOT NULL,
	`ocorPoucoJanela` int NOT NULL DEFAULT 0,
	`ocorPouco30d` int NOT NULL DEFAULT 0,
	`ocorHeJanela` int NOT NULL DEFAULT 0,
	`ocorHe30d` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurrences_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_conductor_data` UNIQUE(`conductorName`,`data`)
);
--> statement-breakpoint
CREATE TABLE `retention_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource` varchar(100) NOT NULL,
	`retentionDays` int NOT NULL DEFAULT 90,
	`enabled` boolean NOT NULL DEFAULT true,
	`autoDelete` boolean NOT NULL DEFAULT true,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retention_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `retention_policies_resource_unique` UNIQUE(`resource`)
);
--> statement-breakpoint
CREATE TABLE `suggested_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journeyId` int NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`data` timestamp NOT NULL,
	`tipo` enum('advertencia','suspensao','pouco_rodado','horas_extras') NOT NULL,
	`acao` text NOT NULL,
	`severidade` enum('info','warning','critical') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suggested_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_usage_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`warningId` int,
	`userId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_usage_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treatments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journeyId` int NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`data` timestamp NOT NULL,
	`tipo` enum('advertencia','suspensao','pouco_rodado','horas_extras') NOT NULL,
	`status` enum('pendente','em_andamento','resolvido','ignorado') NOT NULL DEFAULT 'pendente',
	`observacao` text,
	`atualizadoPor` int,
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treatments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_journey_tipo` UNIQUE(`journeyId`,`tipo`)
);
--> statement-breakpoint
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
CREATE TABLE `warning_pdf_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warningId` int NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`licensePlate` varchar(20) NOT NULL,
	`operacao` varchar(255) NOT NULL,
	`pdfUrl` text NOT NULL,
	`pdfKey` varchar(512) NOT NULL,
	`fileSize` int NOT NULL,
	`geradoPor` varchar(320) NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warning_pdf_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warning_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('advertencia','suspensao') NOT NULL,
	`content` text NOT NULL,
	`summary` varchar(500),
	`tags` varchar(500),
	`sourceFile` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warning_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`tipo` enum('advertencia','suspensao') NOT NULL,
	`categoria` enum('pouco_rodado','horas_extras','outro') DEFAULT 'outro',
	`nivelAdvertencia` int NOT NULL,
	`motivo` text NOT NULL,
	`observacao` text,
	`aplicadoPor` varchar(320) NOT NULL,
	`advertenciaGerada` boolean NOT NULL DEFAULT true,
	`advertenciaAplicada` boolean NOT NULL DEFAULT false,
	`dataAplicacao` timestamp,
	`geradaAutomaticamente` boolean NOT NULL DEFAULT false,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`tipoColaborador` varchar(100),
	`dataAnotacao` timestamp,
	`sequencia` varchar(20),
	`tipoAnotacao` varchar(100),
	`codigoTreinamento` varchar(50),
	`numeroDocumento` varchar(50),
	`empresaResponsavel` varchar(255),
	`tipoResponsavel` varchar(100),
	`responsavelAnotacao` varchar(255),
	`dataInicio` timestamp,
	`dataFim` timestamp,
	`dataRetorno` timestamp,
	CONSTRAINT `warnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','gestor') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(100) DEFAULT 'geral';--> statement-breakpoint
ALTER TABLE `users` ADD `modules` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('ativo','inativo') DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `idx_cpf` ON `administrative_employees` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_nome` ON `administrative_employees` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_cargo` ON `administrative_employees` (`cargo`);--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `ai_insights` (`conductorName`,`dataInicio`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_resource` ON `audit_logs` (`resource`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_userIdCreatedAt` ON `audit_logs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_resource` ON `cleanup_history` (`resource`);--> statement-breakpoint
CREATE INDEX `idx_executedAt` ON `cleanup_history` (`executedAt`);--> statement-breakpoint
CREATE INDEX `idx_cpf` ON `conductors` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_operacao` ON `conductors` (`operacao`);--> statement-breakpoint
CREATE INDEX `idx_nome` ON `conductors` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `email_allowlist` (`email`);--> statement-breakpoint
CREATE INDEX `idx_gestorEmail` ON `email_logs` (`gestorEmail`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `email_logs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `email_logs` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_uploadId` ON `hourly_records` (`uploadId`);--> statement-breakpoint
CREATE INDEX `idx_motoristaNome` ON `hourly_records` (`motoristaNome`);--> statement-breakpoint
CREATE INDEX `idx_cargo` ON `hourly_records` (`cargo`);--> statement-breakpoint
CREATE INDEX `idx_data` ON `hourly_records` (`data`);--> statement-breakpoint
CREATE INDEX `idx_saldoMinutos` ON `hourly_records` (`saldoMinutos`);--> statement-breakpoint
CREATE INDEX `idx_uploadedAt` ON `hourly_uploads` (`uploadedAt`);--> statement-breakpoint
CREATE INDEX `idx_periodStart` ON `hourly_uploads` (`periodStart`);--> statement-breakpoint
CREATE INDEX `idx_fileName` ON `imports` (`fileName`);--> statement-breakpoint
CREATE INDEX `idx_importedAt` ON `imports` (`importedAt`);--> statement-breakpoint
CREATE INDEX `idx_data` ON `journeys` (`data`);--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `journeys` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_gestorName` ON `journeys` (`gestorName`);--> statement-breakpoint
CREATE INDEX `idx_poucoRodado` ON `journeys` (`poucoRodado`);--> statement-breakpoint
CREATE INDEX `idx_temHe` ON `journeys` (`temHe`);--> statement-breakpoint
CREATE INDEX `idx_heAlerta` ON `journeys` (`heAlerta`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `model_categories` (`type`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `model_categories` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `orientations` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_dataOrientacao` ON `orientations` (`dataOrientacao`);--> statement-breakpoint
CREATE INDEX `idx_operacao` ON `orientations` (`operacao`);--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `recurrences` (`conductorName`,`data`);--> statement-breakpoint
CREATE INDEX `idx_resource` ON `retention_policies` (`resource`);--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `suggested_actions` (`conductorName`,`data`);--> statement-breakpoint
CREATE INDEX `idx_tipo` ON `suggested_actions` (`tipo`);--> statement-breakpoint
CREATE INDEX `idx_templateId` ON `template_usage_history` (`templateId`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `template_usage_history` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_usedAt` ON `template_usage_history` (`usedAt`);--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `treatments` (`conductorName`,`data`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `treatments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tipo` ON `treatments` (`tipo`);--> statement-breakpoint
CREATE INDEX `idx_warningId` ON `warning_audit_log` (`warningId`);--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `warning_audit_log` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_usuarioId` ON `warning_audit_log` (`usuarioId`);--> statement-breakpoint
CREATE INDEX `idx_acao` ON `warning_audit_log` (`acao`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `warning_audit_log` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_warningId` ON `warning_pdf_history` (`warningId`);--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `warning_pdf_history` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `warning_pdf_history` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_categoryId` ON `warning_templates` (`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `warning_templates` (`type`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `warning_templates` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_conductorTipo` ON `warnings` (`conductorName`,`tipo`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `warnings` (`criadoEm`);