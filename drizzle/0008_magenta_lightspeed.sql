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
CREATE INDEX `idx_warningId` ON `warning_pdf_history` (`warningId`);--> statement-breakpoint
CREATE INDEX `idx_conductorName` ON `warning_pdf_history` (`conductorName`);--> statement-breakpoint
CREATE INDEX `idx_criadoEm` ON `warning_pdf_history` (`criadoEm`);