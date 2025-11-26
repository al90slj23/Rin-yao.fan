-- Insert default demo IPTV source
INSERT OR IGNORE INTO `iptv_sources` (id, name, url, enabled)
VALUES ('local_demo', 'Demo Channels (Local)', 'local://demo', 1);
--> statement-breakpoint
UPDATE `info` SET `value` = '7' WHERE `key` = 'migration_version';
