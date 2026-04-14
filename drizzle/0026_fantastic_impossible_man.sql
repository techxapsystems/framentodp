ALTER TABLE `conductors` ADD `matricula` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `conductors` ADD CONSTRAINT `conductors_matricula_unique` UNIQUE(`matricula`);