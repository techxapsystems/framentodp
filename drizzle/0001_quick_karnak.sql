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
CREATE TABLE `imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileHash` varchar(64) NOT NULL,
	`rowCount` int NOT NULL,
	`newRowsCount` int NOT NULL,
	`importedBy` int NOT NULL,
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
CREATE TABLE `suggested_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journeyId` int NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`data` timestamp NOT NULL,
	`tipo` enum('pouco_rodado','horas_extras') NOT NULL,
	`acao` text NOT NULL,
	`severidade` enum('info','warning','critical') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suggested_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treatments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journeyId` int NOT NULL,
	`conductorName` varchar(255) NOT NULL,
	`data` timestamp NOT NULL,
	`tipo` enum('pouco_rodado','horas_extras') NOT NULL,
	`status` enum('pendente','em_andamento','resolvido','ignorado') NOT NULL DEFAULT 'pendente',
	`observacao` text,
	`atualizadoPor` int,
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treatments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_journey_tipo` UNIQUE(`journeyId`,`tipo`)
);
--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `ai_insights` (`conductorName`,`dataInicio`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `email_allowlist` (`email`);--> statement-breakpoint
CREATE INDEX `idx_gestorEmail` ON `email_logs` (`gestorEmail`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `email_logs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `email_logs` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_fileName` ON `imports` (`fileName`);--> statement-breakpoint
CREATE INDEX `idx_importedAt` ON `imports` (`importedAt`);--> statement-breakpoint
CREATE INDEX `idx_data` ON `journeys` (`data`);--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `journeys` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_gestorName` ON `journeys` (`gestorName`);--> statement-breakpoint
CREATE INDEX `idx_poucoRodado` ON `journeys` (`poucoRodado`);--> statement-breakpoint
CREATE INDEX `idx_temHe` ON `journeys` (`temHe`);--> statement-breakpoint
CREATE INDEX `idx_heAlerta` ON `journeys` (`heAlerta`);--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `recurrences` (`conductorName`,`data`);--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `suggested_actions` (`conductorName`,`data`);--> statement-breakpoint
CREATE INDEX `idx_tipo` ON `suggested_actions` (`tipo`);--> statement-breakpoint
CREATE INDEX `idx_conductorData` ON `treatments` (`conductorName`,`data`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `treatments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tipo` ON `treatments` (`tipo`);