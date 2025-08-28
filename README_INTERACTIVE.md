# Interactive Avatars – Project Guide

This repository contains multiple pieces to build and run real‑time Interactive Avatars with HeyGen + LiveKit across web and mobile.

- Next.js app (`avatar-ai-app`): unified Interactivo page with API/SDK toggle, indicators, secure token minting
- Vite demo (`streaming-avatar-demo`): SDK demo with OpenAI Assistant, STT (Whisper), Voice Chat, and Chroma Key
- Swift Vapor microservice (`heygen-token-service`): mints HeyGen session tokens server‑side
- Docs: `FIREWALL.md` with allowed hosts/ports

> Note: HeyGen avatar version v1/v2 are deprecated. All session creation is set to version v3.

---

## 1) Next.js App (avatar-ai-app)

Run locally

```bash
cd avatar-ai-app
npm i
# .env.local must include at least
# HEYGEN_API_KEY=your_heygen_key
npm run dev
```

Key routes

- Interactivo (unified): `http://localhost:3000/interactivo`
  - Toggle “Usar API” vs “Usar SDK”
  - Badges: Stream listo / Hablando…
- Static LiveKit demo: `http://localhost:3000/heygen-livekit.html`

Security

- Server route mints short‑lived token: `src/app/api/heygen/streaming/create-token/route.ts`

---

## 2) Vite SDK Demo (streaming-avatar-demo)

Features

- StreamingAvatar SDK (v3)
- OpenAI Assistants integration (optional)
- Speech‑to‑Text via Whisper (MediaRecorder + OpenAI)
- Built‑in Voice Chat mode
- Chroma Key canvas overlay

Run locally

```bash
cd streaming-avatar-demo
npm i
# .env (create in this folder)
# Prefer minting via your Next.js or Vapor service:
# VITE_SERVER_BASE=http://localhost:3000
# Optional fallback (not for prod):
# VITE_HEYGEN_API_KEY=your_heygen_key
# Optional for Assistants + Whisper
# VITE_OPENAI_API_KEY=your_openai_key
npm run dev
```

Open `http://localhost:5173`.

---

## 3) Swift Vapor Token Service (heygen-token-service)

Purpose

- Keeps `HEYGEN_API_KEY` off devices; returns session token to clients.

Build & run (macOS)

```bash
cd heygen-token-service
export HEYGEN_API_KEY=your_heygen_key
swift build
swift run
# Service on http://localhost:8080
```

Endpoint

- POST `/api/heygen/streaming/create-token` → proxies to HeyGen and returns JSON `{ data: { token } }`

Point mobile/web clients to this URL instead of using the API key directly.

---

## 4) iOS SwiftUI Demo

Reference sample: HeyGen’s SwiftUI demo

- Repo: https://github.com/HeyGen-Official/interactive-avatar-swiftui
- In `InteractiveAvatarDemo/Api/ApiConfig.swift`, set either your API key or a token endpoint from the Vapor service above.

---

## 5) Firewall / Networking

See `FIREWALL.md` for required hosts/ports and test links.

- Minimum: WSS to `*.livekit.cloud`, TURN TLS (443), TURN UDP (3478), `api.heygen.com` (443)
- Recommended: UDP 50000–60000 + TCP 7881 for best quality

---

## 6) Version Policy (Deprecation)

- v1/v2 deprecated. This repo uses v3 on all session creation calls.
  - Next static demo: `public/heygen-livekit.html`
  - Interactivo page (API and SDK flows)
  - Vite demo `createStartAvatar`

---

## 7) Troubleshooting

- Stream not starting:
  - Confirm token route returns `{ data: { token } }`.
  - Check firewall per FIREWALL.md; enable UDP where possible.
- Voice Chat disabled:
  - It’s only enabled after stream ready.
- Chroma Key:
  - Ensure canvas is visible and checkbox enabled; adjust thresholds in `src/chromaKey.ts` if your green differs.

---

## 8) Useful Links

- HeyGen Streaming API + LiveKit: https://docs.heygen.com/docs/streaming-api-integration-with-livekit-v2
- LiveKit Firewall: https://docs.livekit.io/home/cloud/firewall/
- WebRTC tests: https://livekit.io/webrtc/browser-test
- Connection tester: https://livekit.io/connection-test
