# TwelveFrame / fashion-ai

An AI reel production SaaS for creating a consistent 72-second vertical reel as twelve separate six-second clips. The creator plans and generates in TwelveFrame, then combines the ordered clips and adds captions in CapCut.

## What is included

- 12-shot project creator with editable frame and video prompts
- Gemini model routing for planning, consistent images and Omni Flash video
- Mock mode that exercises the full workflow without API spend
- Four-slot character, wardrobe and room reference library
- Browser-session project state with server-proxied Gemini downloads
- Hard-gated workflow: generate 12 images → review/regenerate → approve → generate videos
- Sequential image and video queues with per-shot status and retry boundaries
- Separate cost confirmation before every paid image or video batch
- A visible stop control that prevents remaining jobs from starting and keeps completed work
- CapCut-ready JSON manifest export
- Responsive desktop and mobile studio UI

## Gemini stack

| Job | Model |
| --- | --- |
| Prompt planning | `gemini-3.5-flash-lite` |
| Reference frames | `gemini-3.1-flash-image` |
| 6-second video clips | `gemini-omni-flash-preview` |

The app uses mock mode when `GEMINI_API_KEY` is absent. The key is read only inside server routes and is never exposed to the browser.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To enable live generation, copy `.env.example` to `.env.local`, set `GEMINI_API_KEY`, and restart the dev server. Never commit the key.

## Verification

```bash
npm run lint
npm run build
```

The Vercel deployment runs as a standard Next.js application and creates the required `.next` output. Add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables, then redeploy. Generated Gemini files are downloaded through a server-side proxy so the key is never exposed.

Persistent multi-user project and media history is the next infrastructure step. Connect Neon Postgres and Vercel Blob before treating browser-session data as durable production storage.

## Approval and cost guard

The app generates the twelve start images first. Each image can be approved or regenerated; regenerating a frame revokes its approval. Video generation stays locked until all twelve images are approved, and each approved frame is then attached to its matching six-second video request.

The UI currently estimates reference images at about `$0.067` each and Omni Flash at `$0.10/second`. Twelve images are approximately `$0.80`; twelve six-second clips are approximately `$7.20`. Pricing is displayed separately before either stage starts.
