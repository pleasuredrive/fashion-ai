CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`shot_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`mime_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`bytes` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`concept` text NOT NULL,
	`audience` text DEFAULT 'Fashion founders' NOT NULL,
	`style` text DEFAULT 'Quiet luxury editorial' NOT NULL,
	`palette` text DEFAULT 'Espresso, oat, oxblood' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`planner_model` text DEFAULT 'gemini-3.5-flash-lite' NOT NULL,
	`image_model` text DEFAULT 'gemini-3.1-flash-image' NOT NULL,
	`video_model` text DEFAULT 'gemini-omni-flash-preview' NOT NULL,
	`shot_count` integer DEFAULT 12 NOT NULL,
	`duration_seconds` integer DEFAULT 6 NOT NULL,
	`estimated_cost` real DEFAULT 7.2 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`frame_prompt` text NOT NULL,
	`video_prompt` text NOT NULL,
	`motion` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`frame_asset_id` text,
	`video_asset_id` text,
	`error_message` text,
	`updated_at` text NOT NULL
);
