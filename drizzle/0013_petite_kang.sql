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
CREATE INDEX `idx_userId` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_resource` ON `audit_logs` (`resource`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_userIdCreatedAt` ON `audit_logs` (`userId`,`createdAt`);