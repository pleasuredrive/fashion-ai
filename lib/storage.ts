import { env } from "cloudflare:workers";
import { buildShots, type Project, type Shot } from "./project-template";

type StudioEnv = { DB?: D1Database; MEDIA?: R2Bucket };

export function getStudioEnv() {
  return env as unknown as StudioEnv;
}

export async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, concept TEXT NOT NULL,
      audience TEXT NOT NULL, style TEXT NOT NULL, palette TEXT NOT NULL,
      status TEXT NOT NULL, planner_model TEXT NOT NULL, image_model TEXT NOT NULL,
      video_model TEXT NOT NULL, shot_count INTEGER NOT NULL, duration_seconds INTEGER NOT NULL,
      estimated_cost REAL NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS shots (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, position INTEGER NOT NULL,
      title TEXT NOT NULL, frame_prompt TEXT NOT NULL, video_prompt TEXT NOT NULL,
      motion TEXT NOT NULL, status TEXT NOT NULL, frame_asset_id TEXT,
      video_asset_id TEXT, error_message TEXT, updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, shot_id TEXT, kind TEXT NOT NULL,
      name TEXT NOT NULL, mime_type TEXT NOT NULL, r2_key TEXT NOT NULL,
      bytes INTEGER NOT NULL, created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS shots_project_idx ON shots(project_id, position)"),
    db.prepare("CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project_id, created_at)"),
  ]);
}

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id), title: String(row.title), concept: String(row.concept),
    audience: String(row.audience), style: String(row.style), palette: String(row.palette),
    status: String(row.status), plannerModel: String(row.planner_model),
    imageModel: String(row.image_model), videoModel: String(row.video_model),
    shotCount: Number(row.shot_count), durationSeconds: Number(row.duration_seconds),
    estimatedCost: Number(row.estimated_cost), createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapShot(row: Record<string, unknown>): Shot {
  return {
    id: String(row.id), projectId: String(row.project_id), position: Number(row.position),
    title: String(row.title), framePrompt: String(row.frame_prompt),
    videoPrompt: String(row.video_prompt), motion: String(row.motion),
    status: String(row.status) as Shot["status"],
    frameAssetId: row.frame_asset_id ? String(row.frame_asset_id) : null,
    videoAssetId: row.video_asset_id ? String(row.video_asset_id) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    updatedAt: String(row.updated_at),
  };
}

export async function listProjects(db: D1Database) {
  await ensureSchema(db);
  const rows = await db.prepare("SELECT * FROM projects ORDER BY updated_at DESC LIMIT 30").all<Record<string, unknown>>();
  return rows.results.map(mapProject);
}

export async function getProjectBundle(db: D1Database, id: string) {
  await ensureSchema(db);
  const projectRow = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!projectRow) return null;
  const shotRows = await db.prepare("SELECT * FROM shots WHERE project_id = ? ORDER BY position").bind(id).all<Record<string, unknown>>();
  const assetRows = await db.prepare("SELECT * FROM assets WHERE project_id = ? ORDER BY created_at DESC").bind(id).all<Record<string, unknown>>();
  return { project: mapProject(projectRow), shots: shotRows.results.map(mapShot), assets: assetRows.results };
}

export async function createProject(db: D1Database, input: Partial<Project>) {
  await ensureSchema(db);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const project: Project = {
    id,
    title: input.title?.trim() || "Untitled founder reel",
    concept: input.concept?.trim() || "A founder moving with calm purpose through a warm contemporary studio",
    audience: input.audience?.trim() || "Founders and creative operators",
    style: input.style?.trim() || "Quiet luxury editorial, tactile and cinematic",
    palette: input.palette?.trim() || "Charcoal, warm cream, walnut, oxblood",
    status: "ready",
    plannerModel: "gemini-3.5-flash-lite",
    imageModel: "gemini-3.1-flash-image",
    videoModel: "gemini-omni-flash-preview",
    shotCount: 12,
    durationSeconds: 6,
    estimatedCost: 7.2,
    createdAt: now,
    updatedAt: now,
  };
  const shotList = buildShots(id, project.concept, project.style);
  await db.batch([
    db.prepare(`INSERT INTO projects (id,title,concept,audience,style,palette,status,planner_model,image_model,video_model,shot_count,duration_seconds,estimated_cost,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(project.id, project.title, project.concept, project.audience, project.style, project.palette, project.status, project.plannerModel, project.imageModel, project.videoModel, project.shotCount, project.durationSeconds, project.estimatedCost, project.createdAt, project.updatedAt),
    ...shotList.map((shot) => db.prepare(`INSERT INTO shots (id,project_id,position,title,frame_prompt,video_prompt,motion,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(shot.id, shot.projectId, shot.position, shot.title, shot.framePrompt, shot.videoPrompt, shot.motion, shot.status, shot.updatedAt)),
  ]);
  return { project, shots: shotList };
}

export async function updateShot(db: D1Database, id: string, input: Partial<Shot>) {
  await ensureSchema(db);
  const current = await db.prepare("SELECT * FROM shots WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!current) return null;
  const shot = { ...mapShot(current), ...input, id, updatedAt: new Date().toISOString() };
  await db.prepare(`UPDATE shots SET title=?, frame_prompt=?, video_prompt=?, motion=?, status=?, frame_asset_id=?, video_asset_id=?, error_message=?, updated_at=? WHERE id=?`)
    .bind(shot.title, shot.framePrompt, shot.videoPrompt, shot.motion, shot.status, shot.frameAssetId ?? null, shot.videoAssetId ?? null, shot.errorMessage ?? null, shot.updatedAt, id).run();
  return shot;
}

export async function saveAsset(db: D1Database, asset: { id: string; projectId: string; shotId?: string | null; kind: string; name: string; mimeType: string; r2Key: string; bytes: number }) {
  await ensureSchema(db);
  const createdAt = new Date().toISOString();
  await db.prepare("INSERT INTO assets (id,project_id,shot_id,kind,name,mime_type,r2_key,bytes,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(asset.id, asset.projectId, asset.shotId ?? null, asset.kind, asset.name, asset.mimeType, asset.r2Key, asset.bytes, createdAt).run();
  return { ...asset, createdAt };
}
