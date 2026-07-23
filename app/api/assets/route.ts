export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const projectId = String(form.get("projectId") || "");
  const kind = String(form.get("kind") || "reference");
  if (!(file instanceof File) || !projectId) return Response.json({ error: "file and projectId are required" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "Reference files must be 15MB or smaller" }, { status: 413 });
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return Response.json({ error: "Only image and video files are supported" }, { status: 415 });
  return Response.json({
    asset: { id: crypto.randomUUID(), projectId, kind, name: file.name, mimeType: file.type, bytes: file.size },
    storage: "browser-session",
  }, { status: 201 });
}
