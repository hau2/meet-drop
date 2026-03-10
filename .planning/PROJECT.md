# MeetDrop

## What This Is

MeetDrop is a 1-on-1 anonymous video meeting web app. No backend, no database, no accounts — everything runs in the browser using WebRTC peer-to-peer connections via PeerJS. When the tab closes, everything disappears. The tagline is "Meet. Then it drops."

## Core Value

Anonymous, ephemeral video meetings with zero server-side data — if the connection is private and nothing persists, everything else can be figured out.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Create meeting room with unique readable link
- [ ] Join meeting via link or Room ID
- [ ] 1-on-1 video and audio call (WebRTC via PeerJS)
- [ ] Toggle mic on/off
- [ ] Toggle camera on/off
- [ ] Screen sharing with track replacement
- [ ] Lobby/preview screen before joining
- [ ] Copy meeting link button
- [ ] Connection status indicator (Connecting → Connected → Disconnected)
- [ ] Responsive design (desktop + mobile)
- [ ] Clean disconnection handling with "Meeting Ended" screen
- [ ] Encrypted text chat via DataChannel (AES-GCM, Web Crypto API)
- [ ] Self-view drag and reposition
- [ ] Dark/light theme toggle
- [ ] Sound effects (join/leave notifications)
- [ ] Network quality indicator
- [ ] Fullscreen mode for remote video

### Out of Scope

- Virtual backgrounds (TensorFlow.js BodyPix) — too heavy for v1, bundle size tradeoff not worth it
- Backend/database/authentication — core philosophy is zero server-side state
- Mobile native app — web-first, progressive enhancement only
- Multi-party calls — 1-on-1 only by design
- Recording — contradicts the "no trace" philosophy

## Context

- PeerJS free cloud server handles signaling only; all media/data flows peer-to-peer after handshake
- WebRTC is supported in all modern browsers (Chrome, Firefox, Safari, Edge)
- Web Crypto API (AES-GCM) will encrypt DataChannel chat messages end-to-end
- Room IDs follow format `meet-xxxxxx` (6 alphanumeric chars) for readability
- Static site deployment — GitHub Pages initially, Vercel or VPS in the future
- No server-side code means the entire app is a Vite build artifact

## Constraints

- **Tech stack**: React (Vite) + Tailwind CSS + PeerJS — already decided
- **No backend**: Everything client-side only, PeerJS cloud for signaling only
- **Hosting**: Must work as static site (GitHub Pages compatible)
- **Privacy**: No data touches any server beyond initial WebRTC signaling
- **Browser support**: Modern browsers with WebRTC support (Chrome, Firefox, Safari, Edge)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PeerJS for WebRTC | Simplifies signaling, free cloud server, well-maintained | — Pending |
| AES-GCM for chat encryption | Web Crypto API is native, no extra dependencies | — Pending |
| No virtual backgrounds | TensorFlow.js BodyPix too heavy for v1 | — Pending |
| Dark theme default | Matches the "anonymous/private" aesthetic, light theme as toggle | — Pending |
| GitHub Pages initial deploy | Free, simple, move to Vercel/VPS later | — Pending |

---
*Last updated: 2026-03-11 after initialization*
