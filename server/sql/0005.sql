CREATE TABLE IF NOT EXISTS `iptv_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`lastFetch` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `iptv_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo` text,
	`url` text NOT NULL,
	`group` text,
	`sourceId` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`sourceId`) REFERENCES `iptv_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
UPDATE `info` SET `value` = '5' WHERE `key` = 'migration_version';
