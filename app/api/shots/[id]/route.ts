import type { Shot } from "../../../../lib/project-template";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as Partial<Shot>;
  return Response.json({ shot: { ...payload, id, updatedAt: new Date().toISOString() }, storage: "browser-session" });
}
