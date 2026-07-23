import { getGeminiApiKey } from "../../../../lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) return new Response("Invalid file id", { status: 400 });
  const apiKey = getGeminiApiKey();
  const headers = { "x-goog-api-key": apiKey };
  const metadata = await fetch(`${API_ROOT}/files/${fileId}`, { headers, cache: "no-store" });
  if (!metadata.ok) return new Response("Unable to read generated file", { status: metadata.status });
  const info = (await metadata.json()) as { state?: string; mimeType?: string; displayName?: string };
  if (info.state === "FAILED") return new Response("Gemini video processing failed", { status: 502 });
  if (info.state !== "ACTIVE") return Response.json({ status: info.state || "PROCESSING", retryAfter: 5 }, { status: 425, headers: { "Retry-After": "5" } });
  const file = await fetch(`${API_ROOT}/files/${fileId}:download?alt=media`, { headers, cache: "no-store" });
  if (!file.ok || !file.body) return new Response("Unable to download generated video", { status: file.status || 502 });
  return new Response(file.body, {
    headers: {
      "Content-Type": info.mimeType || "video/mp4",
      "Content-Disposition": `attachment; filename="${(info.displayName || `twelveframe-${fileId}.mp4`).replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
