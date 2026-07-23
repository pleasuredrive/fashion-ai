import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  concept: text("concept").notNull(),
  audience: text("audience").notNull().default("Fashion founders"),
  style: text("style").notNull().default("Quiet luxury editorial"),
  palette: text("palette").notNull().default("Espresso, oat, oxblood"),
  status: text("status").notNull().default("draft"),
  plannerModel: text("planner_model").notNull().default("gemini-3.5-flash-lite"),
  imageModel: text("image_model").notNull().default("gemini-3.1-flash-image"),
  videoModel: text("video_model").notNull().default("gemini-omni-flash-preview"),
  shotCount: integer("shot_count").notNull().default(12),
  durationSeconds: integer("duration_seconds").notNull().default(6),
  estimatedCost: real("estimated_cost").notNull().default(7.2),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const shots = sqliteTable("shots", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  framePrompt: text("frame_prompt").notNull(),
  videoPrompt: text("video_prompt").notNull(),
  motion: text("motion").notNull(),
  status: text("status").notNull().default("draft"),
  frameAssetId: text("frame_asset_id"),
  videoAssetId: text("video_asset_id"),
  errorMessage: text("error_message"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("shots_project_idx").on(table.projectId, table.position)]);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  shotId: text("shot_id"),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  r2Key: text("r2_key").notNull(),
  bytes: integer("bytes").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, (table) => [index("assets_project_idx").on(table.projectId, table.createdAt)]);
