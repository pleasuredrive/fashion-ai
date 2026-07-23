import { GEMINI_MODELS, getGeminiMode } from "../../../lib/gemini";

export async function GET() {
  return Response.json({
    mode: getGeminiMode(),
    models: GEMINI_MODELS,
    pricing: {
      videoPerSecond: 0.1,
      frameEstimate: 0.067,
      clips: 12,
      secondsPerClip: 6,
      videoTotal: 7.2,
      fullPipelineEstimate: 8.0,
    },
  });
}
