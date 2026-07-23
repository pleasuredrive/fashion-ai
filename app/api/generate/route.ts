import { decodeBase64, encodeBase64, generateFrame, generateVideo, getGeminiMode } from "../../../lib/gemini";
import { ensureSchema, getStudioEnv, saveAsset, updateShot } from "../../../lib/storage";

type GeneratePayload = { projectId?: string; shotId?: string; kind?: "frame" | "video"; prompt?: string };

export async function POST(request: Request) {
  const payload = (await request.json()) as GeneratePayload;
  const { projectId, shotId, kind, prompt } = payload;
  if (!projectId || !shotId || !kind || !prompt) return Response.json({ error: "projectId, shotId, kind and prompt are required" }, { status: 400 });
  const { DB, MEDIA } = getStudioEnv();
  if (!DB || !MEDIA) return Response.json({ error: "D1 or R2 storage is not configured" }, { status: 503 });

  if (getGeminiMode() === "mock") {
    await updateShot(DB, shotId, { status: "complete" });
    return Response.json({ mode: "mock", shotId, kind, status: "complete" });
  }

  try {
    await updateShot(DB, shotId, { status: "generating", errorMessage: null });
    await ensureSchema(DB);
    let output;
    if (kind === "frame") {
      const referenceRows = await DB.prepare("SELECT r2_key, mime_type FROM assets WHERE project_id = ? AND kind NOT LIKE 'generated-%' AND mime_type LIKE 'image/%' ORDER BY created_at DESC LIMIT 4")
        .bind(projectId).all<{ r2_key: string; mime_type: string }>();
      const references: Array<{ data: string; mimeType: string }> = [];
      for (const row of referenceRows.results) {
        const object = await MEDIA.get(row.r2_key);
        if (!object) continue;
        references.push({ data: encodeBase64(new Uint8Array(await object.arrayBuffer())), mimeType: row.mime_type });
      }
      output = await generateFrame(prompt, references);
    } else {
      const frame = await DB.prepare(`SELECT a.r2_key, a.mime_type FROM shots s LEFT JOIN assets a ON a.id = s.frame_asset_id WHERE s.id = ?`)
        .bind(shotId).first<{ r2_key?: string; mime_type?: string }>();
      let reference: { data: string; mimeType: string } | undefined;
      if (frame?.r2_key && frame.mime_type) {
        const object = await MEDIA.get(frame.r2_key);
        if (object) reference = { data: encodeBase64(new Uint8Array(await object.arrayBuffer())), mimeType: frame.mime_type };
      }
      output = await generateVideo(prompt, reference);
    }
    if (!output.data) throw new Error("Gemini returned a remote URI. Inline delivery is required for this first release.");
    const bytes = decodeBase64(output.data);
    const mimeType = output.mime_type || (kind === "frame" ? "image/png" : "video/mp4");
    const extension = kind === "frame" ? "png" : "mp4";
    const assetId = crypto.randomUUID();
    const r2Key = `${projectId}/generated/${shotId}-${assetId}.${extension}`;
    await MEDIA.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } });
    await saveAsset(DB, { id: assetId, projectId, shotId, kind: kind === "frame" ? "generated-frame" : "generated-video", name: `shot-${shotId}.${extension}`, mimeType, r2Key, bytes: bytes.byteLength });
    const shot = await updateShot(DB, shotId, kind === "frame" ? { status: "ready", frameAssetId: assetId } : { status: "complete", videoAssetId: assetId });
    return Response.json({ mode: "live", shot, assetId, url: `/api/assets/${assetId}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    await updateShot(DB, shotId, { status: "failed", errorMessage: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
