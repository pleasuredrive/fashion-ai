# TwelveFrame / fashion-ai

An AI reel production SaaS for creating a consistent 72-second vertical reel as twelve separate six-second clips. The creator plans and generates in TwelveFrame, then combines the ordered clips and adds captions in CapCut.

## What is included

- 12-shot project creator with editable frame and video prompts
- Gemini model routing for planning, consistent images and Omni Flash video
- Mock mode that exercises the full workflow without API spend
- Four-slot character, wardrobe and room reference library
- Browser-session project state with server-proxied Gemini downloads
- Sequential generation queue with per-shot status and retry boundaries
- Cost confirmation before any paid batch
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

## Cost guard

The UI currently estimates Omni Flash at `$0.10/second`: twelve 6-second clips are approximately `$7.20` before optional start-frame generation. Pricing is displayed before every batch so clips can be tested one at a time.
