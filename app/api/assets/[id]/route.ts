import { ensureSchema, getStudioEnv } from "../../../../lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { DB, MEDIA } = getStudioEnv();
  if (!DB || !MEDIA) return new Response("Storage unavailable", { status: 503 });
  await ensureSchema(DB);
  const asset = await DB.prepare("SELECT r2_key, mime_type, name FROM assets WHERE id = ?").bind(id).first<{ r2_key: string; mime_type: string; name: string }>();
  if (!asset) return new Response("Asset not found", { status: 404 });
  const object = await MEDIA.get(asset.r2_key);
  if (!object) return new Response("Asset bytes not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": asset.mime_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${asset.name.replace(/"/g, "")}"`,
    },
  });
}
