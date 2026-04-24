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
CREATE INDEX `idx_cpf` ON `administrative_employees` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_nome` ON `administrative_employees` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_cargo` ON `administrative_employees` (`cargo`);