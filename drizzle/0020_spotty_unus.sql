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
CREATE INDEX `idx_uploadId` ON `hourly_records` (`uploadId`);--> statement-breakpoint
CREATE INDEX `idx_motoristaNome` ON `hourly_records` (`motoristaNome`);--> statement-breakpoint
CREATE INDEX `idx_cargo` ON `hourly_records` (`cargo`);--> statement-breakpoint
CREATE INDEX `idx_data` ON `hourly_records` (`data`);--> statement-breakpoint
CREATE INDEX `idx_saldoMinutos` ON `hourly_records` (`saldoMinutos`);--> statement-breakpoint
CREATE INDEX `idx_uploadedAt` ON `hourly_uploads` (`uploadedAt`);--> statement-breakpoint
CREATE INDEX `idx_periodStart` ON `hourly_uploads` (`periodStart`);