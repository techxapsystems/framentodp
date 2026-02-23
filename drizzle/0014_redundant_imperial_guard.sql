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
CREATE INDEX `idx_resource` ON `cleanup_history` (`resource`);--> statement-breakpoint
CREATE INDEX `idx_executedAt` ON `cleanup_history` (`executedAt`);--> statement-breakpoint
CREATE INDEX `idx_resource` ON `retention_policies` (`resource`);