"use client";

import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown,
  CircleDollarSign, Clapperboard, Clock3, Copy, Download, FileJson, Film, FolderOpen,
  Gauge, Image as ImageIcon, KeyRound, LayoutDashboard, LoaderCircle, Menu, MoreHorizontal,
  PackageCheck, Play, Plus, RefreshCw, Save, Settings, SlidersHorizontal, Sparkles,
  Square, Upload, WandSparkles, X, Zap,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { makeDemoProject, type Project, type Shot } from "../lib/project-template";

type View = "overview" | "project" | "references" | "queue" | "settings";
type CostStage = "images" | "videos";
type ActiveQueue = CostStage | null;
type FrameAsset = { data: string; mimeType: string };
type ApiStatus = {
  mode: "mock" | "live";
  models: { planner: string; image: string; video: string };
  pricing: { videoPerSecond: number; frameEstimate: number; videoTotal: number; fullPipelineEstimate: number };
};

const demo = makeDemoProject();
const colorSets = [
  ["#221f1a", "#d0bda2", "#756151"], ["#3a2d28", "#a37c68", "#d8c7b1"],
  ["#171817", "#aa3e33", "#c7b9a2"], ["#2f342d", "#8d806a", "#e1d6c5"],
  ["#1e2326", "#b7a58b", "#705e51"], ["#4a3b31", "#c7a97d", "#ece1cf"],
  ["#20221f", "#6e7263", "#ccbda5"], ["#301e1b", "#9f4c3c", "#cabca6"],
  ["#222321", "#bca58b", "#67554b"], ["#3e3932", "#8d765f", "#d7c6ad"],
  ["#251e1b", "#753f34", "#d1baa1"], ["#141716", "#85796c", "#b79a72"],
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function StatusBadge({ status }: { status: Shot["status"] }) {
  const labels: Record<Shot["status"], string> = {
    draft: "Draft", ready: "Ready", queued: "Queued", generating: "Generating", complete: "Complete", failed: "Needs retry",
  };
  return <span className={cn("status-badge", `status-${status}`)}>{status === "generating" && <LoaderCircle size={11} className="spin" />}{labels[status]}</span>;
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>;
}

function ShotVisual({ index, status, frame, compact = false }: { index: number; status: Shot["status"]; frame?: FrameAsset; compact?: boolean }) {
  const palette = colorSets[index % colorSets.length];
  return (
    <div className={cn("shot-visual", compact && "compact")} style={{ "--c1": palette[0], "--c2": palette[1], "--c3": palette[2] } as React.CSSProperties}>
      {frame?.data && <Image className="generated-frame-image" src={`data:${frame.mimeType};base64,${frame.data}`} alt={`Generated reference frame ${index + 1}`} fill sizes={compact ? "64px" : "(max-width: 820px) 50vw, 25vw"} unoptimized />}
      <div className="window-glow" />
      <div className="figure"><span className="figure-head" /><span className="figure-body" /></div>
      <div className="floor-shadow" />
      <span className="shot-number">{String(index + 1).padStart(2, "0")}</span>
      {status === "generating" && <div className="generating-wash"><LoaderCircle size={22} className="spin" /></div>}
      {status === "complete" && <span className="complete-dot"><Check size={12} /></span>}
    </div>
  );
}

export function StudioApp() {
  const [view, setView] = useState<View>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [project, setProject] = useState<Project>(demo.project);
  const [shots, setShots] = useState<Shot[]>(demo.shots);
  const [selected, setSelected] = useState<Set<string>>(new Set(demo.shots.map((shot) => shot.id)));
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [api, setApi] = useState<ApiStatus>({
    mode: "mock",
    models: { planner: "gemini-3.5-flash-lite", image: "gemini-3.1-flash-image", video: "gemini-omni-flash-preview" },
    pricing: { videoPerSecond: 0.1, frameEstimate: 0.067, videoTotal: 7.2, fullPipelineEstimate: 8 },
  });
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [activeQueue, setActiveQueue] = useState<ActiveQueue>(null);
  const [costStage, setCostStage] = useState<CostStage>("images");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [frames, setFrames] = useState<Record<string, FrameAsset>>({});
  const [approvedFrames, setApprovedFrames] = useState<Set<string>>(new Set());
  const [uploads, setUploads] = useState<Record<string, { name: string; url: string }>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string>("");
  const stopRequested = useRef(false);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/status").then((res) => res.json()).then(setApi).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const completeCount = shots.filter((shot) => shot.status === "complete").length;
  const selectedShots = shots.filter((shot) => selected.has(shot.id));
  const frameCount = shots.filter((shot) => Boolean(frames[shot.id])).length;
  const approvedCount = shots.filter((shot) => approvedFrames.has(shot.id)).length;
  const missingFrames = shots.filter((shot) => !frames[shot.id]);
  const selectedUnapproved = selectedShots.filter((shot) => frames[shot.id] && !approvedFrames.has(shot.id));
  const allImagesApproved = approvedCount === shots.length && shots.length > 0;
  const pendingCount = pendingIds.size;
  const estimatedRun = costStage === "images"
    ? pendingCount * api.pricing.frameEstimate
    : pendingCount * 6 * api.pricing.videoPerSecond;

  const nav = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "project" as const, label: "Shot studio", icon: Clapperboard },
    { id: "references" as const, label: "References", icon: ImageIcon },
    { id: "queue" as const, label: "Generation queue", icon: Zap, count: shots.filter((shot) => shot.status === "queued" || shot.status === "generating").length },
  ];

  function go(next: View) {
    setView(next);
    setMobileNav(false);
  }

  function notify(message: string) {
    setToast(message);
  }

  function openCost(stage: CostStage, ids: Iterable<string>) {
    const next = new Set(ids);
    if (!next.size || running) return;
    setCostStage(stage);
    setPendingIds(next);
    setCostOpen(true);
  }

  function toggleShot(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Storage unavailable");
      const bundle = await response.json();
      setProject(bundle.project);
      setShots(bundle.shots);
      setSelected(new Set(bundle.shots.map((shot: Shot) => shot.id)));
      setFrames({});
      setApprovedFrames(new Set());
      notify("12-shot plan created");
    } catch {
      const fallback = makeDemoProject();
      setProject({ ...fallback.project, title: String(payload.title || fallback.project.title), concept: String(payload.concept || fallback.project.concept) });
      setShots(fallback.shots);
      setSelected(new Set(fallback.shots.map((shot) => shot.id)));
      setFrames({});
      setApprovedFrames(new Set());
      notify("Project created in preview mode");
    }
    setCreateOpen(false);
    setView("project");
  }

  async function saveShot() {
    if (!editingShot) return;
    setShots((current) => current.map((shot) => shot.id === editingShot.id ? editingShot : shot));
    if (!project.id.startsWith("demo")) {
      await fetch(`/api/shots/${editingShot.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingShot) }).catch(() => undefined);
    }
    setEditingShot(null);
    notify("Prompt changes saved");
  }

  async function runImageQueue() {
    if (!pendingIds.size || running) return;
    const targets = shots.filter((shot) => pendingIds.has(shot.id));
    setCostOpen(false);
    setRunning(true);
    setStopping(false);
    stopRequested.current = false;
    setActiveQueue("images");
    setView("queue");
    setApprovedFrames((current) => {
      const next = new Set(current);
      targets.forEach((shot) => next.delete(shot.id));
      return next;
    });
    setShots((current) => current.map((shot) => pendingIds.has(shot.id) ? { ...shot, status: "queued", videoAssetId: null } : shot));

    for (const target of targets) {
      if (stopRequested.current) break;
      setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "generating", errorMessage: null } : shot));
      if (api.mode === "mock") {
        await new Promise((resolve) => window.setTimeout(resolve, 620));
        if (stopRequested.current) break;
        setFrames((current) => ({ ...current, [target.id]: { data: "", mimeType: "image/mock" } }));
        setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "ready", frameAssetId: "mock-frame", videoAssetId: null } : shot));
        continue;
      }
      try {
        const controller = new AbortController();
        activeController.current = controller;
        const response = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, shotId: target.id, kind: "frame", prompt: target.framePrompt }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.asset) throw new Error(result.error || "Image generation failed");
        setFrames((current) => ({ ...current, [target.id]: result.asset }));
        setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "ready", frameAssetId: result.assetId, videoAssetId: null } : shot));
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError" || stopRequested.current) break;
        setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "failed", errorMessage: error instanceof Error ? error.message : "Image generation failed" } : shot));
      } finally {
        activeController.current = null;
      }
    }
    const wasStopped = stopRequested.current;
    setShots((current) => current.map((shot) => shot.status === "queued" || shot.status === "generating" ? { ...shot, status: "ready", errorMessage: null } : shot));
    setRunning(false);
    setStopping(false);
    setActiveQueue(null);
    setPendingIds(new Set());
    setView("project");
    notify(wasStopped ? "Generation stopped — completed images were kept" : api.mode === "mock" ? "Mock images are ready for approval" : "Images are ready for review");
  }

  function approveImage(id: string) {
    if (!frames[id]) return;
    setApprovedFrames((current) => new Set(current).add(id));
    notify("Image approved");
  }

  function approveSelectedImages() {
    if (!selectedUnapproved.length) return;
    setApprovedFrames((current) => {
      const next = new Set(current);
      selectedUnapproved.forEach((shot) => next.add(shot.id));
      return next;
    });
    notify(`${selectedUnapproved.length} image${selectedUnapproved.length === 1 ? "" : "s"} approved`);
  }

  async function runVideoQueue() {
    if (!pendingIds.size || running || !allImagesApproved) return;
    const targets = shots.filter((shot) => pendingIds.has(shot.id) && approvedFrames.has(shot.id) && frames[shot.id]);
    if (!targets.length) return;
    setCostOpen(false);
    setRunning(true);
    setStopping(false);
    stopRequested.current = false;
    setActiveQueue("videos");
    setView("queue");
    setShots((current) => current.map((shot) => targets.some((target) => target.id === shot.id) ? { ...shot, status: "queued" } : shot));

    for (const target of targets) {
      if (stopRequested.current) break;
      setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "generating", errorMessage: null } : shot));
      if (api.mode === "mock") {
        await new Promise((resolve) => window.setTimeout(resolve, 760));
        if (stopRequested.current) break;
        setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "complete", videoAssetId: "mock-video" } : shot));
        continue;
      }
      try {
        const controller = new AbortController();
        activeController.current = controller;
        const response = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, shotId: target.id, kind: "video", prompt: target.videoPrompt, reference: frames[target.id] }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Video generation failed");
        setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "complete", videoAssetId: result.assetId } : shot));
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError" || stopRequested.current) break;
        setShots((current) => current.map((shot) => shot.id === target.id ? { ...shot, status: "failed", errorMessage: error instanceof Error ? error.message : "Video generation failed" } : shot));
      } finally {
        activeController.current = null;
      }
    }
    const wasStopped = stopRequested.current;
    setShots((current) => current.map((shot) => shot.status === "queued" || shot.status === "generating" ? { ...shot, status: "ready", errorMessage: null } : shot));
    setRunning(false);
    setStopping(false);
    setActiveQueue(null);
    setPendingIds(new Set());
    notify(wasStopped ? "Generation stopped — completed videos were kept" : api.mode === "mock" ? "Mock videos completed — your approval gate works" : "Video batch completed");
  }

  function stopQueue() {
    if (!running || stopping) return;
    setStopping(true);
    stopRequested.current = true;
    activeController.current?.abort();
    notify("Stopping generation…");
  }

  function exportManifest() {
    const manifest = {
      project: { title: project.title, aspectRatio: "9:16", clipCount: 12, secondsPerClip: 6, totalSeconds: 72 },
      models: api.models,
      capcutOrder: shots.map((shot) => ({ order: shot.position, name: `${String(shot.position).padStart(2, "0")}-${shot.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mp4`, title: shot.title, duration: 6, framePrompt: shot.framePrompt, videoPrompt: shot.videoPrompt, assetUrl: shot.videoAssetId ? `/api/generated/${shot.videoAssetId}` : null })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-capcut-manifest.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("CapCut manifest downloaded");
  }

  function chooseUpload(target: string) {
    uploadTarget.current = target;
    fileInput.current?.click();
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const target = uploadTarget.current;
    setUploads((current) => ({ ...current, [target]: { name: file.name, url: URL.createObjectURL(file) } }));
    if (!project.id.startsWith("demo")) {
      const form = new FormData();
      form.append("file", file); form.append("projectId", project.id); form.append("kind", target);
      fetch("/api/assets", { method: "POST", body: form }).catch(() => undefined);
    }
    notify("Reference added");
    event.target.value = "";
  }

  const sidebar = (
    <aside className={cn("sidebar", mobileNav && "sidebar-open")}>
      <div className="sidebar-top">
        <button className="brand" onClick={() => go("overview")}><BrandMark /><span>TwelveFrame</span></button>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19} /></button>
      </div>
      <button className="new-project" onClick={() => setCreateOpen(true)}><Plus size={16} />New reel</button>
      <nav className="nav-list" aria-label="Primary navigation">
        <span className="nav-label">Workspace</span>
        {nav.map((item) => <button key={item.id} className={cn("nav-item", view === item.id && "active")} onClick={() => go(item.id)}><item.icon size={17} /><span>{item.label}</span>{Boolean(item.count) && <b>{item.count}</b>}</button>)}
      </nav>
      <div className="sidebar-project">
        <span className="nav-label">Current reel</span>
        <button className="project-mini" onClick={() => go("project")}>
          <ShotVisual index={2} status="ready" frame={frames[shots[2]?.id]} compact />
          <span><strong>{project.title}</strong><small>{approvedCount}/12 images approved</small></span>
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="sidebar-bottom">
        <button className={cn("nav-item", view === "settings" && "active")} onClick={() => go("settings")}><Settings size={17} />Settings</button>
        <div className="mode-card"><span className={cn("mode-light", api.mode === "live" && "live")} /><div><strong>{api.mode === "live" ? "Gemini live" : "Mock mode"}</strong><small>{api.mode === "live" ? "API key connected" : "Safe, zero-cost preview"}</small></div></div>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {sidebar}
      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={handleUpload} />
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Studio</span><i>/</i><strong>{view === "project" ? project.title : view.charAt(0).toUpperCase() + view.slice(1)}</strong></div>
          <div className="top-actions">
            <span className="estimate-pill"><CircleDollarSign size={15} />{formatMoney(api.pricing.videoTotal)} / 12 clips</span>
            <button className="icon-button" aria-label="More options"><MoreHorizontal size={19} /></button>
            <div className="avatar">SF</div>
          </div>
        </header>

        {view === "overview" && <Overview project={project} shots={shots} frames={frames} approvedCount={approvedCount} api={api} onOpen={() => go("project")} onCreate={() => setCreateOpen(true)} onSettings={() => go("settings")} />}
        {view === "project" && (
          <section className="page-content project-page">
            <div className="page-heading project-heading">
              <div><span className="eyebrow">12-shot workspace</span><h1>{project.title}</h1><p>{project.concept}</p></div>
              <div className="heading-actions">
                <button className="button secondary" onClick={exportManifest}><Download size={16} />Export</button>
                {missingFrames.length > 0 ? (
                  <button className="button primary" onClick={() => openCost("images", missingFrames.map((shot) => shot.id))} disabled={running}><ImageIcon size={16} />Generate {missingFrames.length} images</button>
                ) : !allImagesApproved ? (
                  <button className="button primary" onClick={approveSelectedImages} disabled={!selectedUnapproved.length || running}><CheckCircle2 size={16} />Approve {selectedUnapproved.length} selected</button>
                ) : (
                  <button className="button primary" onClick={() => openCost("videos", selectedShots.map((shot) => shot.id))} disabled={!selected.size || running}><Film size={16} />Generate {selected.size} videos</button>
                )}
              </div>
            </div>
            <div className="studio-toolbar">
              <div className="workflow-steps">
                <span className="done"><Check size={12} /></span><b>Brief</b><i />
                <span className={frameCount === shots.length ? "done" : "current"}>{frameCount === shots.length ? <Check size={12} /> : "2"}</span><b>Images</b><i />
                <span className={allImagesApproved ? "done" : frameCount === shots.length ? "current" : undefined}>{allImagesApproved ? <Check size={12} /> : "3"}</span><b>Approve</b><i />
                <span className={completeCount === shots.length ? "done" : allImagesApproved ? "current" : undefined}>{completeCount === shots.length ? <Check size={12} /> : "4"}</span><b>Videos</b><i />
                <span className={completeCount === shots.length ? "current" : undefined}>5</span><b>Export</b>
              </div>
              <div className="selection-tools"><button onClick={() => setSelected(new Set(shots.map((shot) => shot.id)))}>Select all</button><span>{frameCount}/12 images · {approvedCount}/12 approved</span><button className="filter-button"><SlidersHorizontal size={14} />Filter</button></div>
            </div>
            <div className={cn("approval-summary", allImagesApproved && "unlocked")}>
              {allImagesApproved ? <CheckCircle2 size={17} /> : <ImageIcon size={17} />}
              <div><strong>{allImagesApproved ? "Video generation unlocked" : frameCount < shots.length ? "Stage 1 — Generate all images" : "Stage 2 — Review and approve"}</strong><span>{allImagesApproved ? "Every approved image will be used as the visual reference for its six-second clip." : frameCount < shots.length ? "Videos remain locked until all twelve images are generated and approved." : "Approve each image, or regenerate any frame that does not match your direction."}</span></div>
            </div>
            <div className="shot-grid">
              {shots.map((shot, index) => (
                <article className={cn("shot-card", selected.has(shot.id) && "selected")} key={shot.id}>
                  <button className="select-check" onClick={() => toggleShot(shot.id)} aria-label={`Select shot ${shot.position}`}>{selected.has(shot.id) && <Check size={13} />}</button>
                  <ShotVisual index={index} status={shot.status} frame={frames[shot.id]} />
                  <div className="shot-card-body">
                    <div className="shot-card-title"><div><small>Shot {String(shot.position).padStart(2, "0")}</small><h3>{shot.title}</h3></div>{approvedFrames.has(shot.id) ? <span className="approval-badge"><Check size={11} />Approved</span> : <StatusBadge status={shot.status} />}</div>
                    <p>{shot.motion}</p>
                    <div className="shot-meta"><span><Clock3 size={13} />6 sec</span><span><Film size={13} />9:16</span></div>
                    <div className="shot-actions">
                      <button className="edit-prompt" onClick={() => setEditingShot(shot)}><WandSparkles size={14} />Edit prompts</button>
                      {frames[shot.id] && !approvedFrames.has(shot.id) && <button className="approve-frame" onClick={() => approveImage(shot.id)}><Check size={14} />Approve</button>}
                      {frames[shot.id] && <button className="regenerate-frame" onClick={() => openCost("images", [shot.id])} disabled={running}><RefreshCw size={14} />Regenerate</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {view === "references" && <References uploads={uploads} chooseUpload={chooseUpload} onBack={() => go("project")} />}
        {view === "queue" && <QueueView shots={shots} frames={frames} approvedFrames={approvedFrames} activeQueue={activeQueue} running={running} stopping={stopping} api={api} onBack={() => go("project")} onStop={stopQueue} onRunVideos={() => openCost("videos", selectedShots.map((shot) => shot.id))} onExport={exportManifest} />}
        {view === "settings" && <SettingsView api={api} notify={notify} />}
      </main>

      {editingShot && <PromptDrawer shot={editingShot} onChange={setEditingShot} onClose={() => setEditingShot(null)} onSave={saveShot} />}
      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onSubmit={createProject} />}
      {costOpen && <CostModal stage={costStage} count={pendingCount} total={estimatedRun} api={api} onClose={() => setCostOpen(false)} onConfirm={costStage === "images" ? runImageQueue : runVideoQueue} />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function Overview({ project, shots, frames, approvedCount, api, onOpen, onCreate, onSettings }: { project: Project; shots: Shot[]; frames: Record<string, FrameAsset>; approvedCount: number; api: ApiStatus; onOpen: () => void; onCreate: () => void; onSettings: () => void }) {
  const complete = shots.filter((shot) => shot.status === "complete").length;
  return (
    <section className="page-content overview-page">
      <div className="overview-heading"><div><span className="eyebrow">Creative operating system</span><h1>Good morning, Shikha.</h1><p>Build a consistent 72-second reel as twelve controlled six-second clips.</p></div><button className="button primary" onClick={onCreate}><Plus size={16} />Create new reel</button></div>
      <div className="hero-panel">
        <div className="hero-copy"><span className="hero-kicker"><Sparkles size={14} />One-key Gemini workflow</span><h2>Twelve shots.<br /><em>One visual world.</em></h2><p>Plan the story, lock character and room consistency, generate portrait clips, then hand the clean sequence to CapCut.</p><div className="hero-actions"><button className="button warm" onClick={onOpen}>Open shot studio<ArrowRight size={16} /></button><button className="text-button" onClick={onSettings}>Review model stack</button></div></div>
        <div className="hero-reel"><div className="reel-stack back-two"><ShotVisual index={7} status="ready" /></div><div className="reel-stack back-one"><ShotVisual index={4} status="ready" /></div><div className="reel-stack front"><ShotVisual index={2} status="ready" /><div className="reel-play"><Play size={18} fill="currentColor" /></div></div><span className="reel-tag">9:16 · 12 × 6s</span></div>
      </div>
      <div className="metric-grid">
        <div className="metric-card"><span className="metric-icon ochre"><ImageIcon size={18} /></span><div><small>Image approval</small><strong>{approvedCount}<i>/12</i></strong><p>frames approved</p></div></div>
        <div className="metric-card"><span className="metric-icon sage"><Clock3 size={18} /></span><div><small>Final sequence</small><strong>72<i> sec</i></strong><p>before CapCut edits</p></div></div>
        <div className="metric-card"><span className="metric-icon clay"><CircleDollarSign size={18} /></span><div><small>Omni Flash estimate</small><strong>{formatMoney(api.pricing.videoTotal)}</strong><p>video only, full batch</p></div></div>
        <div className="metric-card"><span className="metric-icon blue"><Gauge size={18} /></span><div><small>Provider mode</small><strong className="text-metric">{api.mode === "live" ? "Live" : "Mock"}</strong><p>{api.mode === "live" ? "Gemini connected" : "zero-cost preview"}</p></div></div>
      </div>
      <div className="overview-grid">
        <article className="panel current-project-panel">
          <div className="panel-head"><div><span className="eyebrow">Continue working</span><h3>{project.title}</h3></div><button className="icon-button"><MoreHorizontal size={18} /></button></div>
          <div className="project-strip">{shots.slice(0, 6).map((shot, index) => <ShotVisual key={shot.id} index={index} status={shot.status} frame={frames[shot.id]} compact />)}</div>
          <div className="project-progress"><div><span>Images before videos</span><strong>{approvedCount}/12 frames approved · {complete}/12 clips ready</strong></div><div className="progress-track"><span style={{ width: `${Math.max(10, approvedCount / 12 * 100)}%` }} /></div></div>
          <button className="button secondary full" onClick={onOpen}>Continue in shot studio<ArrowRight size={16} /></button>
        </article>
        <article className="panel stack-panel"><div className="panel-head"><div><span className="eyebrow">Your production stack</span><h3>One key, three jobs</h3></div><span className={cn("connection-badge", api.mode === "live" && "live")}><span />{api.mode === "live" ? "Connected" : "Preview"}</span></div>
          <div className="model-row"><span className="model-icon"><FileJson size={17} /></span><div><strong>Story & prompts</strong><small>{api.models.planner}</small></div><CheckCircle2 size={17} /></div>
          <div className="model-row"><span className="model-icon"><ImageIcon size={17} /></span><div><strong>Consistent frames</strong><small>{api.models.image}</small></div><CheckCircle2 size={17} /></div>
          <div className="model-row featured"><span className="model-icon"><Film size={17} /></span><div><strong>Six-second clips</strong><small>{api.models.video}</small></div><Zap size={17} /></div>
          <button className="text-button settings-link" onClick={onSettings}>Configure provider<ArrowRight size={14} /></button>
        </article>
      </div>
    </section>
  );
}

function References({ uploads, chooseUpload, onBack }: { uploads: Record<string, { name: string; url: string }>; chooseUpload: (target: string) => void; onBack: () => void }) {
  const refs = [
    { id: "character-front", title: "Character — front", text: "Neutral expression, clean face reference" },
    { id: "character-profile", title: "Character — profile", text: "Side view for likeness consistency" },
    { id: "wardrobe", title: "Wardrobe master", text: "Full outfit, accurate color and texture" },
    { id: "room", title: "Room master", text: "Wide view with lighting and layout" },
  ];
  return <section className="page-content"><div className="page-heading"><div><button className="back-link" onClick={onBack}><ArrowLeft size={14} />Shot studio</button><span className="eyebrow">Consistency kit</span><h1>Reference library</h1><p>Give Nano Banana and Omni Flash the same visual anchors for all twelve shots.</p></div></div>
    <div className="reference-intro"><div className="reference-number">4</div><div><strong>Four references are enough</strong><p>Use clean, well-lit images without text. They stay in your browser session until persistent storage is connected.</p></div><span><PackageCheck size={18} />Private browser session</span></div>
    <div className="reference-grid">{refs.map((ref) => <button className={cn("upload-card", uploads[ref.id] && "has-upload")} key={ref.id} onClick={() => chooseUpload(ref.id)}>
      {uploads[ref.id] ? <><Image src={uploads[ref.id].url} alt="Uploaded reference preview" width={720} height={1280} unoptimized /><span className="replace-overlay"><RefreshCw size={17} />Replace</span></> : <><span className="upload-icon"><Upload size={21} /></span><strong>{ref.title}</strong><p>{ref.text}</p><small>PNG, JPG or WebP · max 15MB</small></>}
    </button>)}</div>
    <div className="reference-tip"><Sparkles size={18} /><div><strong>Consistency prompt is automatic</strong><p>Every frame prompt already locks face, outfit, room layout, light direction and grade. You can refine it per shot without rewriting the foundation.</p></div></div>
  </section>;
}

function QueueView({ shots, frames, approvedFrames, activeQueue, running, stopping, api, onBack, onStop, onRunVideos, onExport }: { shots: Shot[]; frames: Record<string, FrameAsset>; approvedFrames: Set<string>; activeQueue: ActiveQueue; running: boolean; stopping: boolean; api: ApiStatus; onBack: () => void; onStop: () => void; onRunVideos: () => void; onExport: () => void }) {
  const completed = shots.filter((shot) => shot.status === "complete").length;
  const images = shots.filter((shot) => frames[shot.id]).length;
  const approved = shots.filter((shot) => approvedFrames.has(shot.id)).length;
  const active = shots.find((shot) => shot.status === "generating");
  const progress = activeQueue === "images" ? images : completed;
  return <section className="page-content"><div className="page-heading queue-heading"><div><button className="back-link" onClick={onBack} disabled={running}><ArrowLeft size={14} />Shot studio</button><span className="eyebrow">Simple generation control</span><h1>Generation queue</h1><p>One job runs at a time. You can stop anytime; every completed image or video is kept.</p></div><div className="heading-actions"><button className="button secondary" onClick={onExport}><Download size={16} />Manifest</button>{running ? <button className="button stop-button" onClick={onStop} disabled={stopping}><Square size={14} fill="currentColor" />{stopping ? "Stopping…" : "Stop generation"}</button> : <button className="button primary" onClick={onRunVideos} disabled={approved !== shots.length}><Play size={16} />Generate approved videos</button>}</div></div>
    <div className="queue-summary"><div className="queue-ring" style={{ "--progress": `${progress / 12 * 360}deg` } as React.CSSProperties}><span>{progress}<small>/12</small></span></div><div><span className="eyebrow">{activeQueue === "images" ? "Image batch" : activeQueue === "videos" ? "Video batch" : "Workflow status"}</span><h2>{stopping ? "Stopping after the current request" : running ? `${activeQueue === "images" ? "Creating image" : "Creating video"} ${active?.position ?? "…"}` : completed === 12 ? "All clips are ready" : approved === 12 ? "Images approved — videos unlocked" : images === 12 ? "Review images in the shot studio" : "Generate all twelve images first"}</h2><p>{stopping ? "No new jobs will start. Finished work remains in your project." : api.mode === "mock" ? "Mock mode simulates both stages without spending API credit." : "Each approved image is passed to Omni Flash as that clip’s visual reference."}</p></div><div className="queue-cost"><small>{activeQueue === "images" ? "Image estimate" : "Video estimate"}</small><strong>{formatMoney(activeQueue === "images" ? api.pricing.frameEstimate * 12 : api.pricing.videoTotal)}</strong><span>{images}/12 images · {approved}/12 approved</span></div></div>
    <div className="queue-table"><div className="queue-row queue-header"><span>Shot</span><span>Prompt</span><span>Approval</span><span>Status</span><span>Cost</span></div>{shots.map((shot, index) => <div className="queue-row" key={shot.id}><span className="queue-shot"><ShotVisual index={index} status={shot.status} frame={frames[shot.id]} compact /><b>{String(shot.position).padStart(2, "0")}</b></span><span><strong>{shot.title}</strong><small>{shot.motion}</small></span><span>{approvedFrames.has(shot.id) ? <span className="approval-badge"><Check size={11} />Approved</span> : frames[shot.id] ? "Review needed" : "Image needed"}</span><span><StatusBadge status={shot.status} /></span><span className="mono">{activeQueue === "images" ? "~$0.07" : "$0.60"}</span></div>)}</div>
  </section>;
}

function SettingsView({ api, notify }: { api: ApiStatus; notify: (message: string) => void }) {
  return <section className="page-content settings-page"><div className="page-heading"><div><span className="eyebrow">Workspace configuration</span><h1>Provider settings</h1><p>Your key stays server-side. TwelveFrame never asks for it in the browser.</p></div></div>
    <div className="settings-layout"><div className="settings-nav"><button className="active"><KeyRound size={16} />Gemini API</button><button><CircleDollarSign size={16} />Budget controls</button><button><FolderOpen size={16} />Storage</button></div>
      <div className="settings-panels"><article className="panel settings-card"><div className="settings-card-head"><div className="google-mark">G</div><div><h3>Google Gemini</h3><p>Planning, image generation and video generation</p></div><span className={cn("connection-badge", api.mode === "live" && "live")}><span />{api.mode === "live" ? "Connected" : "Key not added"}</span></div>
        <div className="key-instruction"><span><KeyRound size={18} /></span><div><strong>Add one environment variable</strong><p>Set <code>GEMINI_API_KEY</code> in the hosted site’s environment settings. Redeploy, and mock mode automatically switches to live mode.</p></div><button onClick={() => { navigator.clipboard.writeText("GEMINI_API_KEY"); notify("Variable name copied"); }}><Copy size={15} />Copy</button></div>
        <div className="security-note"><AlertCircle size={16} /><p>Do not paste the API key into frontend code or commit it to Git. The generation route reads it only on the server.</p></div>
      </article>
      <article className="panel settings-card"><div className="panel-head"><div><span className="eyebrow">Model routing</span><h3>Production defaults</h3></div><span className="version-badge">July 2026</span></div>
        <div className="model-setting"><span>Prompt planner</span><div><strong>{api.models.planner}</strong><ChevronDown size={15} /></div></div>
        <div className="model-setting"><span>Reference frames</span><div><strong>{api.models.image}</strong><ChevronDown size={15} /></div></div>
        <div className="model-setting"><span>Video clips</span><div><strong>{api.models.video}</strong><ChevronDown size={15} /></div></div>
      </article>
      <article className="panel settings-card"><div className="panel-head"><div><span className="eyebrow">Spend protection</span><h3>Confirm every paid batch</h3></div><label className="switch"><input type="checkbox" defaultChecked /><span /></label></div><p className="settings-copy">TwelveFrame calculates the selected seconds and estimated frame cost before it sends any request. Failed clips can be retried individually.</p><div className="budget-row"><span>Warning threshold</span><strong>$8.00 / batch</strong></div></article>
      </div></div>
  </section>;
}

function PromptDrawer({ shot, onChange, onClose, onSave }: { shot: Shot; onChange: (shot: Shot) => void; onClose: () => void; onSave: () => void }) {
  return <><button className="drawer-backdrop" onClick={onClose} aria-label="Close prompt editor" /><aside className="prompt-drawer"><div className="drawer-head"><div><span className="eyebrow">Shot {String(shot.position).padStart(2, "0")}</span><h2>{shot.title}</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
    <ShotVisual index={shot.position - 1} status={shot.status} />
    <label className="field"><span>Shot title</span><input value={shot.title} onChange={(event) => onChange({ ...shot, title: event.target.value })} /></label>
    <label className="field"><span>Reference frame prompt</span><textarea rows={7} value={shot.framePrompt} onChange={(event) => onChange({ ...shot, framePrompt: event.target.value })} /></label>
    <label className="field"><span>Omni Flash video prompt</span><textarea rows={9} value={shot.videoPrompt} onChange={(event) => onChange({ ...shot, videoPrompt: event.target.value })} /></label>
    <div className="prompt-guard"><CheckCircle2 size={16} /><span>Single scene · 6 seconds · 9:16 · no text</span></div>
    <div className="drawer-actions"><button className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" onClick={onSave}><Save size={15} />Save prompt</button></div>
  </aside></>;
}

function CreateModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose} aria-label="Close" /><form className="modal-card create-card" onSubmit={onSubmit}><div className="modal-head"><div><span className="eyebrow">New 12-shot reel</span><h2>Start with the visual idea.</h2><p>We’ll turn it into a consistent sequence and editable prompt pack.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={19} /></button></div>
    <label className="field"><span>Project name</span><input name="title" placeholder="e.g. The founder’s summer uniform" required autoFocus /></label>
    <label className="field"><span>Concept</span><textarea name="concept" rows={4} placeholder="Describe the person, wardrobe, room and feeling…" required /></label>
    <div className="field-grid"><label className="field"><span>Audience</span><input name="audience" defaultValue="Founders and creative operators" /></label><label className="field"><span>Visual style</span><input name="style" defaultValue="Quiet luxury editorial, tactile and cinematic" /></label></div>
    <label className="field"><span>Palette</span><input name="palette" defaultValue="Charcoal, warm cream, walnut, oxblood" /></label>
    <div className="create-summary"><span><Clapperboard size={17} /><b>12</b> shots</span><span><Clock3 size={17} /><b>6 sec</b> each</span><span><Film size={17} /><b>9:16</b> portrait</span></div>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Create shot plan<ArrowRight size={16} /></button></div>
  </form></div>;
}

function CostModal({ stage, count, total, api, onClose, onConfirm }: { stage: CostStage; count: number; total: number; api: ApiStatus; onClose: () => void; onConfirm: () => void }) {
  const isImages = stage === "images";
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose} aria-label="Close" /><div className="modal-card cost-card"><div className="modal-head"><div><span className="eyebrow">Cost checkpoint</span><h2>Review before generating.</h2><p>No paid request is sent until you confirm.</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
    <div className="cost-lines"><div><span>{count} {isImages ? "Nano Banana reference images" : "Omni Flash clips"}<small>{isImages ? `${count} images × ~${formatMoney(api.pricing.frameEstimate)}` : `${count * 6} seconds × ${formatMoney(api.pricing.videoPerSecond)}`}</small></span><strong>{formatMoney(total)}</strong></div><div><span>{isImages ? "Approval gate remains active" : "Approved images attached"}<small>{isImages ? "Review or regenerate every image before video" : "Each clip uses its approved frame as reference"}</small></span><strong>{isImages ? "Stage 1" : "Stage 3"}</strong></div></div>
    <div className="cost-total"><span>Estimated batch total<small>Actual Google billing can vary</small></span><strong>{formatMoney(total)}</strong></div>
    <div className="stop-note"><Square size={14} /><div><strong>You can stop the queue anytime</strong><p>Completed results are kept. A provider request that already started may still finish and may still be billed.</p></div></div>
    {api.mode === "mock" && <div className="mock-banner"><Sparkles size={17} /><div><strong>This run costs $0</strong><p>You are in mock mode. We’ll simulate all {count} {isImages ? "images" : "videos"} so you can test the workflow.</p></div></div>}
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>Go back</button><button className="button primary" onClick={onConfirm}>{api.mode === "mock" ? `Run mock ${isImages ? "images" : "videos"}` : `Confirm ${formatMoney(total)} ${isImages ? "images" : "videos"}`}<ArrowRight size={16} /></button></div>
  </div></div>;
}
