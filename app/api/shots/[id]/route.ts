import type { Shot } from "../../../../lib/project-template";
import { getStudioEnv, updateShot } from "../../../../lib/storage";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { DB } = getStudioEnv();
  if (!DB) return Response.json({ error: "D1 is not configured" }, { status: 503 });
  const payload = (await request.json()) as Partial<Shot>;
  const shot = await updateShot(DB, id, payload);
  return shot ? Response.json({ shot }) : Response.json({ error: "Shot not found" }, { status: 404 });
}
