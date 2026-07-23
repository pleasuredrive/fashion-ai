export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json({ error: `Project ${id} is stored in the current browser session` }, { status: 404 });
}
