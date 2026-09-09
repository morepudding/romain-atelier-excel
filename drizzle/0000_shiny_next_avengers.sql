CREATE TABLE `sector_notes` (
	`user_id` text NOT NULL,
	`sector_id` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`priority` integer NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `sector_id`)
);
