CREATE TABLE `conductors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpf` varchar(20) NOT NULL,
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
CREATE INDEX `idx_cpf` ON `conductors` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_operacao` ON `conductors` (`operacao`);--> statement-breakpoint
CREATE INDEX `idx_nome` ON `conductors` (`nome`);