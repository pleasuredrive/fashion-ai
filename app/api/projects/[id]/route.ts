import { getProjectBundle, getStudioEnv } from "../../../../lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { DB } = getStudioEnv();
  if (!DB) return Response.json({ error: "D1 is not configured" }, { status: 503 });
  const bundle = await getProjectBundle(DB, id);
  return bundle ? Response.json(bundle) : Response.json({ error: "Project not found" }, { status: 404 });
}
