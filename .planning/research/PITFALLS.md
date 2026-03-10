# Pitfalls Research

**Domain:** Anonymous 1-on-1 WebRTC P2P video meeting app (React + PeerJS)
**Researched:** 2026-03-11
**Confidence:** HIGH (most findings verified across multiple sources including MDN, webrtcHacks, Mozilla blog, official WebRTC docs)

---

## Critical Pitfalls

### Pitfall 1: No TURN Server — Connections Fail for ~30% of Users

**What goes wrong:**
The app works perfectly in development (same network, no NAT traversal needed) and in most residential setups, then silently fails to connect for users behind strict NATs, symmetric NATs, or corporate firewalls. Connections hang at "Connecting" indefinitely or throw ICE failed errors. PeerJS free cloud server provides STUN but no TURN.

**Why it happens:**
Developers test on localhost or home networks where STUN is sufficient for direct P2P. STUN only discovers public IPs — it cannot relay traffic through firewalls. When ICE candidate gathering fails to find a viable peer-to-peer path, the connection needs a TURN relay. Research confirms 15-30% of WebRTC calls require TURN to succeed. Without it, those users get a broken product.

**How to avoid:**
Configure a TURN server in the PeerJS `config.iceServers` option from day one. Options:
- **Metered.ca or Twilio** — free TURN tiers, easy to provision credentials
- **Cloudflare TURN (Calls)** — generous free tier as of 2024, global distribution
- **Self-hosted coturn** — on a $5 VPS, but adds ops burden

Pass ICE config when constructing `Peer`:
```js
const peer = new Peer(id, {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com',
        username: 'user',
        credential: 'pass'
      }
    ]
  }
})
```

**Warning signs:**
- Connections work on localhost / same WiFi but fail between different networks
- `iceConnectionState` stays at `checking` then goes `failed`
- Users report "stuck at Connecting" — never reaching "Connected"

**Phase to address:**
Foundation / Core WebRTC phase. Must be in place before first peer connection test across different networks.

---

### Pitfall 2: PeerJS Free Cloud Server Is Unreliable for Production

**What goes wrong:**
`0.peerjs.com` (the free PeerJS cloud) has documented uptime issues, rate limiting, and intermittent connection failures with 20-second connection times reported. Because signaling is a dependency for every single call initiation, when it's flaky, the whole app is broken.

**Why it happens:**
The free server is a community resource. GitHub issues document it as "connecting unreliably, usually requiring multiple attempts." It also historically had HTTPS/WSS issues that made video calls impossible when accessed over HTTPS. Developers accept the default configuration without evaluating production suitability.

**How to avoid:**
Self-host `peerjs-server` on a minimal VPS or serverless platform. It requires no persistent state — it is stateless signaling only:
```bash
npm install -g peer
peerjs --port 9000 --key peerjs --path /peerjs
```
Alternatively, deploy as a Railway/Render/Fly.io free-tier Node service. Costs near zero. Provides WSS by default, no reliability worries.

**Warning signs:**
- PeerJS `Peer` object takes >3s to emit `open` event
- Connection attempts inconsistently succeed/fail on refresh
- Users report the app "sometimes works" but not reliably

**Phase to address:**
Foundation phase. Default to self-hosted signaling or document clearly that production requires hosting own server. Do not ship with `0.peerjs.com` as the default.

---

### Pitfall 3: Media Tracks Not Stopped on Cleanup — Camera Stays On

**What goes wrong:**
When the meeting ends, the user's browser camera indicator light (green dot) stays on. The MediaStream tracks are still running because `getUserMedia` tracks must be explicitly stopped — closing the `RTCPeerConnection` or destroying the `Peer` instance does not stop them. In React, this is amplified by `useEffect` cleanup not being implemented correctly, causing tracks to accumulate on re-renders or hot module replacement during development.

**Why it happens:**
`getUserMedia` returns a `MediaStream` whose `MediaStreamTrack`s run independently of the `RTCPeerConnection`. Destroying PeerJS objects does not cascade to stopping underlying tracks. React `useEffect` without cleanup functions creates new streams on every render without releasing old ones.

**How to avoid:**
Always stop all tracks explicitly:
```js
// In useEffect cleanup / component unmount
localStream.getTracks().forEach(track => track.stop())
peer.destroy()
```
Store the `MediaStream` reference in a `useRef` (not `useState`) so it persists across renders without triggering re-renders, and always reference the same instance in cleanup.

**Warning signs:**
- Camera indicator light remains on after leaving a meeting
- Memory usage climbs steadily in dev tools during testing
- Multiple `getUserMedia` permission prompts appear in quick succession during development

**Phase to address:**
Core WebRTC / lobby phase. Implement cleanup pattern when first wiring up `getUserMedia`.

---

### Pitfall 4: Remote Video Does Not Autoplay — Blank Video on Connection

**What goes wrong:**
The remote video element renders but shows a black/blank screen. The `MediaStream` is assigned via `srcObject` but the video never plays because Chrome and Safari block autoplay for media elements with audio unless a user gesture has been made on the page.

**Why it happens:**
Chrome autoplay policy: media with audio requires prior user gesture or the element must be muted. Since the remote stream has audio, assigning `srcObject` and relying on the `autoplay` HTML attribute silently fails. Safari on iOS has additional constraints requiring `playsInline` attribute and in some scenarios still requires a gesture to start unmuted playback.

**How to avoid:**
- Always call `.play()` programmatically on the video element after setting `srcObject`, inside the stream event handler
- Set `muted` for self-view video (prevents echo and bypasses autoplay policy)
- For remote video, set `autoplay`, `playsInline` attributes AND call `.play()` explicitly, catching the returned promise:
```js
videoRef.current.srcObject = remoteStream
videoRef.current.play().catch(err => {
  // User hasn't interacted yet — show "Click to unmute" UI
})
```
- The lobby "Join" button click counts as a user gesture, so triggering `getUserMedia` and connection setup inside that handler satisfies the policy

**Warning signs:**
- Black remote video box after connection establishes
- `DOMException: play() failed because the user didn't interact with the document first`
- Video works in Chrome dev tools but not in Safari or mobile

**Phase to address:**
Core WebRTC phase, specifically when wiring up remote stream rendering.

---

### Pitfall 5: Screen Sharing Track Replacement Leaves Users Without Video on Stop

**What goes wrong:**
When the user starts screen sharing, `replaceTrack` swaps the video sender track to the screen capture. When they stop screen sharing (or the browser stop button is clicked), the screen track ends but the camera track is never restored — leaving the remote peer with a frozen or black video.

**Why it happens:**
The `onended` event on the screen sharing track fires when the OS-level "Stop sharing" button is clicked, but this event must be manually handled to call `replaceTrack` back to the original camera track. Developers handle the button in their own UI but forget the browser-native stop button. Additionally, audio should NOT be included in the screen capture `getUserMedia` call unless separate audio mixing is intended — including it creates audio duplication/echo.

**How to avoid:**
```js
const screenTrack = screenStream.getVideoTracks()[0]
const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video')

// Swap to screen
await sender.replaceTrack(screenTrack)

// CRITICAL: handle both UI button and browser stop button
screenTrack.onended = async () => {
  await sender.replaceTrack(cameraTrack)
  setIsScreenSharing(false)
}
```
Always store the original camera track reference in a `useRef` before replacing it.

**Warning signs:**
- Remote peer sees frozen video after presenter stops screen share via browser UI
- Self-view shows black after stopping screen share
- `replaceTrack` throwing "sender not found" — means sender ref was not stored correctly

**Phase to address:**
Screen sharing feature phase.

---

### Pitfall 6: No ICE Connection State Handling — App Silently Breaks on Network Change

**What goes wrong:**
A user switches from WiFi to cellular (or vice versa), goes through a tunnel, or has a momentary network dropout. The WebRTC connection goes to `disconnected` state temporarily, then either recovers or escalates to `failed`. Without explicit handling, the UI shows "Connected" while the call is actually dead. Users don't know to refresh.

**Why it happens:**
`disconnected` is a transient state — the ICE agent tries to recover automatically. `failed` is permanent without an ICE restart. Developers wire up the initial connection state but don't implement the full state machine: `new → connecting → connected → disconnected → failed/closed`.

**How to avoid:**
Implement a complete connection state handler:
```js
peer.on('call', call => {
  call.on('iceStateChanged', state => {
    if (state === 'disconnected') {
      // Show "Reconnecting..." UI — may self-recover
      setConnectionStatus('reconnecting')
    }
    if (state === 'failed') {
      // Show "Call dropped" — needs user action
      setConnectionStatus('failed')
      handleCallEnd()
    }
    if (state === 'connected') {
      setConnectionStatus('connected')
    }
  })
})
```

**Warning signs:**
- Users report call "freezing" without any UI feedback
- Call appears active in UI but audio/video has stopped
- No "Meeting Ended" screen after network failure

**Phase to address:**
Core WebRTC phase. Connection state indicator is in scope — wire it up completely from the start.

---

### Pitfall 7: AES-GCM Key Not Exchanged Securely — Encryption Theater

**What goes wrong:**
The DataChannel is "encrypted" with AES-GCM, but the symmetric key is exchanged over the DataChannel itself (or worse, embedded in the room ID/URL). Anyone who intercepts the signaling or knows the room URL can decrypt all chat messages. The encryption is cosmetic.

**Why it happens:**
AES-GCM is symmetric — both peers need the same key. In a no-server architecture, there's no trusted key distribution service. Developers generate a key and send it over the connection without realizing the signaling layer (PeerJS server) can see that exchange.

**How to avoid:**
Use ECDH (Elliptic Curve Diffie-Hellman) to derive a shared secret without transmitting it:
```js
// Each peer generates a key pair
const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDH', namedCurve: 'P-256' },
  false, ['deriveKey']
)

// Exchange public keys via DataChannel (public key exposure is safe in ECDH)
// Derive shared AES-GCM key from ECDH
const sharedKey = await crypto.subtle.deriveKey(
  { name: 'ECDH', public: remotePublicKey },
  keyPair.privateKey,
  { name: 'AES-GCM', length: 256 },
  false, ['encrypt', 'decrypt']
)
```
Never include the encryption key in the room URL or send it over a channel visible to the signaling server.

Also: always use a fresh 96-bit random IV per message. Never reuse IVs with AES-GCM — IV reuse breaks the authentication guarantee entirely.

**Warning signs:**
- AES key is passed in the URL hash or query string
- AES key is sent as the first DataChannel message before encryption is established
- No ECDH or DH step in the key exchange flow

**Phase to address:**
Encrypted chat feature phase.

---

### Pitfall 8: React Strict Mode Double-Invocation Breaks Peer Initialization

**What goes wrong:**
In React 18 development mode with Strict Mode, `useEffect` runs twice (mount → unmount → mount). If the PeerJS `Peer` is created inside a `useEffect` without proper cleanup, two `Peer` instances are created with the same ID. The second initialization throws a "peer ID already taken" error or creates a ghost connection. Additionally, `getUserMedia` is called twice, showing two permission prompts.

**Why it happens:**
React Strict Mode intentionally double-invokes effects to surface missing cleanup. WebRTC and PeerJS objects are not React-aware — they hold connections and IDs externally. Without cleanup, the unmount phase of the first render leaves a dangling peer that blocks the re-mount.

**How to avoid:**
Use `useRef` to store the `Peer` instance and guard against double initialization:
```js
const peerRef = useRef(null)

useEffect(() => {
  if (peerRef.current) return // Guard: already initialized
  peerRef.current = new Peer(roomId)

  return () => {
    peerRef.current?.destroy()
    peerRef.current = null
  }
}, [])
```
Store `MediaStream` in a `useRef` too and stop tracks in the same cleanup.

**Warning signs:**
- "ID taken" errors in console during development
- Double camera permission prompt on page load in dev mode
- Works fine in production build but behaves erratically in dev

**Phase to address:**
Foundation / Core WebRTC phase. Set up the React/PeerJS integration pattern correctly before any feature work.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `0.peerjs.com` free cloud server | Zero infra setup | 20-second connection times, downtime, HTTPS issues | Never in production; only for initial localhost prototyping |
| STUN-only ICE config (no TURN) | No server cost | ~15-30% of users cannot connect across real networks | Never; TURN is required for production |
| Skipping ICE state change handlers | Fewer lines of code | App silently breaks on network change, no recovery path | Never for a shipped product |
| Symmetric key in URL hash | Simple key distribution | Encryption is theater — URL is logged, shared, cached | Never |
| Calling `.play()` without catching the promise | Less code | Unhandled promise rejection crashes silently in Safari | Never |
| Not stopping media tracks on cleanup | Easier initial impl | Camera light stays on, memory leaks, stale stream on re-join | Only acceptable as a known TODO in first hour of prototyping |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PeerJS `Peer` constructor | Using default config (no ICE servers) | Always pass explicit `iceServers` config including TURN |
| PeerJS `peer.call()` | Calling before `peer.open` event fires | Wait for `peer.on('open')` before initiating calls |
| PeerJS `peer.on('call')` | Not calling `call.answer(stream)` immediately | Answer must happen synchronously in the callback with local stream ready |
| `RTCRtpSender.replaceTrack()` | Forgetting to handle the screen track's `onended` event | Always set `screenTrack.onended` to restore camera track |
| `getUserMedia` | Requesting without `try/catch` | Wrap in try/catch; handle `NotAllowedError`, `NotFoundError`, `NotReadableError` separately with user-facing messages |
| `video.srcObject` | Setting via React `ref.current.src = URL.createObjectURL(stream)` | Use `ref.current.srcObject = stream` directly; `createObjectURL` for MediaStream is deprecated |
| Web Crypto `AES-GCM` | Reusing IVs or using a fixed IV | Generate `crypto.getRandomValues(new Uint8Array(12))` per message; prepend IV to ciphertext |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| High-resolution video constraints without adaptive bitrate | Call works at home WiFi, stutters on mobile data | Use `ideal` constraints not `exact`; let WebRTC negotiate: `{ width: { ideal: 1280 }, height: { ideal: 720 } }` | Low-bandwidth connections (~1-5 Mbps) |
| Not calling `stream.getTracks().forEach(t => t.stop())` on cleanup | Memory climbs during tab lifetime; camera stays active after call | Explicit track stop in all exit paths (hang up, tab close, component unmount) | After first ended call in a session |
| Adding event listeners in render (not in useEffect) | Duplicate handlers accumulate across re-renders | Attach WebRTC event listeners once inside `useEffect` with cleanup | After any re-render (immediate in dev, sooner in prod) |
| Video element not using `playsInline` on mobile | Full-screen takeover on iOS Safari; layout breaks | Always add `playsInline` attribute to all video elements | Any iOS Safari user |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| AES key in URL hash | Key visible in browser history, server logs, shared links | ECDH key derivation — never transmit symmetric key |
| No IV uniqueness in AES-GCM | Authentication tag forgery; decryption of other messages | Random 96-bit IV per encrypt call; never reuse |
| Trusting peer-provided room ID for authorization | Room ID guessing gives access to active calls | IDs are unguessable by design (`meet-xxxxxx` 6 alphanumeric = ~2.2B combos); acceptable risk for ephemeral anonymous meetings |
| Exposing TURN credentials in client bundle | TURN server bandwidth theft | Use short-lived TURN credentials (time-limited tokens); most TURN providers support TTL-based credentials |
| WebRTC signaling MitM via PeerJS server | Attacker modifies SDP/ICE candidates | Inherent limitation of non-server-verified WebRTC; acceptable for anonymous ephemeral meetings; document the threat model honestly |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No lobby/preview before joining | User joins with wrong camera or mic muted without knowing | Always show self-preview and device selection before joining |
| Generic "Connection failed" message | User doesn't know if it's their internet, the other person's, or the app | Distinguish: "Waiting for other person", "Network issue — check your connection", "Call ended by other participant" |
| No indication that mic is muted when muted | User talks without knowing they can't be heard | Persistent, unmissable visual indicator when mic is off; audio visualizer in self-view |
| Autoplay blocked without fallback UI | Remote video stays black; user thinks the other person has no camera | Detect autoplay failure; show "Click to start video" button |
| Self-view video mirroring inconsistency | Camera shows un-mirrored (like others see you); feels unnatural for self-view | CSS `transform: scaleX(-1)` on self-view video element only |
| Screen share audio included unintentionally | Echo or double audio when sharing system audio | `getDisplayMedia({ video: true, audio: false })` by default; offer audio as opt-in |

---

## "Looks Done But Isn't" Checklist

- [ ] **TURN server:** Connection works across different real networks (not just same LAN or WiFi) — verify by testing between mobile data and home WiFi
- [ ] **Camera cleanup:** Camera indicator light is OFF after ending a meeting — no tracks left running
- [ ] **Remote video autoplay:** Remote video plays immediately on connection in Safari and Chrome without user having to click
- [ ] **Screen share stop:** When user clicks OS-level "Stop Sharing" button (not just the app button), camera video is restored to remote peer
- [ ] **ICE failure handling:** When peer's network drops, UI shows "Reconnecting..." or "Call dropped" rather than staying on "Connected"
- [ ] **React Strict Mode:** No double-initialization errors in development console; no duplicate camera prompts
- [ ] **Encrypted chat key exchange:** AES key is never in the URL, never sent as plaintext before encryption is established
- [ ] **Mobile Safari:** Video renders with `playsInline`; no full-screen takeover; camera constraints do not use `exact` facingMode
- [ ] **Permission denied:** Camera/mic denial shows a clear message with instructions, not a blank screen or console error
- [ ] **Tab close cleanup:** `beforeunload` event destroys peer and stops tracks so the other participant gets a clean "call ended" state

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Shipped without TURN server | HIGH | Provision TURN credentials, update PeerJS config, redeploy static site; no data migration needed |
| PeerJS free cloud server in production | MEDIUM | Self-host `peerjs-server` on Render/Railway (30 min), update env var in app, redeploy |
| Camera stays on after call (no track cleanup) | MEDIUM | Audit all exit paths (hang up, navigation, unmount), add `track.stop()` calls, verify in all paths |
| AES key in URL | HIGH | Redesign key exchange to ECDH before shipping; cannot patch without breaking all existing sessions |
| No ICE state handling (silent failures) | LOW-MEDIUM | Add event listeners for `iceConnectionState`; wire to existing connection status UI component |
| Screen share doesn't restore camera | LOW | Add `screenTrack.onended` handler; small isolated fix |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No TURN server | Foundation/Core WebRTC | Test connection between different networks (mobile hotspot vs WiFi) |
| PeerJS free cloud unreliable | Foundation | App uses self-hosted or configured signaling server, not `0.peerjs.com` |
| Media tracks not stopped | Core WebRTC + cleanup | Camera light off after call ends; memory profile shows no stream accumulation |
| Remote video autoplay fails | Core WebRTC / stream rendering | Remote video plays in Safari, Chrome, mobile without user click |
| Screen share track replacement bug | Screen sharing feature | Stop via browser OS button; camera video restores to remote peer |
| No ICE state handling | Core WebRTC | Simulate network drop; UI reflects disconnected/reconnecting state |
| AES-GCM key not secure | Encrypted chat feature | Key never appears in URL, network tab, or DataChannel before ECDH completes |
| React Strict Mode double-init | Foundation/React setup | No console errors in dev mode; no double permission prompts |

---

## Sources

- [WebRTC.ventures: Why WebRTC Remains Deceptively Complex in 2025](https://webrtc.ventures/2025/08/why-webrtc-remains-deceptively-complex-in-2025/)
- [VideoSDK: TURN Server for WebRTC — Complete Guide to NAT Traversal](https://www.videosdk.live/developer-hub/webrtc/turn-server-for-webrtc)
- [webrtcHacks: Autoplay restrictions and WebRTC](https://webrtchacks.com/autoplay-restrictions-and-webrtc/)
- [webrtcHacks: Dealing with HTMLMediaElements and srcObjects in WebRTC applications](https://webrtchacks.com/srcobject-intervention/)
- [webrtcHacks: WebRTC and Man in the Middle Attacks](https://webrtchacks.com/webrtc-and-man-in-the-middle-attacks/)
- [Mozilla Blog: Perfect negotiation in WebRTC](https://blog.mozilla.org/webrtc/perfect-negotiation-in-webrtc/)
- [MDN: RTCRtpSender.replaceTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack)
- [MDN: MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN: RTCPeerConnection: connectionState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState)
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay)
- [PeerJS GitHub Issue #997: Cloud limitations](https://github.com/peers/peerjs/issues/997)
- [PeerJS GitHub Issue #461: Public server is unreliable](https://github.com/peers/peerjs-server/issues/461)
- [BlogGeek.me: Handling Session Disconnections in WebRTC](https://bloggeek.me/handling-session-disconnections-in-webrtc/)
- [WebRTC Security Study](https://webrtc-security.github.io/)
- [Mozilla Bugzilla: AES-GCM 0-length IV vulnerability](https://bugzilla.mozilla.org/show_bug.cgi?id=1368859)
- [webrtcHacks: Guide to Safari WebRTC in the Wild](https://webrtchacks.com/guide-to-safari-webrtc/)

---
*Pitfalls research for: Anonymous 1-on-1 WebRTC P2P video meeting app (React + PeerJS)*
*Researched: 2026-03-11*
