# Project Research Summary

**Project:** MeetDrop
**Domain:** Anonymous ephemeral 1-on-1 P2P WebRTC video meeting app (browser-only, no backend)
**Researched:** 2026-03-11
**Confidence:** HIGH

## Executive Summary

MeetDrop is a browser-native, zero-account video calling app built entirely on P2P WebRTC via PeerJS, with no media server, no database, and no auth layer. The well-established stack — React 19 + Vite 7 + PeerJS 1.5.5 + Tailwind CSS v4 — maps cleanly to the product's constraints: static deployment on GitHub Pages, hash-based routing, client-side room ID generation, and full session ephemerality on tab close. Because all signaling is delegated to PeerJS (with STUN/ICE built in), the only infra decisions that matter are TURN server provisioning and whether to self-host the PeerJS signaling server rather than rely on the free `0.peerjs.com` cloud.

The recommended architecture is a pure React SPA with three hooks (`usePeer`, `useMedia`, `useChat`) owning all WebRTC side effects, and UI components that consume those hooks via props/callbacks. The URL doubles as the session coordinator: the room ID is the PeerJS peer ID, so the second user to load the URL knows exactly who to call without any server-side state. Encrypted chat is achievable entirely in-browser using ECDH key exchange over the DataChannel and AES-GCM via the Web Crypto API — no npm package required.

The primary risks are infrastructure gaps, not implementation complexity: shipping without a TURN server will silently break connections for 15-30% of users on corporate or symmetric-NAT networks; and the free PeerJS cloud has documented reliability issues that make it unsuitable for production. Both are fast to fix but high-cost to discover after launch. All other pitfalls (React Strict Mode double-init, autoplay policy, media track cleanup, screen share track restoration) are well-documented and preventable with known patterns that should be baked in during the foundation phase.

---

## Key Findings

### Recommended Stack

The stack is greenfield-optimized and fully validated against the zero-backend, GitHub Pages deployment constraint. React 19 + Vite 7 is the fastest local development experience available and produces a deploy-anywhere static bundle. PeerJS 1.5.5 is actively maintained (June 2025 release), wraps `RTCPeerConnection` cleanly for 1-on-1 use, and provides both `MediaConnection` (video/audio) and `DataConnection` (chat/signaling) over the same peer pair. Tailwind CSS v4 with the first-party Vite plugin requires zero configuration and native CSS variables handle dark/light theming without JavaScript. Zustand handles the call state machine (idle/connecting/connected/disconnected) without the re-render overhead that React Context would impose on a video call UI.

**Core technologies:**
- React 19.2.4: UI framework — concurrent features, `useRef`+`useEffect` lifecycle maps to WebRTC streams
- Vite 7.3.1: Build tool — fastest HMR, native ESM, `dist/` deploys anywhere, aligns with WebRTC browser support matrix
- TypeScript 5.x: Type safety — WebRTC APIs are complex; strict mode catches stream ref and async signaling bugs
- PeerJS 1.5.5: WebRTC abstraction — wraps `RTCPeerConnection`, STUN/TURN, `MediaConnection` + `DataConnection` APIs
- Tailwind CSS 4.2.1: Styling — Vite plugin, zero config, CSS variables for theming
- wouter 3.9.0: Routing — hash-based, 2.2 KB vs React Router's 19 KB, covers the two routes needed
- Zustand 5.0.11: State — per-slice subscriptions, no re-render overhead from unrelated state changes
- nanoid 5.1.6: Room IDs — `customAlphabet` for the `meet-xxxxxx` format, Web Crypto-backed
- Web Crypto API (native): AES-GCM chat encryption — zero bundle cost, available in all WebRTC-capable browsers

**Key exclusions:** `simple-peer` (archived/unmaintained), Socket.IO (requires a server), Redux Toolkit (over-engineered for 5-state app), TensorFlow.js BodyPix (3 MB bundle, anti-feature for this use case).

### Expected Features

The feature set divides cleanly into a fully-shippable v1 that validates the "anonymous ephemeral 1-on-1 video call" concept, and a v1.x polish pass once the call flow is stable.

**Must have (table stakes) — v1:**
- Room ID generation + shareable URL — the entire coordination mechanism
- Lobby / pre-join screen with camera preview — prevents cold-join confusion
- Camera on/off + mic mute/unmute toggles — every video app normalizes these; absence is broken
- WebRTC 1-on-1 video + audio call (PeerJS) — the product
- Connection status indicator — P2P ICE negotiation takes 5-15 seconds; users need feedback
- Clean disconnect / "Meeting Ended" screen — silent black screen reads as broken app
- Copy link button — primary sharing mechanism
- Self-preview (picture-in-picture) — baseline video UX
- Responsive design (desktop + mobile) — mobile share is too large to skip
- Sound notifications (join/leave) — low effort, high polish signal
- Encrypted text chat via DataChannel (AES-GCM + ECDH) — core differentiator; establishes privacy credibility
- Dark theme default — reinforces anonymous/ephemeral brand identity

**Should have (competitive) — v1.x:**
- Screen sharing (RTCRtpSender.replaceTrack) — most users expect this; add once call is stable
- Network quality indicator (RTCPeerConnection.getStats polling) — surfaces quality issues users can't diagnose
- Draggable self-view — polish detail that signals care
- Light theme toggle — negligible effort once CSS vars are in place
- Fullscreen mode for remote video — pairs naturally with screen sharing

**Defer (v2+):**
- Virtual backgrounds (TensorFlow.js BodyPix) — 3 MB+ bundle, only if camera-off rates indicate user concern
- File sharing over DataChannel — complex reliability; no user demand signal yet
- Custom room ID slugs — nice UX, needs collision logic

**Anti-features by design:** recording (contradicts ephemerality), multi-party calls (requires SFU/server), user accounts, waiting room/lobby approval.

### Architecture Approach

The app is a single-page React application with three distinct layers: page-level components that compose hooks and own layout, UI components that receive props and callbacks without touching WebRTC directly, and custom hooks (`usePeer`, `useMedia`, `useChat`) that own all browser API side effects and WebRTC lifecycle. PeerJS objects (`Peer`, `MediaConnection`, `DataConnection`) live in `useRef` — never `useState` — to prevent re-renders on mutation; only derived state (connection status enum, message array, track toggle booleans) lives in `useState`. The URL serves as the session coordinator: the first user's PeerJS peer ID equals the room ID, so the second user calling `peer.call(roomId, stream)` requires no server-side lookup.

**Major components:**
1. `usePeer` — PeerJS `Peer` instance + `MediaConnection` + `DataConnection` lifecycle; exposes `connectionState` and `remoteStream`
2. `useMedia` — `getUserMedia` / `getDisplayMedia` streams, track enable/disable toggles, screen share `replaceTrack`
3. `useChat` — DataChannel message send/receive with AES-GCM encrypt/decrypt via ECDH-derived key
4. `useRoom` — room ID generation, URL parsing, clipboard copy
5. `LobbyPage` — pre-join camera preview, device check, copy link
6. `RoomPage` — active call layout; wires hooks to `VideoGrid`, `Controls`, `Chat`, `ConnectionStatus`
7. `lib/crypto.ts` — pure ECDH + AES-GCM functions; no React dependency; unit-testable in isolation
8. `lib/room.ts` — room ID generation via nanoid `customAlphabet`

**Build order implied by dependencies:** `lib/` pure functions first, then `useMedia`, then `usePeer` (depends on `localStream`), then `useChat` (depends on `DataConnection`), then Lobby UI, then Room layout, then Chat panel, then connection status, then routing/ended screen.

### Critical Pitfalls

1. **No TURN server — 15-30% of users cannot connect** — Configure TURN from day one (Metered.ca, Cloudflare TURN, or Coturn); never ship STUN-only to real networks. Test across different network types before launch.

2. **PeerJS free cloud server (`0.peerjs.com`) is unreliable in production** — Self-host `peerjs-server` on Railway/Render/Fly.io (free tier, stateless, 30 minutes to deploy). Do not use the free cloud as the production default.

3. **React Strict Mode double-initializes `Peer` instances** — Guard `useEffect` with a `useRef` check (`if (peerRef.current) return`); always destroy in cleanup. Set this pattern before any other WebRTC work.

4. **Media tracks not stopped on cleanup — camera stays on** — Call `localStream.getTracks().forEach(t => t.stop())` in every exit path: hang up, navigation, component unmount, `beforeunload`. Store `MediaStream` in `useRef` so the cleanup function has a stable reference.

5. **Remote video does not autoplay (Chrome/Safari autoplay policy)** — Call `video.play()` programmatically after setting `srcObject`; catch the rejected promise to show a "Click to start video" fallback. Set `muted` on self-view. Always use `playsInline` attribute for iOS Safari.

6. **AES-GCM key exchanged insecurely (encryption theater)** — Use ECDH key derivation; never put the symmetric key in the URL or send it as the first DataChannel message. Generate a fresh 96-bit random IV per message.

7. **Screen share track not restored when user hits OS "Stop Sharing" button** — Always set `screenTrack.onended` to call `replaceTrack(cameraTrack)` and reset sharing state. Store the original camera track reference in a `useRef` before swapping.

---

## Implications for Roadmap

Based on the dependency graph in ARCHITECTURE.md and pitfall phase mappings in PITFALLS.md, five phases are recommended.

### Phase 1: Foundation + Infrastructure
**Rationale:** Both the TURN server and self-hosted PeerJS signaling must be in place before any cross-network testing is meaningful. React/PeerJS integration patterns (Strict Mode guard, `useRef` storage) must be set correctly before feature work — retrofitting these is costly. This phase has no external feature dependencies.
**Delivers:** Vite + React + TypeScript project scaffold; Tailwind v4 configured; PeerJS self-hosted signaling wired; TURN server credentials configured; `usePeer` skeleton with correct Strict Mode guards and cleanup; hash-based routing with wouter; Zustand store shape defined.
**Addresses:** Room ID generation (nanoid), project structure, base component types.
**Avoids:** PeerJS free cloud reliability failure (Pitfall 2); React Strict Mode double-init (Pitfall 8); TURN missing at network testing time (Pitfall 1).

### Phase 2: Media + Lobby
**Rationale:** `useMedia` has no PeerJS dependency and can be built and tested in isolation using just the browser's camera/mic. The Lobby page is the first thing real users encounter; poor pre-join UX has a permanent first-impression cost. Building media management first also establishes the track-cleanup pattern before any peer connection complexity is introduced.
**Delivers:** `getUserMedia` with error handling (`NotAllowedError`, `NotFoundError`); camera/mic toggle (`track.enabled`); self-preview with CSS mirror transform; Lobby page with device preview; copy room link button; sound notifications utility.
**Addresses:** Table stakes — lobby, camera/mic toggles, self-preview, copy link, responsive mobile layout.
**Avoids:** Media tracks not stopped on cleanup (Pitfall 3); video not using `playsInline` on iOS Safari (Performance trap).

### Phase 3: Core Call (PeerJS MediaConnection)
**Rationale:** This is the product's core value. `usePeer` depends on `localStream` from Phase 2. The URL-as-coordinator pattern (peer ID = room ID) must be established here. All connection state handling (connecting/connected/disconnected/failed) should be wired completely in this phase — adding it later means debugging call flows twice.
**Delivers:** `usePeer` hook with full ICE state machine; `MediaConnection` establish/answer/hang-up; remote video rendering with autoplay handling; connection status indicator; "Meeting Ended" screen; tab-close cleanup via `beforeunload`.
**Addresses:** 1-on-1 video + audio call, connection status indicator, clean disconnect screen, sound notifications on peer events.
**Avoids:** No TURN server (Pitfall 1 — already configured in Phase 1); remote video autoplay failure (Pitfall 4); ICE state not handled (Pitfall 6); media track cleanup (Pitfall 3).

### Phase 4: Encrypted Chat (DataConnection + AES-GCM)
**Rationale:** Chat depends on `DataConnection` from `usePeer` (Phase 3) and the `lib/crypto.ts` pure functions. Separating this phase lets encryption be developed and tested without call quality concerns. ECDH key exchange is a non-trivial security concern that deserves focused attention; doing it under time pressure alongside call work risks producing encryption theater.
**Delivers:** `lib/crypto.ts` (ECDH key derivation, AES-GCM encrypt/decrypt, per-message IV); `useChat` hook with DataConnection listener; Chat UI panel; encrypted message send/receive flow.
**Addresses:** Encrypted text chat (AES-GCM + ECDH) — the primary differentiator.
**Avoids:** AES-GCM key insecurity (Pitfall 7 — ECDH from the start, key never in URL).

### Phase 5: Polish + Screen Sharing
**Rationale:** Screen sharing introduces `RTCRtpSender.replaceTrack` which is a known complexity requiring careful audio track management and OS stop-button handling. It pairs naturally with fullscreen mode and network quality indicator. This phase also covers visual polish (draggable self-view, light theme toggle) that requires a stable core to know what's worth polishing.
**Delivers:** Screen sharing via `getDisplayMedia`; `replaceTrack` + `screenTrack.onended` camera restore; fullscreen mode; network quality indicator (RTCPeerConnection.getStats polling); draggable self-view; light theme toggle.
**Addresses:** Screen sharing, network quality indicator, fullscreen, draggable self-view, light theme — all v1.x features.
**Avoids:** Screen share track not restored on OS stop (Pitfall 5); accidental screen audio duplication (UX pitfall).

### Phase Ordering Rationale

- Phase 1 before all others because infrastructure mistakes are the highest-cost to retrofit — TURN and signaling are foundational, not optional.
- Phase 2 before Phase 3 because `useMedia` feeds `localStream` into `usePeer`; testing media independently reduces debugging surface.
- Phase 4 after Phase 3 because `DataConnection` comes from `usePeer`; chat cannot be built without the peer connection layer.
- Phase 5 last because screen sharing and polish require a stable call to iterate on, and `replaceTrack` depends on an established `MediaConnection`.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Self-hosted PeerJS server deployment options (Railway vs. Render vs. Fly.io free tier reliability); TURN provider selection (Metered.ca vs. Cloudflare TURN credential format).
- **Phase 4:** ECDH public key serialization format over DataChannel; Web Crypto key export/import byte format details; correct ECDH-to-AES-GCM key derivation parameters.

Phases with standard patterns (skip research-phase):
- **Phase 2:** `getUserMedia`, track toggling, and Lobby UX are extremely well-documented; MDN coverage is comprehensive.
- **Phase 3:** PeerJS `MediaConnection` establish/answer flow is documented in official PeerJS docs with examples.
- **Phase 5:** `replaceTrack` and `getDisplayMedia` are well-covered in MDN; screen share patterns are consistent across references.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core packages (React, Vite, PeerJS, Tailwind) confirmed via official release notes and npm. Supporting libs (wouter, Zustand, nanoid, tailwind-merge) confirmed via npm pages — MEDIUM for exact version details but HIGH for library selection rationale. |
| Features | HIGH | Table stakes confirmed via multiple WebRTC product analyses and competitor comparison. Differentiator selection is opinionated but well-supported by competitor gap analysis. |
| Architecture | HIGH | Patterns sourced from MDN official WebRTC docs, PeerJS official docs, and Mozilla blog. Hook decomposition and ref-stable pattern are confirmed best practices. |
| Pitfalls | HIGH | All critical pitfalls cross-referenced across webrtcHacks, Mozilla, MDN, and PeerJS GitHub issues. TURN failure rate (15-30%) cited from VideoSDK documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **TURN provider credentials:** The research confirms TURN is required and lists providers but does not lock in a specific provider or credential format. Validate Cloudflare TURN vs. Metered.ca free tier limits during Phase 1 planning.
- **PeerJS self-hosted deployment platform:** Railway/Render/Fly.io are all viable but not benchmarked for cold-start reliability on free tiers. Confirm platform choice in Phase 1.
- **ECDH key exchange byte format:** The research identifies ECDH as the correct primitive but the exact DataChannel wire format for public key exchange (SubjectPublicKeyInfo encoding, ArrayBuffer vs. base64 string) needs validation during Phase 4 planning — this is an implementation detail with no single canonical reference.
- **iOS Safari camera constraints:** Research notes `exact` facingMode causes issues on mobile Safari; the safe constraint format needs validation against actual device behavior during Phase 2.
- **PeerJS free cloud HTTPS/WSS status:** The pitfall was documented historically; current status as of 2026 is uncertain. Moot if self-hosting is used from Phase 1 as recommended.

---

## Sources

### Primary (HIGH confidence)
- [PeerJS Official Docs](https://peerjs.com/docs/) — MediaConnection, DataConnection, Peer constructor, ICE config
- [MDN: Signaling and Video Calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling) — connection establishment patterns
- [MDN: RTCRtpSender.replaceTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack) — screen sharing track replacement
- [MDN: MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — camera/mic acquisition
- [MDN: Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — AES-GCM browser support
- [MDN: WebRTC DataChannels](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels) — DTLS transport encryption
- [React 19.2 blog](https://react.dev/blog/2025/10/01/react-19-2) — v19.2.4 release
- [Vite 7 announcement](https://vite.dev/blog/announcing-vite7) — v7.3.1 release, Node 20+ requirement
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4) — Vite plugin confirmed

### Secondary (MEDIUM confidence)
- [webrtcHacks: Autoplay restrictions and WebRTC](https://webrtchacks.com/autoplay-restrictions-and-webrtc/) — autoplay pitfall and `.play()` pattern
- [webrtcHacks: Guide to Safari WebRTC in the Wild](https://webrtchacks.com/guide-to-safari-webrtc/) — iOS Safari constraints
- [Mozilla Blog: Perfect Negotiation in WebRTC](https://blog.mozilla.org/webrtc/perfect-negotiation-in-webrtc/) — ICE state machine
- [BlogGeek.me: Handling Session Disconnections in WebRTC](https://bloggeek.me/handling-session-disconnections-in-webrtc/) — ICE failure recovery
- [VideoSDK: TURN Server for WebRTC](https://www.videosdk.live/developer-hub/webrtc/turn-server-for-webrtc) — 15-30% TURN dependency figure
- [PeerJS GitHub Issue #997](https://github.com/peers/peerjs/issues/997) — free cloud reliability issues documented
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay) — autoplay policy details
- [wouter npm](https://www.npmjs.com/package/wouter), [Zustand npm](https://www.npmjs.com/package/zustand), [nanoid npm](https://www.npmjs.com/package/nanoid) — version confirmation

### Tertiary (LOW confidence)
- [WebRTC.ventures: WebRTC Tech Stack Guide 2026](https://webrtc.ventures/2026/01/webrtc-tech-stack-guide-architecture-for-scalable-real-time-applications/) — page body inaccessible; title/context only

---
*Research completed: 2026-03-11*
*Ready for roadmap: yes*
