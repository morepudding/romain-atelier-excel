CREATE TABLE `campaign_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`name` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`contact_role` text DEFAULT '' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`assumed_problem` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'research' NOT NULL,
	`last_contact` text,
	`next_action` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign_interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text NOT NULL,
	`hypothesis` text DEFAULT '' NOT NULL,
	`questions` text DEFAULT '' NOT NULL,
	`scheduled_at` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`last_occurrence` text DEFAULT '' NOT NULL,
	`consequences` text DEFAULT '' NOT NULL,
	`tried` text DEFAULT '' NOT NULL,
	`decision_maker` text DEFAULT '' NOT NULL,
	`follow_up` integer DEFAULT 0 NOT NULL,
	`exact_quote` text DEFAULT '' NOT NULL,
	`themes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`audience` text DEFAULT '' NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`intervention` text DEFAULT '' NOT NULL,
	`deliverables` text DEFAULT '' NOT NULL,
	`without_risk` text DEFAULT '' NOT NULL,
	`stop_condition` text DEFAULT '' NOT NULL,
	`demo_available` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`frequency` integer DEFAULT 0 NOT NULL,
	`severity` integer DEFAULT 0 NOT NULL,
	`urgency` integer DEFAULT 0 NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`access` integer DEFAULT 0 NOT NULL,
	`fit` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
