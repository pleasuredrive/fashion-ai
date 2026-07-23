import { generateFrame, generateVideo, getGeminiMode } from "../../../lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

type GeneratePayload = {
  projectId?: string;
  shotId?: string;
  kind?: "frame" | "video";
  prompt?: string;
  reference?: { data?: string; mimeType?: string };
};

function getFileId(uri?: string) {
  if (!uri) return null;
  return uri.match(/files\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as GeneratePayload;
  const { projectId, shotId, kind, prompt } = payload;
  if (!projectId || !shotId || !kind || !prompt) return Response.json({ error: "projectId, shotId, kind and prompt are required" }, { status: 400 });

  if (getGeminiMode() === "mock") {
    return Response.json({ mode: "mock", shotId, kind, status: "complete" });
  }

  try {
    if (kind === "frame") {
      const output = await generateFrame(prompt);
      if (!output.data) throw new Error("Gemini returned no inline frame data");
      return Response.json({
        mode: "live",
        shotId,
        kind,
        status: "complete",
        assetId: `frame-${shotId}`,
        asset: { data: output.data, mimeType: output.mime_type || "image/png" },
      });
    }

    const reference = payload.reference?.data && payload.reference.mimeType
      ? { data: payload.reference.data, mimeType: payload.reference.mimeType }
      : undefined;
    const output = await generateVideo(prompt, reference);
    const fileId = getFileId(output.uri);
    if (!fileId) throw new Error("Gemini returned no downloadable video file");
    return Response.json({
      mode: "live",
      shotId,
      kind,
      status: "complete",
      assetId: fileId,
      downloadUrl: `/api/generated/${fileId}`,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 });
  }
}
