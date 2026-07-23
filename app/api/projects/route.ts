import { createDraftProject, type Project } from "../../../lib/project-template";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ projects: [], storage: "browser-session" });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<Project>;
    return Response.json({ ...createDraftProject(payload), storage: "browser-session" }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create project" }, { status: 400 });
  }
}
