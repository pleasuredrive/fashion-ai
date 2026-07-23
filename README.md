# TwelveFrame / fashion-ai

An AI reel production SaaS for creating a consistent 72-second vertical reel as twelve separate six-second clips. The creator plans and generates in TwelveFrame, then combines the ordered clips and adds captions in CapCut.

## What is included

- 12-shot project creator with editable frame and video prompts
- Gemini model routing for planning, consistent images and Omni Flash video
- Mock mode that exercises the full workflow without API spend
- Four-slot character, wardrobe and room reference library
- D1 project/shot metadata and R2 media storage
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

The Sites runtime provisions the logical `DB` D1 binding and `MEDIA` R2 binding declared in `.openai/hosting.json`. Drizzle migrations are stored in `drizzle/`.

## Cost guard

The UI currently estimates Omni Flash at `$0.10/second`: twelve 6-second clips are approximately `$7.20` before optional start-frame generation. Pricing is displayed before every batch so clips can be tested one at a time.
