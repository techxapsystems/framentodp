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
CREATE TABLE `template_usage_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`warningId` int,
	`userId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_usage_history_id` PRIMARY KEY(`id`)
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
CREATE INDEX `idx_type` ON `model_categories` (`type`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `model_categories` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_templateId` ON `template_usage_history` (`templateId`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `template_usage_history` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_usedAt` ON `template_usage_history` (`usedAt`);--> statement-breakpoint
CREATE INDEX `idx_categoryId` ON `warning_templates` (`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `warning_templates` (`type`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `warning_templates` (`isActive`);