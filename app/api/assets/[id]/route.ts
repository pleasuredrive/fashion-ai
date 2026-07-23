export const runtime = "nodejs";

export async function GET() {
  return new Response("Generated media is available from the Gemini file proxy", { status: 404 });
}
