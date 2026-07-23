CREATE INDEX `assets_project_idx` ON `assets` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `shots_project_idx` ON `shots` (`project_id`,`position`);