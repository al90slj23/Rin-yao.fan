-- Drop existing IPTV tables with incorrect column names
DROP TABLE IF EXISTS `iptv_channels`;
DROP TABLE IF EXISTS `iptv_sources`;

-- Recreate with correct column names
CREATE TABLE IF NOT EXISTS `iptv_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`lastFetch` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `iptv_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo` text,
	`url` text NOT NULL,
	`group` text,
	`source_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `iptv_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
UPDATE `info` SET `value` = '6' WHERE `key` = 'migration_version';
