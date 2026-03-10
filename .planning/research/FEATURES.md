# Feature Research

**Domain:** Anonymous ephemeral 1-on-1 WebRTC video meeting app
**Researched:** 2026-03-11
**Confidence:** HIGH (core WebRTC table stakes), MEDIUM (differentiators based on competitor analysis)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users assume exist in any video call product. Missing these causes immediate abandonment — users do not give credit for them, they only notice their absence.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Camera on/off toggle | Every video app since Zoom normalized it; users join meetings mid-commute | LOW | MediaStreamTrack.enabled = false; no renegotiation needed |
| Mic mute/unmute toggle | Users expect to control audio before speaking; accidental audio is a social norm violation | LOW | Same as camera — toggle track.enabled |
| Self-preview (picture-in-picture) | Users need to verify their own video before/during a call | LOW | Render local stream to a secondary `<video>` element |
| Lobby / pre-join screen with preview | Users verify AV setup before entering; absent = jarring cold-join | MEDIUM | Camera/mic preview, device check, join button flow |
| Shareable room link | Core sharing mechanism for no-signup apps; without it, users have no way to invite | LOW | URL param or hash contains room ID |
| Copy link button | Reduces friction in sharing the room URL | LOW | navigator.clipboard.writeText |
| Connection status indicator | Users need to know if connected, connecting, or dropped; absence creates panic | MEDIUM | PeerJS connection events map to Connecting / Connected / Disconnected states |
| Clean disconnect / "Meeting Ended" screen | When a peer leaves, the UI must clearly communicate it; silent black screen = broken product feeling | MEDIUM | Handle peer close/error events; show distinct end state |
| Audio + video working simultaneously | The baseline of a video call; broken simultaneous AV = not a video call | HIGH | getUserMedia with both constraints; track management across signaling |
| Responsive layout (desktop + mobile) | Users join from phones routinely; broken mobile = inaccessible product | MEDIUM | Flexbox / CSS Grid; touch targets sized correctly; landscape/portrait handling |
| Works without account / no sign-up | For no-signup apps, this is the whole proposition; requiring login breaks it entirely | LOW | Pure client-side; no auth flow |
| HTTPS / secure context | WebRTC getUserMedia requires a secure context; HTTP = nothing works | LOW | Deployment concern; GitHub Pages and Vercel enforce HTTPS by default |

---

### Differentiators (Competitive Advantage)

Features that set MeetDrop apart within the anonymous/ephemeral niche. The differentiator cluster should reinforce the "no trace, private by default" value proposition.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| End-to-end encrypted text chat (AES-GCM) | Most no-signup tools don't encrypt DataChannel messages; this signals genuine privacy intent | MEDIUM | Web Crypto API AES-GCM; generate shared key from ECDH or pass via link fragment; no server sees plaintext |
| Screen sharing with seamless track replacement | Expected in enterprise tools but rare in ephemeral apps; adds utility without requiring accounts | MEDIUM | RTCRtpSender.replaceTrack() to swap camera track for screen track; needs careful audio handling to avoid audio track churn |
| Network quality indicator | Peer-to-peer quality varies wildly; a clear indicator gives users agency (can reconnect, move closer to router) | MEDIUM | RTCPeerConnection.getStats() polling for RTT, packet loss, jitter; map to simple Good/Fair/Poor signal display |
| Draggable self-view | Polished detail that no-signup tools typically omit; signals product care | LOW | CSS dragging or pointer events on the self-view PiP element |
| Sound notifications (join/leave) | Subtle audio cue when peer connects/disconnects; reduces confusion in tab-switching workflows | LOW | Short Web Audio API tone or preloaded audio file triggered on connection events |
| Dark / light theme toggle | Privacy-adjacent aesthetic; dark default matches "anonymous" feel; light for accessibility | LOW | CSS custom properties / Tailwind dark: variants; persist preference to localStorage |
| Fullscreen mode for remote video | Users watching presentations expect focus mode; removes chrome | LOW | HTMLElement.requestFullscreen(); toggle button overlay |
| Human-readable room IDs (`meet-xxxxxx`) | Easier to share verbally than UUID; friendlier than random strings | LOW | 6 alphanumeric chars; generated client-side with nanoid or Math.random |
| Zero-persistence guarantee (tab-close = gone) | Explicit product promise that no data survives; differentiates from tools that log metadata | LOW | Architecture constraint, not a feature to build — but must be communicated in UI copy |
| No installation / browser-native | Frictionless entry; no extension, no app download | LOW | Pure WebRTC + browser APIs; PeerJS cloud handles signaling |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but conflict with the project's philosophy or create disproportionate complexity for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Call recording | Users want to save meetings | Directly contradicts "no trace" / ephemeral promise; requires server storage or complex client-side blob handling; creates liability | Explicitly communicate the no-recording guarantee as a feature, not a gap |
| Virtual backgrounds (BodyPix / TensorFlow.js) | Zoom normalized it; privacy-conscious users want to hide home environment | TensorFlow.js BodyPix adds ~3MB+ to the bundle; GPU-intensive; degrades connection quality on low-end devices; v1 cost >> benefit | Defer to v2+ only if usage data shows camera-on rate is hurt by background concerns |
| Multi-party calls (3+ participants) | Groups want to use the tool | 1-on-1 via PeerJS is the architecture; mesh WebRTC for 3+ requires SFU (a server) which breaks the no-backend constraint | Explicitly scope to 1-on-1; market it as intentional intimacy |
| User accounts / persistent rooms | Power users want "always-on" room URLs | Requires a database, auth, session management — contradicts the zero-server-state philosophy | Ephemeral room IDs regenerated per session; users share link each time |
| Chat history / message persistence | Users want to copy links shared in chat | Persisting messages requires storage; contradicts ephemerality | Encrypt chat in-session via AES-GCM DataChannel; make it clear messages vanish with the tab |
| Waiting room / lobby approval flow | Meeting hosts want to vet who joins | Requires a signaling server that can hold state between host and joiner — incompatible with PeerJS's thin signaling model | First-peer-connected-is-host model; or keep 1-on-1 which inherently limits unknown joiners |
| Noise cancellation / AI audio processing | Zoom/Meet have it; users notice background noise | Requires Krisp-style SDK or RNNoise WASM — meaningful bundle addition; v1 browser's built-in echo cancellation is sufficient | Rely on browser's built-in echoCancellation and noiseSuppression getUserMedia constraints (free, zero bundle cost) |
| File sharing | Users want to share documents | Large file transfers over DataChannel are technically supported but complex to implement reliably; out of scope for a video call MVP | Defer entirely; users can share links in chat |
| Raise hand / reactions / polls | Enterprise collaboration features | Significant UI complexity; not aligned with 1-on-1 ephemeral use case | Out of scope; this isn't a webinar tool |
| Admin / moderation controls | Multi-user safety features | Inapplicable to 1-on-1 architecture | N/A |

---

## Feature Dependencies

```
[Room ID generation]
    └──required by──> [Shareable room link]
                          └──required by──> [Copy link button]
                          └──required by──> [Lobby / pre-join screen]

[getUserMedia (camera + mic)]
    └──required by──> [Camera on/off toggle]
    └──required by──> [Mic mute/unmute toggle]
    └──required by──> [Self-preview]
    └──required by──> [Lobby preview screen]

[WebRTC peer connection (PeerJS)]
    └──required by──> [Connection status indicator]
    └──required by──> [Audio + video call]
    └──required by──> [Clean disconnect screen]
    └──required by──> [Screen sharing]
    └──required by──> [Network quality indicator]
    └──required by──> [Sound notifications]

[DataChannel (PeerJS)]
    └──required by──> [Encrypted text chat]
    └──required by──> [Sound notifications (event signaling)]

[AES-GCM key exchange]
    └──required by──> [Encrypted text chat]

[RTCPeerConnection.getStats()]
    └──required by──> [Network quality indicator]

[Screen sharing (getDisplayMedia)]
    └──requires──> [RTCRtpSender.replaceTrack()]  [HIGH complexity integration point]

[Theme preference]
    └──enhances──> [localStorage persistence]  [independent, no hard dependency]

[Draggable self-view]
    └──enhances──> [Self-preview]

[Fullscreen mode]
    └──enhances──> [Remote video display]
```

### Dependency Notes

- **Screen sharing requires replaceTrack() care:** When swapping the camera track for a screen-capture track, audio track management is a known pitfall — calling getUserMedia again for screen can create a second audio track. Get the video RTCRtpSender via getSenders(), filter by kind, and call replaceTrack() without re-requesting audio.
- **Encrypted chat requires key agreement:** AES-GCM needs a shared key. The simplest approach for no-backend: generate key material on one side, encode it in the room link fragment (never sent to server), and derive on join. Web Crypto ECDH is the right primitive.
- **Connection status depends on PeerJS event API:** Events `open`, `close`, `error`, `disconnected` on the Peer and DataConnection/MediaConnection objects are the source of truth for status indicator states.
- **Network quality indicator is polling-based:** getStats() must be polled on an interval (every 2-5 seconds); it's not event-driven. Polling too frequently degrades performance.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — validates the core "anonymous ephemeral 1-on-1 video call" concept.

- [ ] Room ID generation and shareable URL — without this, nobody can meet
- [ ] Lobby / pre-join preview screen — validates AV setup before a call; missing this degrades first impressions permanently
- [ ] Camera and mic toggles — table stakes; a call without mute is broken
- [ ] WebRTC 1-on-1 video + audio call (PeerJS) — the entire product
- [ ] Connection status indicator — users need feedback during P2P negotiation which can take 5-15 seconds
- [ ] Clean disconnect / "Meeting Ended" screen — essential for understanding session state
- [ ] Copy link button — sharing mechanism
- [ ] Responsive design (desktop + mobile) — too many users on mobile to skip
- [ ] Self-preview (PiP) — part of baseline video call UX
- [ ] Sound notifications (join/leave) — low effort, high polish signal
- [ ] Encrypted text chat via DataChannel (AES-GCM) — core differentiator; establishes privacy credibility from day one
- [ ] Dark theme default — low effort, reinforces brand identity

### Add After Validation (v1.x)

Features to add once core call flow is working and used.

- [ ] Screen sharing with track replacement — add once basic call is stable; many users will expect it
- [ ] Network quality indicator — add once call quality issues surface in real usage
- [ ] Draggable self-view — polish detail; add when core UX is settled
- [ ] Light theme toggle — add alongside dark theme; negligible effort once CSS vars are in place
- [ ] Fullscreen mode for remote video — add when screen sharing is present; they pair naturally

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] Virtual backgrounds (TensorFlow.js BodyPix) — only if analytics show camera-off rate is problematic
- [ ] File sharing over DataChannel — add only if users request it through real usage feedback
- [ ] Custom room ID slugs — nice UX, needs collision-checking logic

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 1-on-1 video + audio (PeerJS) | HIGH | HIGH | P1 |
| Lobby / pre-join preview | HIGH | MEDIUM | P1 |
| Camera + mic toggles | HIGH | LOW | P1 |
| Shareable room link + copy button | HIGH | LOW | P1 |
| Connection status indicator | HIGH | MEDIUM | P1 |
| Clean disconnect screen | HIGH | LOW | P1 |
| Self-preview (PiP) | HIGH | LOW | P1 |
| Encrypted text chat (AES-GCM) | HIGH | MEDIUM | P1 |
| Responsive design | HIGH | MEDIUM | P1 |
| Sound notifications | MEDIUM | LOW | P1 |
| Dark theme default | MEDIUM | LOW | P1 |
| Screen sharing | HIGH | MEDIUM | P2 |
| Network quality indicator | MEDIUM | MEDIUM | P2 |
| Draggable self-view | LOW | LOW | P2 |
| Light theme toggle | LOW | LOW | P2 |
| Fullscreen mode | MEDIUM | LOW | P2 |
| Virtual backgrounds | MEDIUM | HIGH | P3 |
| File sharing | LOW | HIGH | P3 |
| Custom room slugs | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Reference apps: Jitsi Meet (open-source, no-signup), Whereby (link-based, no download), Daily.co (developer-focused), EXTRA SAFE (anonymous P2P).

| Feature | Jitsi Meet | Whereby | EXTRA SAFE | MeetDrop Approach |
|---------|------------|---------|------------|-------------------|
| No sign-up required | Yes | Yes (host needs account) | Yes | Yes — zero accounts by design |
| Shareable link | Yes | Yes | Yes (link or QR) | Yes — room ID in URL |
| End-to-end encryption | Optional (E2EE mode) | TLS only | Yes (Ethereum keys) | Yes — AES-GCM DataChannel for chat; WebRTC DTLS/SRTP for media |
| Chat | Yes (unencrypted by default) | Yes | Yes (E2EE) | Yes — AES-GCM encrypted |
| Screen sharing | Yes | Yes | No | Yes |
| No server-side data | No (server logs) | No (Whereby servers) | Partial | Yes — PeerJS signaling only, no media server |
| Ephemeral rooms | No (persistent room names) | Partially | Yes | Yes — tab close = gone |
| Mobile browser | Yes | Yes | Yes | Yes |
| Virtual backgrounds | Yes | Yes | No | No (v1 out of scope) |
| Recording | Yes | Yes (paid) | No | No — anti-feature by design |
| Multi-party | Yes (unlimited) | Yes (up to 50) | Yes (up to 5) | No — 1-on-1 only by design |
| Network quality indicator | Yes | Partial | No | Yes |
| Dark theme | No (light only) | No | Yes | Yes — dark default |

---

## Sources

- [WebRTC Video Calling Table Stakes — BlogGeek.me](https://bloggeek.me/webrtc-video-calling-table-stakes/)
- [Video Call App Secure & Encrypted — TrueConf](https://trueconf.com/blog/reviews-comparisons/video-call-app-secure)
- [Anonymous Video Chat: Which Platform to Use — TRTC](https://trtc.io/blog/details/anonymous-video-chat)
- [Proton Meet: secure video conferencing](https://proton.me/meet)
- [SimpleX Chat: no user IDs](https://simplex.chat/)
- [EXTRA SAFE: anonymous P2P video](https://www.extrasafe.chat/private-video-call)
- [Jitsi vs. Whereby comparison — Jitsi.guide](https://jitsi.guide/blog/jitsi-vs-whereby/)
- [PeerJS documentation — peerjs.com](https://peerjs.com/)
- [RTCRtpSender.replaceTrack() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack)
- [Measuring WebRTC Call Quality — 100ms](https://www.100ms.live/blog/measuring-webrtc-call-quality-part-1)
- [Bad internet connection detection in WebRTC — Evgeny Melnikov / Medium](https://medium.com/@evgmel/bad-internet-connection-and-how-to-detect-it-in-a-webrtc-call-cfdf655dbd49)
- [Designing a Seamless Video Conferencing UX — Digital Samba](https://www.digitalsamba.com/blog/good-ux-design-for-video-conferencing)
- [Product design anatomy of video call UI — Daily.co](https://www.daily.co/blog/the-product-design-anatomy-of-our-video-call-ui/)
- [Video Chatting and Screen Sharing with React + PeerJS — DEV Community](https://dev.to/arjhun777/video-chatting-and-screen-sharing-with-react-node-webrtc-peerjs-18fg)

---
*Feature research for: Anonymous ephemeral 1-on-1 WebRTC video meeting (MeetDrop)*
*Researched: 2026-03-11*
