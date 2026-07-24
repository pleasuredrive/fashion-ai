const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

export const GEMINI_MODELS = {
  planner: "gemini-3.5-flash-lite",
  image: "gemini-3.1-flash-image",
  video: "gemini-omni-flash-preview",
} as const;

export function getGeminiMode() {
  return getRuntimeKey() ? "live" : "mock";
}

function getRuntimeKey() {
  return process.env.GEMINI_API_KEY;
}

export function getGeminiApiKey() {
  const key = getRuntimeKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

async function googleRequest(path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": getGeminiApiKey() },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 800)}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

function outputBlock(payload: Record<string, unknown>, type: "image" | "video") {
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  for (const step of steps as Array<Record<string, unknown>>) {
    if (step.type !== "model_output" || !Array.isArray(step.content)) continue;
    const block = (step.content as Array<Record<string, unknown>>).find((item) => item.type === type);
    if (block) return block;
  }
  throw new Error(`Gemini returned no ${type} output`);
}

export async function generateFrame(prompt: string, references: Array<{ data: string; mimeType: string }> = [], signal?: AbortSignal) {
  const input: Array<Record<string, unknown>> = references.map((ref) => ({ type: "image", data: ref.data, mime_type: ref.mimeType }));
  input.push({ type: "text", text: prompt });
  const payload = await googleRequest("/interactions", {
    model: GEMINI_MODELS.image,
    input,
    response_format: { type: "image", aspect_ratio: "9:16", image_size: "1K" },
  }, signal);
  return outputBlock(payload, "image") as { data?: string; uri?: string; mime_type?: string };
}

export async function generateVideo(prompt: string, reference?: { data: string; mimeType: string }, signal?: AbortSignal) {
  const input = reference
    ? [
        { type: "image", data: reference.data, mime_type: reference.mimeType },
        { type: "text", text: prompt },
      ]
    : prompt;
  const payload = await googleRequest("/interactions", {
    model: GEMINI_MODELS.video,
    input,
    generation_config: { video_config: { task: reference ? "image_to_video" : "text_to_video" } },
    response_format: { type: "video", aspect_ratio: "9:16", delivery: "uri" },
    background: false,
    store: false,
    stream: false,
  }, signal);
  return outputBlock(payload, "video") as { data?: string; uri?: string; mime_type?: string };
}

export function decodeBase64(data: string) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}
