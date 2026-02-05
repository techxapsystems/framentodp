ALTER TABLE `warnings` ADD `advertenciaGerada` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `warnings` ADD `advertenciaAplicada` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `warnings` ADD `dataAplicacao` timestamp;