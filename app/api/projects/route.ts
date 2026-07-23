import { createProject, getStudioEnv, listProjects } from "../../../lib/storage";

export async function GET() {
  const { DB } = getStudioEnv();
  if (!DB) return Response.json({ projects: [], storage: "unavailable" });
  try {
    return Response.json({ projects: await listProjects(DB), storage: "d1" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { DB } = getStudioEnv();
  if (!DB) return Response.json({ error: "D1 is not configured" }, { status: 503 });
  try {
    const payload = await request.json();
    return Response.json(await createProject(DB, payload), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create project" }, { status: 500 });
  }
}
