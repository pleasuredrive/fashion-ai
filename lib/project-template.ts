export type ShotStatus = "draft" | "ready" | "queued" | "generating" | "complete" | "failed";

export type Shot = {
  id: string;
  projectId: string;
  position: number;
  title: string;
  framePrompt: string;
  videoPrompt: string;
  motion: string;
  status: ShotStatus;
  frameAssetId?: string | null;
  videoAssetId?: string | null;
  errorMessage?: string | null;
  updatedAt: string;
};

export type Project = {
  id: string;
  title: string;
  concept: string;
  audience: string;
  style: string;
  palette: string;
  status: string;
  plannerModel: string;
  imageModel: string;
  videoModel: string;
  shotCount: number;
  durationSeconds: number;
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
};

const beats = [
  ["The arrival", "steps into frame and adjusts the cuff", "Slow push-in from waist height"],
  ["Material detail", "runs a hand across the jacket texture", "Macro slide from shoulder to wrist"],
  ["The silhouette", "turns from profile to face camera", "Locked frame with a subtle 15° orbit"],
  ["Quiet focus", "reviews notes at a walnut desk", "Gentle handheld drift from over-shoulder"],
  ["Watch check", "checks a minimal steel watch", "Tight insert with a controlled rack focus"],
  ["Window light", "pauses beside a tall window", "Slow lateral dolly through soft foreground"],
  ["The walk", "crosses the studio with calm purpose", "Low tracking shot matched to footsteps"],
  ["Button detail", "fastens one jacket button", "Centered close-up, shallow depth of field"],
  ["Founder portrait", "holds direct eye contact with camera", "Very slow 5% push-in, no shake"],
  ["Working moment", "marks a page with a black fountain pen", "Top-down to 30° tilt in one move"],
  ["Closing gesture", "lifts a coat from the chair", "Smooth pan following the coat movement"],
  ["Final exit", "walks away through the studio doorway", "Static symmetrical wide shot"],
];

export function buildShots(projectId: string, concept: string, style: string): Shot[] {
  const now = new Date().toISOString();
  return beats.map(([title, action, camera], index) => ({
    id: `${projectId}-shot-${String(index + 1).padStart(2, "0")}`,
    projectId,
    position: index + 1,
    title,
    motion: camera,
    status: "ready",
    updatedAt: now,
    framePrompt: `${style}. ${concept}. Portrait 9:16 editorial still of the same founder in the same warm modern studio. Shot ${index + 1}: ${title.toLowerCase()}, subject ${action}. Natural skin texture, tailored neutral wardrobe, soft window light, restrained premium color grade, realistic fabric detail, no text, no logo, no extra people.`,
    videoPrompt: `Create exactly one continuous six-second portrait shot, 9:16. The same founder ${action}. ${camera}. Preserve face, outfit, room layout, lighting direction and color grade from the reference frame. Subtle natural body motion and realistic fabric physics. Editorial quiet-luxury campaign, 24 fps, cinematic but believable. No scene cuts, no dialogue, no captions, no logos, no new objects, no face distortion, no extra fingers.`,
  }));
}

export function makeDemoProject(): { project: Project; shots: Shot[] } {
  const projectId = "demo-founder-uniform";
  const now = new Date().toISOString();
  const project: Project = {
    id: projectId,
    title: "The Founder’s Winter Uniform",
    concept: "A composed creative founder moving through a warm architectural studio in a charcoal wool suit, cream knit and oxblood details",
    audience: "Founders, operators and design-led professionals",
    style: "Quiet luxury editorial, tactile and cinematic",
    palette: "Charcoal, warm cream, walnut, oxblood",
    status: "ready",
    plannerModel: "gemini-3.5-flash-lite",
    imageModel: "gemini-3.1-flash-image",
    videoModel: "gemini-omni-flash-preview",
    shotCount: 12,
    durationSeconds: 6,
    estimatedCost: 7.2,
    createdAt: now,
    updatedAt: now,
  };
  return { project, shots: buildShots(projectId, project.concept, project.style) };
}

export function createDraftProject(input: Partial<Project>): { project: Project; shots: Shot[] } {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const project: Project = {
    id,
    title: input.title?.trim() || "Untitled founder reel",
    concept: input.concept?.trim() || "A founder moving with calm purpose through a warm contemporary studio",
    audience: input.audience?.trim() || "Founders and creative operators",
    style: input.style?.trim() || "Quiet luxury editorial, tactile and cinematic",
    palette: input.palette?.trim() || "Charcoal, warm cream, walnut, oxblood",
    status: "ready",
    plannerModel: "gemini-3.5-flash-lite",
    imageModel: "gemini-3.1-flash-image",
    videoModel: "gemini-omni-flash-preview",
    shotCount: 12,
    durationSeconds: 6,
    estimatedCost: 7.2,
    createdAt: now,
    updatedAt: now,
  };
  return { project, shots: buildShots(id, project.concept, project.style) };
}
