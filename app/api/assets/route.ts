import { getStudioEnv, saveAsset } from "../../../lib/storage";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const { DB, MEDIA } = getStudioEnv();
  if (!DB || !MEDIA) return Response.json({ error: "D1 or R2 storage is not configured" }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  const projectId = String(form.get("projectId") || "");
  const kind = String(form.get("kind") || "reference");
  const shotId = form.get("shotId") ? String(form.get("shotId")) : null;
  if (!(file instanceof File) || !projectId) return Response.json({ error: "file and projectId are required" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "Reference files must be 15MB or smaller" }, { status: 413 });
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return Response.json({ error: "Only image and video files are supported" }, { status: 415 });

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const r2Key = `${projectId}/${kind}/${id}-${safeName}`;
  await MEDIA.put(r2Key, file.stream(), { httpMetadata: { contentType: file.type } });
  const asset = await saveAsset(DB, { id, projectId, shotId, kind, name: file.name, mimeType: file.type, r2Key, bytes: file.size });
  return Response.json({ asset, url: `/api/assets/${id}` }, { status: 201 });
}
