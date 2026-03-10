# Architecture Research

**Domain:** Browser-based anonymous 1-on-1 WebRTC video meeting app (PeerJS, no backend)
**Researched:** 2026-03-11
**Confidence:** HIGH (MDN, official WebRTC docs, PeerJS docs, verified patterns)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Page Layer  │  │  UI Layer    │  │  Logic Layer │              │
│  │              │  │              │  │              │              │
│  │  /           │  │  <VideoGrid> │  │  usePeer     │              │
│  │  /room/:id   │  │  <Controls>  │  │  useMedia    │              │
│  │  /ended      │  │  <Chat>      │  │  useChat     │              │
│  │              │  │  <Lobby>     │  │  useRoom     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                │                 │                       │
├─────────┴────────────────┴─────────────────┴───────────────────────┤
│                    WebRTC / PeerJS Layer                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Peer instance  │  │  MediaConnection │  │  DataConnection  │  │
│  │  (signaling ID)  │  │  (video/audio)   │  │  (chat/ctrl)     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     Browser APIs                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │getUserMedia  │  │getDisplayMedia│  │ Web Crypto   │              │
│  │(camera/mic)  │  │(screen share)│  │ (AES-GCM)    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
          │                                        │
          │  WebSocket (signaling only)             │  P2P media (SRTP)
          ▼                                        ▼
  ┌───────────────────┐                   ┌────────────────┐
  │  PeerJS Cloud     │                   │  Remote Peer   │
  │  (PeerServer)     │                   │  (other tab)   │
  │  SDP + ICE relay  │                   └────────────────┘
  └───────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Page Router | Map URLs to views, extract room ID from URL hash/path | React Router, `useParams` |
| Lobby Page | Pre-join preview, device selection, copy-link UI | React component, local camera preview |
| Room Page | Active call layout, render local + remote video | React component, orchestrates hooks |
| Ended Page | Post-call screen, re-join or return home option | Simple static React component |
| `<VideoGrid>` | Render local self-view and remote stream | Two `<video>` elements, drag logic |
| `<Controls>` | Mic toggle, camera toggle, screen share, hang up | Button bar, reads state from hooks |
| `<Chat>` | Encrypted message input + message list | DataChannel consumer, Web Crypto |
| `<ConnectionStatus>` | Visual indicator of ICE/peer connection state | Reads connection state from usePeer |
| `usePeer` | Manage PeerJS `Peer` instance, `MediaConnection`, `DataConnection` lifecycle | Custom hook with useRef, useEffect |
| `useMedia` | Manage `getUserMedia` / `getDisplayMedia` streams, track replacement | Custom hook |
| `useChat` | Encrypt/decrypt messages, maintain message array | Custom hook, Web Crypto API |
| `useRoom` | Generate/parse room ID from URL, clipboard copy | Custom hook, URL manipulation |

## Recommended Project Structure

```
src/
├── pages/
│   ├── LobbyPage.tsx         # Pre-join camera preview + copy link
│   ├── RoomPage.tsx          # Active call shell, wires hooks to UI
│   └── EndedPage.tsx         # Post-call screen
├── components/
│   ├── VideoGrid.tsx         # Local + remote video layout
│   ├── SelfView.tsx          # Draggable picture-in-picture self-view
│   ├── Controls.tsx          # Media control bar
│   ├── Chat.tsx              # Encrypted chat panel
│   ├── ConnectionStatus.tsx  # Connection state badge
│   └── NetworkQuality.tsx    # RTCStatsReport-based quality indicator
├── hooks/
│   ├── usePeer.ts            # PeerJS instance + connection lifecycle
│   ├── useMedia.ts           # getUserMedia, getDisplayMedia, track swap
│   ├── useChat.ts            # DataChannel messaging + AES-GCM encryption
│   └── useRoom.ts            # Room ID generation, URL, clipboard
├── lib/
│   ├── crypto.ts             # AES-GCM key generation, encrypt, decrypt
│   ├── room.ts               # Room ID generation (meet-xxxxxx format)
│   └── sounds.ts             # Audio notification utilities
├── types/
│   └── index.ts              # Shared TypeScript types
├── App.tsx                   # Router setup
└── main.tsx                  # Vite entry point
```

### Structure Rationale

- **pages/:** Route-level components own layout and hook composition. Keep thin.
- **components/:** Pure-UI components receive props/callbacks from pages. No direct hook calls to PeerJS.
- **hooks/:** All side effects, WebRTC state, and media lifecycle live here. Pages consume these.
- **lib/:** Pure functions with no React dependencies. Easiest to unit test. crypto.ts especially.
- **types/:** Single source of truth for `ConnectionState`, `ChatMessage`, `MediaState` types.

## Architectural Patterns

### Pattern 1: Custom Hook Per Concern

**What:** Separate `usePeer`, `useMedia`, and `useChat` rather than one monolithic `useWebRTC` hook.
**When to use:** Always for this app — three distinct concerns with different lifecycles.
**Trade-offs:** More files; clearer ownership; each hook can be developed and tested independently. The alternative (one massive hook) is harder to debug when media or data channel fails independently.

**Example:**
```typescript
// RoomPage.tsx — hooks compose cleanly at the page level
export function RoomPage() {
  const { roomId } = useRoom();
  const { localStream, isMicOn, isCamOn, toggleMic, toggleCam, startScreenShare } = useMedia();
  const { remoteStream, connectionState, hangUp } = usePeer(roomId, localStream);
  const { messages, sendMessage } = useChat(/* dataConnection from usePeer */);

  return <RoomLayout ... />;
}
```

### Pattern 2: Ref-Stable PeerJS Objects

**What:** Store `Peer`, `MediaConnection`, and `DataConnection` instances in `useRef`, not `useState`.
**When to use:** Always. PeerJS objects are not serializable and should not trigger re-renders on mutation.
**Trade-offs:** You lose automatic re-render on object change; compensate by keeping connection *state* (enum string) in `useState`.

**Example:**
```typescript
const peerRef = useRef<Peer | null>(null);
const mediaConnRef = useRef<MediaConnection | null>(null);
const [connectionState, setConnectionState] = useState<ConnectionState>('idle');

// State drives UI; refs drive WebRTC side effects
```

### Pattern 3: Two Connections — MediaConnection + DataConnection

**What:** Establish both a `MediaConnection` (video/audio) and a `DataConnection` (chat) to the same peer.
**When to use:** Always for this app — they are independent PeerJS connection types.
**Trade-offs:** Two separate handshakes on join; small overhead. Benefit: if DataConnection drops, video continues.

The caller initiates both: `peer.call(remotePeerId, localStream)` and `peer.connect(remotePeerId)`. The callee answers both incoming events: `peer.on('call')` and `peer.on('connection')`.

### Pattern 4: URL as Room Coordinator

**What:** Room ID embedded in the URL (e.g., `/room/meet-abc123`). Both users share the same URL. The second user to load the page is the "caller" (they know the other peer's ID via a known derivation scheme or the first user posts their PeerJS ID mapped to the room ID).
**When to use:** This is the only viable approach for a no-backend system.
**Trade-offs:** PeerJS peer IDs are random UUIDs by default, not the room ID — you must set `new Peer(roomId)` using the room ID as the PeerJS ID so the second peer knows who to call. The "first peer" uses the room ID as its PeerJS ID; the second peer connects to it.

**Example:**
```typescript
// First peer: peer ID = room ID
const peer = new Peer(roomId);

// Second peer: also uses the room ID but connects to it
const peer = new Peer(); // random ID for themselves
peer.on('open', () => peer.call(roomId, localStream)); // call the first peer
```

## Data Flow

### Connection Establishment Flow

```
User A creates room
    ↓
generateRoomId() → "meet-abc123"
    ↓
URL becomes /room/meet-abc123
    ↓
new Peer("meet-abc123") registers with PeerJS cloud
    ↓
User A shares URL with User B
    ↓
User B loads /room/meet-abc123
    ↓
new Peer(randomId) → peer.on('open')
    ↓
peer.call("meet-abc123", localStream)     ← MediaConnection initiated
peer.connect("meet-abc123")               ← DataConnection initiated
    ↓
User A: peer.on('call') → call.answer(localStream)
User A: peer.on('connection') → store dataConn
    ↓
Both: mediaConn.on('stream') → render remote video
Both: dataConn.on('open') → chat ready
```

### Media Control Flow

```
User clicks "Mute"
    ↓
toggleMic() in useMedia
    ↓
localStream.getAudioTracks()[0].enabled = false    ← no renegotiation
    ↓
isMicOn state flips → Controls re-renders

User clicks "Share Screen"
    ↓
getDisplayMedia() → screenStream
    ↓
RTCRtpSender.replaceTrack(screenTrack)    ← no renegotiation needed
    ↓
Remote peer receives new video track automatically
    ↓
screenTrack.onended → replaceTrack(cameraTrack) to restore camera
```

### Chat Message Flow

```
User types message → sendMessage(text)
    ↓
crypto.encrypt(text, sharedKey) → ciphertext (AES-GCM)
    ↓
dataConn.send({ type: 'chat', payload: ciphertext, timestamp })
    ↓
[P2P DataChannel — never touches any server]
    ↓
Remote: dataConn.on('data') → crypto.decrypt(payload, sharedKey)
    ↓
messages state updated → Chat component re-renders
```

### State Management

```
usePeer hook
    ↓ (exposes)
connectionState: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
remoteStream: MediaStream | null
    ↓ (consumed by)
ConnectionStatus component  ←  reads connectionState
VideoGrid component         ←  reads remoteStream

useMedia hook
    ↓ (exposes)
localStream: MediaStream | null
isMicOn: boolean
isCamOn: boolean
isScreenSharing: boolean
    ↓ (consumed by)
Controls component          ←  reads toggles, calls toggle functions
VideoGrid/SelfView          ←  reads localStream
```

## Scaling Considerations

This is a 1-on-1 P2P app by design. Scaling is not a concern in the traditional sense.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user pair | Current architecture — full mesh (2 nodes = trivially optimal) |
| PeerJS cloud limit | Free PeerJS cloud has rate limits. Self-host `peer-server` npm package on a VPS if needed |
| Network quality degrades | `RTCPeerConnection.getStats()` exposes packet loss / jitter. Read via interval in `useMedia` |
| NAT traversal fails | PeerJS cloud provides STUN. For very restrictive NATs, a TURN server is required (not included by default) |

### Scaling Priorities

1. **First bottleneck:** PeerJS free cloud rate limits. Fix by self-hosting `peerjs-server` (one npm package, trivial Node deployment).
2. **Second bottleneck:** Users behind symmetric NAT with no TURN server — connection falls back to relayed. Fix by adding a TURN server (Coturn on VPS) to the PeerJS config.

## Anti-Patterns

### Anti-Pattern 1: Storing PeerJS Objects in React State

**What people do:** `const [peer, setPeer] = useState(new Peer())`
**Why it's wrong:** PeerJS objects are mutable event emitters. Storing them in state causes double-initialization in StrictMode, re-render loops, and stale closure bugs in event handlers.
**Do this instead:** Store in `useRef`. Only store connection *state* (a string enum) in `useState`.

### Anti-Pattern 2: Reinitializing Peer on Every Render

**What people do:** `new Peer()` directly in the component body or inside a `useEffect` without a guard.
**Why it's wrong:** Each `Peer()` constructor opens a new WebSocket to the signaling server. Multiple instances = duplicate events, ghost connections, memory leaks.
**Do this instead:** Initialize inside `useEffect` with an empty dependency array. Destroy in the cleanup: `peer.destroy()`.

### Anti-Pattern 3: Track Disable vs. Track Removal for Mute

**What people do:** Remove the audio track from the peer connection to "mute."
**Why it's wrong:** Removing a track requires SDP renegotiation (an offer/answer cycle). This is slow and brittle.
**Do this instead:** Keep the track on the connection; set `track.enabled = false` for mute. No renegotiation needed. Enabled state is not transmitted — the track sends silence when disabled.

### Anti-Pattern 4: Encrypting Chat with a Static Hardcoded Key

**What people do:** Hardcode an AES key or derive it from the room ID alone.
**Why it's wrong:** Room IDs appear in the URL. Anyone who intercepts the URL gets the key. Provides no real security.
**Do this instead:** Generate a fresh key via `crypto.subtle.generateKey` per session, exchange it over the DataChannel before the first message (the DataChannel itself is DTLS-encrypted at the WebRTC layer), or derive it from a user-generated passphrase kept out-of-band.

### Anti-Pattern 5: Using `srcObject = stream` with Autoplay Blocking

**What people do:** Assign `video.srcObject = remoteStream` and expect it to play.
**Why it's wrong:** Browsers block autoplay for videos with audio. The video silently fails.
**Do this instead:** Set `video.muted = true` on the *local* self-view (you don't want to hear yourself). For the *remote* video, the browser will play audio if the page has been interacted with. Add an "unmute" button as fallback. Use the `playsInline` attribute for mobile Safari.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PeerJS Cloud (broker.peerjs.com) | `new Peer(id)` — WebSocket signaling only | Free tier has connection limits. Can swap to self-hosted `peerjs-server` with zero code change |
| STUN (built into PeerJS) | Automatic via PeerJS defaults (Google STUN) | Required for NAT traversal |
| TURN (optional) | Pass `config: { iceServers: [...] }` to `new Peer()` | Only needed for users behind symmetric NAT. Not included in default setup |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `usePeer` ↔ `useMedia` | `localStream` passed as argument to `usePeer` | Media hook owns stream lifecycle; peer hook consumes it |
| `usePeer` ↔ `useChat` | `dataConn` ref exposed or passed to `useChat` | Chat hook attaches listeners to the DataConnection |
| `useChat` ↔ `lib/crypto` | Direct function calls (`encrypt`, `decrypt`) | No React coupling — crypto functions are pure async |
| Page ↔ Components | Props + callbacks | Components never call hooks directly; pages mediate |
| `useRoom` ↔ Router | `useParams()` reads room ID from URL | Generating a new ID uses `lib/room.ts` |

## Build Order Implications

The component dependency graph dictates this build sequence:

1. **lib/room.ts** — Room ID generation. No dependencies. Build first.
2. **lib/crypto.ts** — AES-GCM encrypt/decrypt. No dependencies. Build alongside room.ts.
3. **lib/sounds.ts** — Audio utilities. No dependencies.
4. **useMedia** — Needs nothing but browser APIs. Enables camera/mic work before PeerJS is wired.
5. **usePeer** — Depends on `localStream` from `useMedia`. Core of the app.
6. **useChat** — Depends on `DataConnection` from `usePeer` + `lib/crypto`.
7. **useRoom** — Light utility; build early alongside useMedia.
8. **Lobby/Preview UI** — Depends on `useMedia` only. Can build and test in isolation.
9. **Room layout + VideoGrid** — Depends on `usePeer` + `useMedia`.
10. **Controls** — Depends on media state toggles.
11. **Chat panel** — Depends on `useChat`.
12. **ConnectionStatus + NetworkQuality** — Depends on connection state from `usePeer`.
13. **Ended screen + routing** — Final integration glue.

## Sources

- [MDN: Signaling and Video Calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling) — HIGH confidence
- [MDN: Perfect Negotiation Pattern](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation) — HIGH confidence
- [MDN: WebRTC Connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity) — HIGH confidence
- [MDN: RTCRtpSender.replaceTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack) — HIGH confidence
- [PeerJS Official Docs](https://peerjs.com/docs/) — HIGH confidence
- [LogRocket: Getting Started with PeerJS](https://blog.logrocket.com/getting-started-peerjs/) — MEDIUM confidence
- [WebRTC.ventures: WebRTC Tech Stack Guide 2026](https://webrtc.ventures/2026/01/webrtc-tech-stack-guide-architecture-for-scalable-real-time-applications/) — MEDIUM confidence (page body inaccessible)

---
*Architecture research for: anonymous 1-on-1 WebRTC video meeting app (PeerJS + React, no backend)*
*Researched: 2026-03-11*
