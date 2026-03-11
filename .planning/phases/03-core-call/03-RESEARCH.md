# Phase 3: Core Call - Research

**Researched:** 2026-03-11
**Domain:** PeerJS MediaConnection, WebRTC ICE state tracking, call teardown, Web Audio API notifications
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AV-01 | User can make a 1-on-1 video and audio call via WebRTC (PeerJS) | PeerJS 1.5.5 `peer.call(remotePeerId, localStream)` initiates a MediaConnection. The answerer listens via `peer.on('call', (call) => call.answer(localStream))`. Both sides emit `stream` event with the remote MediaStream. The caller/callee role is determined by join order: the room creator (peer registered as `roomId`) is the callee; the joiner (peer registered as a random ID) is the caller who calls `peer.call(roomId, stream)`. |
| CONN-04 | User can see connection status (Connecting → Connected → Disconnected) | Three states map to events: `setConnectionState('connecting')` when `peer.on('open')` fires (already done in Phase 1); `setConnectionState('connected')` when `call.on('stream')` fires (remote video arrives = media is flowing); `setConnectionState('disconnected')` when `call.on('close')` fires. The `close` event on remote peer now fires reliably in PeerJS 1.5.x (fixed via auxiliary data channel — Issue #1089 resolved in v1.5.0). |
| UX-02 | User sees a clear "Meeting Ended" screen when a call ends with options to create new or go home | When `call.on('close')` fires, transition RoomPage from `<CallView>` to `<MeetingEnded>` component. The store needs a `callEnded` boolean or an `'ended'` ConnectionState. The ended screen renders two buttons: "New Meeting" (navigates to `/`) and "Return Home" (navigates to `/`). Must also handle tab close: `beforeunload` cleanup already in `usePeer`; the remote side will detect disconnect via `call.on('close')` within a few seconds (ICE timeout). |
| UX-04 | User hears a sound notification when a peer joins or leaves | Play a short synthesized tone using the Web Audio API (no external dependency). Two distinct tones: join (ascending two-tone, e.g. 440Hz → 880Hz) and leave (descending two-tone, e.g. 880Hz → 440Hz). Synthesized via `OscillatorNode` + `GainNode`. AudioContext must be created/resumed after user gesture (browser autoplay policy) — the user's click to join the room satisfies this. |
</phase_requirements>

---

## Summary

Phase 3 bridges the lobby built in Phase 2 into a live two-way video call. The core challenge is getting two browser tabs — one registered as the room creator (Peer ID = `roomId`), one as a joiner (Peer ID = random UUID) — to negotiate a PeerJS `MediaConnection` and display each other's video streams. All the infrastructure is already in place from Phases 1 and 2: PeerJS is initialized, ICE/TURN servers are configured, the local `MediaStream` is acquired, and the `Peer` object is registered on the signaling server.

The primary new work is: (1) the caller/callee role determination pattern (joiner calls room creator), (2) the `useCall` hook that manages `MediaConnection` lifecycle and remote stream, (3) connection state transitions driven by real call events (`stream` → `connected`, `close` → `disconnected`/`ended`), and (4) the `RoomPage` rendering the `<CallView>` or `<MeetingEnded>` components depending on state. The `close` event now fires reliably on the remote peer in PeerJS 1.5.x via an internal auxiliary data channel, so no polling or heartbeat workaround is needed for clean disconnects. Tab-close disconnects surface via ICE timeout on the remote side (a few seconds delay — acceptable).

Sound notifications are implemented as synthesized Web Audio API tones (zero dependencies, zero network requests) rather than file-based audio to keep the bundle lean. Two distinct oscillator tones distinguish peer join from peer leave.

**Primary recommendation:** Create a `useCall` hook (separate from `usePeer`) that takes `peerRef` and `localStream` and manages `MediaConnection` lifecycle, remote stream ref, and call state. The room creator's peer ID is the `roomId` — the joiner calls that ID. Connection state `'connected'` is set on `call.on('stream')`, not on ICE negotiation completion, because stream arrival is the user-visible signal that media is flowing.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PeerJS | 1.5.5 | MediaConnection for video/audio | Already in project. `peer.call()` / `peer.on('call')` / `call.answer()` are the complete calling API. `close` event fires on remote peer since v1.5.0. |
| React | 19.x | Hooks, component lifecycle | `useRef` for MediaConnection + remote stream; `useEffect` for event subscription/cleanup |
| Zustand | 5.x | Call state, ended state, remote stream presence | Already in project; add `callEnded: boolean` and `remoteStream` indicator (not the stream itself — see anti-patterns) |
| Web Audio API | Native browser | Join/leave sound notifications | Zero dependency. `AudioContext` + `OscillatorNode` + `GainNode`. Supported in all target browsers. |
| wouter | 3.9.0 | Navigation on call end | `useLocation` hook for programmatic navigation to `/` on "Return Home" / "New Meeting" |

### What NOT to Add

No new runtime dependencies are needed for Phase 3.

- Do NOT add `use-sound` (v5.0.0, howler.js wrapper) — adds ~10 KB async bundle load; Web Audio API synthesis is smaller and simpler for two-tone notifications.
- Do NOT add `react-use-audio-player` — same reasoning.
- Do NOT add `socket.io-client` — PeerJS handles signaling; no extra signaling layer needed.

---

## Architecture Patterns

### Recommended File Structure for Phase 3

```
src/
├── hooks/
│   ├── usePeer.ts          # Phase 1 — ADD: expose peerRef publicly
│   ├── useMedia.ts         # Phase 2 — unchanged
│   └── useCall.ts          # NEW — MediaConnection lifecycle, remote stream, call state
├── pages/
│   └── RoomPage.tsx        # MODIFIED — render CallView or MeetingEnded based on state
├── components/
│   ├── CallView.tsx         # NEW — remote video (full screen), self-view overlay, controls
│   ├── MeetingEnded.tsx     # NEW — "Meeting Ended" screen with New Meeting / Return Home
│   └── ConnectionStatus.tsx # NEW — "Connecting" / "Connected" / "Disconnected" label/badge
├── lib/
│   └── sounds.ts            # NEW — Web Audio API synthesized tones (join/leave)
└── store/
    └── index.ts             # MODIFIED — add callEnded: boolean, setCallEnded()
```

### Pattern 1: Caller/Callee Role Determination (No Extra Signaling)

**What:** In MeetDrop's architecture, the room creator registers their `Peer` with `peerId = roomId`. The joiner registers with a random UUID. The joiner can therefore call the room creator by calling `peer.call(roomId, localStream)` — no separate signaling channel needed to exchange peer IDs.

**How to detect "am I the creator or joiner":**
- Creator: The peer whose `peerId === roomId` — they receive the call via `peer.on('call', ...)`.
- Joiner: The peer whose `peerId !== roomId` — they initiate the call via `peer.call(roomId, stream)`.
- Since both peers are already initialized in Phase 1/2 with this distinction, the join trigger is: when `peer.on('open')` has fired AND the local peer ID is NOT equal to the `roomId` parameter from the URL, the peer is the joiner.

**When to use:** This is the core signaling pattern for Phase 3. No changes to `usePeer` are required — just read `peerRef.current.id` after `open` fires.

```typescript
// Source: PeerJS docs https://peerjs.com/docs/ + project usePeer.ts
// In useCall hook:
function initCall(peer: Peer, roomId: string, localStream: MediaStream) {
  const isJoiner = peer.id !== roomId

  if (isJoiner) {
    // Joiner calls the room creator (whose peer ID === roomId)
    const call = peer.call(roomId, localStream)
    subscribeToCall(call)
  } else {
    // Creator waits for incoming call
    peer.on('call', (call) => {
      call.answer(localStream)
      subscribeToCall(call)
    })
  }
}
```

### Pattern 2: useCall Hook — MediaConnection Lifecycle

**What:** Manages the PeerJS MediaConnection: initiates or answers, subscribes to events, updates connection state, exposes remote stream ref.
**When to use:** Mount in RoomPage after `usePeer` and `useMedia` are initialized.

```typescript
// src/hooks/useCall.ts
import { useEffect, useRef, useCallback } from 'react'
import type { MediaConnection } from 'peerjs'
import type Peer from 'peerjs'
import { useCallStore } from '../store'
import { playJoinSound, playLeaveSound } from '../lib/sounds'

export function useCall(
  peerRef: React.RefObject<Peer | null>,
  streamRef: React.RefObject<MediaStream | null>,
  roomId: string
) {
  const callRef = useRef<MediaConnection | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const { setConnectionState, setCallEnded } = useCallStore()

  function subscribeToCall(call: MediaConnection) {
    callRef.current = call

    call.on('stream', (remoteStream) => {
      remoteStreamRef.current = remoteStream
      setConnectionState('connected')
      playJoinSound()
    })

    call.on('close', () => {
      remoteStreamRef.current = null
      setConnectionState('disconnected')
      setCallEnded(true)
      playLeaveSound()
    })

    call.on('error', (err) => {
      console.error('Call error:', err)
      setConnectionState('failed')
    })
  }

  useEffect(() => {
    const peer = peerRef.current
    const stream = streamRef.current
    if (!peer || !stream) return

    const isJoiner = peer.id !== roomId

    if (isJoiner) {
      const call = peer.call(roomId, stream)
      subscribeToCall(call)
    } else {
      peer.on('call', (call) => {
        call.answer(stream)
        subscribeToCall(call)
      })
    }

    return () => {
      callRef.current?.close()
      callRef.current = null
      remoteStreamRef.current = null
    }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const hangUp = useCallback(() => {
    callRef.current?.close()
    callRef.current = null
    remoteStreamRef.current = null
    setConnectionState('disconnected')
    setCallEnded(true)
  }, [setConnectionState, setCallEnded])

  return { callRef, remoteStreamRef, hangUp }
}
```

**Critical timing note:** `useCall` must only run after `usePeer` has fired its `open` event and `useMedia` has obtained the `localStream`. In `RoomPage`, check that `streamRef.current !== null` and `peerId !== null` before mounting `useCall` (or conditionally pass the `enabled` flag). The simplest approach: start `useCall` as soon as the component mounts but guard inside with `if (!peer || !stream) return`.

### Pattern 3: Connection State Transitions

**What:** Map PeerJS events to the `ConnectionState` type already in the store.

| State | When Set | Trigger |
|-------|----------|---------|
| `'idle'` | Initial / peer destroyed | `usePeer` cleanup |
| `'connecting'` | Peer registered on signaling server | `peer.on('open')` — already in Phase 1/2 |
| `'connected'` | Remote stream arrived (media flowing) | `call.on('stream')` |
| `'disconnected'` | Call closed normally or by remote | `call.on('close')` |
| `'failed'` | ICE failure, peer error | `call.on('error')` / `peer.on('error')` |

**Note:** Do NOT set `'connected'` on ICE `connected` state — ICE `connected` fires before media flows and produces a false "connected" label. Use `call.on('stream')` instead, which fires only when the remote MediaStream actually arrives.

### Pattern 4: RoomPage State Machine

**What:** `RoomPage` renders one of three views based on `connectionState` and `callEnded`.

```typescript
// RoomPage.tsx — simplified conditional render
export function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const { peerRef } = usePeer(id ?? '')
  const { streamRef, toggleMic, toggleCamera } = useMedia()
  const { connectionState, callEnded } = useCallStore()
  const { callRef, remoteStreamRef, hangUp } = useCall(peerRef, streamRef, id ?? '')

  if (callEnded) {
    return <MeetingEnded />
  }

  return (
    <div>
      <ConnectionStatus state={connectionState} />
      {connectionState === 'connected' ? (
        <CallView
          remoteStreamRef={remoteStreamRef}
          localStreamRef={streamRef}
          onHangUp={hangUp}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
        />
      ) : (
        /* Lobby view — already built in Phase 2 */
        <LobbyView ... />
      )}
    </div>
  )
}
```

### Pattern 5: Remote Video Display

**What:** Same `VideoPreview` component as self-view, but without `muted` and without mirror transform. Must NOT be muted — remote audio must play through.

```typescript
// CallView.tsx — remote video
<video
  ref={remoteVideoRef}
  autoPlay
  playsInline
  // NO muted — remote audio must play
  // NO -scale-x-100 — remote video is not mirrored
  className="w-full h-full object-cover"
/>

// Assign stream imperatively (same pattern as VideoPreview)
useEffect(() => {
  if (remoteVideoRef.current && remoteStreamRef.current) {
    remoteVideoRef.current.srcObject = remoteStreamRef.current
  }
}, [remoteStreamRef.current])
```

**Key detail:** `muted` on the remote video silences the remote peer's audio. Never add `muted` to the remote video element.

### Pattern 6: MeetingEnded Screen (UX-02)

**What:** Shown when `callEnded === true`. Offers two actions.

```typescript
// MeetingEnded.tsx
import { useLocation } from 'wouter'
import { generateRoomId } from '../lib/room'

export function MeetingEnded() {
  const [, setLocation] = useLocation()

  function handleNewMeeting() {
    const id = generateRoomId()
    setLocation(`/room/${id}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-2xl font-semibold">Meeting Ended</h1>
      <p className="text-muted-foreground">The call has ended.</p>
      <div className="flex gap-3">
        <Button onClick={handleNewMeeting}>New Meeting</Button>
        <Button variant="outline" onClick={() => setLocation('/')}>Return Home</Button>
      </div>
    </div>
  )
}
```

**Reset requirement:** Before navigating to a new room from `MeetingEnded`, reset the Zustand store (`useCallStore.getState().reset()`) to clear `callEnded` and `connectionState`. Otherwise the new room will immediately show `MeetingEnded`.

### Pattern 7: Sound Notifications (UX-04) — Web Audio API Synthesis

**What:** Synthesize two short distinct tones using native browser Web Audio API. No audio files, no external libraries.
**When to use:** Play join tone on `call.on('stream')`; play leave tone on `call.on('close')`.

```typescript
// src/lib/sounds.ts
// Source: MDN Web Audio API https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

// Reuse a single AudioContext — creating many is wasteful and browsers limit them
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  // Resume if suspended (autoplay policy — context was created before user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(frequency: number, startTime: number, duration: number, ctx: AudioContext) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startTime)

  gainNode.gain.setValueAtTime(0.15, startTime)          // quiet — notification, not alarm
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

export function playJoinSound() {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  playTone(440, now, 0.15)        // A4 — first note
  playTone(880, now + 0.15, 0.2)  // A5 — second note (ascending = join)
}

export function playLeaveSound() {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  playTone(880, now, 0.15)        // A5 — first note
  playTone(440, now + 0.15, 0.2)  // A4 — second note (descending = leave)
}
```

**Autoplay policy:** The browser suspends `AudioContext` if created before a user gesture. In MeetDrop, the user's click to join the room (navigating to `RoomPage`) is a user gesture. Create the `AudioContext` lazily on first call to `getAudioContext()` — by the time `playJoinSound()` fires, the context will be in `running` state because a click event already happened. The `resume()` guard handles edge cases.

### Pattern 8: ConnectionStatus Component (CONN-04)

**What:** Visible label that updates as ICE/call state changes.

```typescript
// components/ConnectionStatus.tsx
const STATE_LABELS: Record<ConnectionState, string> = {
  idle: 'Waiting',
  connecting: 'Connecting',
  connected: 'Connected',
  disconnected: 'Disconnected',
  failed: 'Connection Failed',
}

const STATE_VARIANTS: Record<ConnectionState, 'default' | 'secondary' | 'destructive'> = {
  idle: 'secondary',
  connecting: 'secondary',
  connected: 'default',      // green-ish
  disconnected: 'destructive',
  failed: 'destructive',
}

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  return (
    <Badge variant={STATE_VARIANTS[state]}>
      {STATE_LABELS[state]}
    </Badge>
  )
}
```

### Anti-Patterns to Avoid

- **Remote stream in Zustand state:** `MediaStream` is a mutable browser object. Storing it in Zustand causes serialization issues and re-render loops when tracks mutate. Store it in `useRef` inside `useCall`; pass `remoteStreamRef` to components.
- **Setting `connectionState = 'connected'` on ICE connected event:** ICE `connected` fires during DTLS handshake, before media frames arrive. Remote video is blank at that point. Use `call.on('stream')` which fires only when remote media actually arrives.
- **`muted` on the remote video:** Silences remote audio. The remote video must NOT be muted. Only self-view needs `muted` to prevent echo feedback.
- **Calling `peer.call()` before `peer.on('open')` fires:** The PeerJS Peer object will queue the call but the remote peer has not yet registered. Always gate the call initiation on `peerId !== null` (which is set in store after `open` fires).
- **Creating multiple `AudioContext` instances:** Browsers impose limits on simultaneous audio contexts. Create one globally and reuse it.
- **Not resetting store on new room:** If `callEnded: true` persists in the Zustand store when navigating to a new room, the new room immediately shows `MeetingEnded`. Call `reset()` before or immediately after navigation.
- **Using `willCloseOnRemote` event as the primary disconnect signal:** This is a beta/experimental event in PeerJS. Use `call.on('close')` which is stable in 1.5.x.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SDP offer/answer exchange | Custom WebSocket signaling for SDP | PeerJS `peer.call()` / `call.answer()` | PeerJS handles all SDP and ICE candidate exchange over the peerjs-server signaling channel. Rolling your own requires implementing JSEP, offer/answer model, ICE trickling — hundreds of lines. |
| Remote disconnect detection | Polling with `setInterval` + `getStats()` | `call.on('close')` (PeerJS 1.5.x) | Close event now fires on remote peer via auxiliary data channel. No polling needed for clean disconnects. |
| Audio notification files | Static audio file hosting + fetch | Web Audio API `OscillatorNode` synthesis | Synthesized tones are ~30 lines of code, 0 bytes of asset bandwidth, no loading delay. |
| ICE candidate gathering | Manual `addIceCandidate()` | PeerJS internals | PeerJS wraps the full ICE negotiation loop. Never touch `RTCPeerConnection` directly in this codebase. |
| Call state persistence across tabs | sessionStorage or BroadcastChannel | In-memory `useRef` + Zustand | Calls are ephemeral by design (PRIV-01). Store nothing outside memory. |

**Key insight:** PeerJS encapsulates the full WebRTC negotiation. The "Core Call" feature is roughly 100 lines of application code on top of `peer.call()` and three event handlers. The complexity is in the event lifecycle and state machine, not in the WebRTC layer.

---

## Common Pitfalls

### Pitfall 1: Race Condition — Joiner Calls Before Creator's `peer.on('call')` Is Registered

**What goes wrong:** The joiner opens the tab, `peer.on('open')` fires almost immediately (Peer is registered), and `peer.call(roomId, stream)` fires — but the creator's `peer.on('call', ...)` handler hasn't been registered yet (the `useEffect` that sets up `peer.on('call')` runs after render). The call event fires on the creator's side before the listener is attached and is silently lost.

**Why it happens:** `useEffect` runs after render. If `usePeer` and `useCall` are in the same component and `useCall`'s `useEffect` runs a render cycle late, the PeerJS `call` event can fire in between.

**How to avoid:** Register `peer.on('call', ...)` inside the same `useEffect` that initializes the Peer, or ensure `useCall`'s effect runs synchronously with `usePeer`'s effect on the same render cycle. In practice: `useCall` registers `peer.on('call', ...)` in its `useEffect`. Since PeerJS queues events until the next tick, and React effects run synchronously after render, the handler is registered before any incoming call event fires — but validate this in testing by opening both tabs in rapid succession.

**Warning signs:** The joiner sees "Connecting" indefinitely. The creator's browser never shows a `call` event in logs. Remote stream never arrives on either side.

### Pitfall 2: Joiner Initiates Call Before Local Stream Is Ready

**What goes wrong:** `usePeer` fires `open` before `useMedia` resolves `getUserMedia`. `useCall` initiates `peer.call(roomId, null)` — PeerJS throws because `localStream` is null.

**Why it happens:** `getUserMedia` is async and may take 1-3 seconds on first grant. `peer.on('open')` fires as soon as the WebSocket to peerjs-server opens, which is typically faster.

**How to avoid:** Gate the call initiation on both `peerId !== null` AND `streamRef.current !== null`. In `useCall`'s `useEffect`, guard: `if (!peer || !stream) return`. The effect dependency array should NOT include `peerId` or `stream` (to avoid re-firing) — instead, use a separate state boolean `isReady` that is `true` only when both are available.

**Warning signs:** `TypeError: stream is null` or `InvalidStateError` from PeerJS. Remote peer receives a call but no stream, so remote video is blank.

### Pitfall 3: `call.on('close')` Fires Immediately on the Joiner Side

**What goes wrong:** The joiner calls `peer.call(roomId, stream)` but the room creator's peer has already been destroyed (e.g., creator closed the tab). PeerJS emits `close` almost immediately on the joiner side. The joiner sees "Meeting Ended" before ever seeing remote video.

**Why it happens:** Calling a peer ID that is not registered on the signaling server results in an immediate connection failure.

**How to avoid:** Differentiate between "call ended after being connected" and "call failed to connect." Only show `<MeetingEnded>` if `remoteStreamRef.current` was ever set (call was successfully established). If `call.on('close')` fires before `call.on('stream')` ever fires, show an error state instead ("Could not reach the other participant").

**Warning signs:** User sees "Meeting Ended" immediately upon entering a room, without ever seeing remote video.

### Pitfall 4: Remote Audio Is Silenced (`muted` on Remote Video)

**What goes wrong:** Developer adds `muted` to the remote video element to suppress browser autoplay warnings. Remote video displays but no audio is heard from the remote peer.

**Why it happens:** `muted` silences all audio from the element. The self-view requires `muted` to prevent echo; the remote video does not and must NOT be muted.

**How to avoid:** Only add `muted` to the self-view `<video>` element. Never add `muted` to the remote peer's `<video>` element. Document this distinction explicitly in the `CallView` component.

**Warning signs:** Remote video plays but no audio heard. DevTools Application → Media tab shows the remote video element has `muted: true`.

### Pitfall 5: Store Not Reset on Navigation to New Room

**What goes wrong:** User ends a call, sees `<MeetingEnded>`, clicks "New Meeting". The app navigates to a new room URL. But `callEnded: true` and `connectionState: 'disconnected'` persist in Zustand store. The new room immediately shows `<MeetingEnded>` without ever starting a call.

**Why it happens:** Zustand state is in-memory and persists for the tab lifetime. Navigation does not reset the store.

**How to avoid:** Call `useCallStore.getState().reset()` (which clears `callEnded`, `connectionState`, `peerId`) when navigating from `MeetingEnded` to a new room. Alternatively, reset in `RoomPage`'s `useEffect` cleanup for the `id` dependency.

**Warning signs:** New room URL renders `<MeetingEnded>` before any call is attempted.

### Pitfall 6: Tab Close Leaves Remote Peer in "Connected" State Indefinitely

**What goes wrong:** Creator closes the tab. Joiner's call stays in `connectionState: 'connected'` and shows frozen video indefinitely. The `call.on('close')` event does not fire promptly on network-level disconnects.

**Why it happens:** The auxiliary data channel used by PeerJS 1.5.x to propagate `close` events requires an active connection. If the tab is force-closed (without the JavaScript `beforeunload` cleanup running), the remote side relies on ICE keepalive timeouts to detect the disconnect — which takes 5-30 seconds depending on browser and network.

**How to avoid:** The `beforeunload` handler in `usePeer` already calls `peer.destroy()`, which sends a close signal via the auxiliary data channel before the tab closes. This handles the clean tab-close case in under a second. For the force-kill case (crash, OS kill), rely on ICE timeout — this is a fundamental WebRTC limitation and requires no workaround for Phase 3. Document the 5-30 second delay as expected behavior.

**Warning signs:** Remote peer sees frozen video after tab close. This is expected for force kills. If it happens after clean navigation away, check that `peer.destroy()` is called in `beforeunload`.

---

## Code Examples

Verified patterns from official sources and established project conventions:

### Complete Call Setup (Caller Side)

```typescript
// Source: PeerJS docs https://peerjs.com/docs/
// Joiner path: peer ID !== roomId
const call = peer.call(roomId, localStream)

call.on('stream', (remoteStream) => {
  remoteVideoRef.current.srcObject = remoteStream
  setConnectionState('connected')
  playJoinSound()
})

call.on('close', () => {
  remoteVideoRef.current.srcObject = null
  setConnectionState('disconnected')
  setCallEnded(true)
  playLeaveSound()
})
```

### Complete Call Setup (Answerer Side)

```typescript
// Source: PeerJS docs https://peerjs.com/docs/
// Creator path: peer ID === roomId
peer.on('call', (call) => {
  call.answer(localStream)

  call.on('stream', (remoteStream) => {
    remoteVideoRef.current.srcObject = remoteStream
    setConnectionState('connected')
    playJoinSound()
  })

  call.on('close', () => {
    remoteVideoRef.current.srcObject = null
    setConnectionState('disconnected')
    setCallEnded(true)
    playLeaveSound()
  })
})
```

### Remote Video Element (Required Attributes)

```tsx
// Must NOT be muted — remote audio must play
// Must have autoPlay + playsInline for cross-browser compatibility
<video
  ref={remoteVideoRef}
  autoPlay
  playsInline
  className="w-full h-full object-cover"
/>
```

### Zustand Store Extension

```typescript
// src/store/index.ts — add to existing CallStore
interface CallStore {
  // ... existing fields ...
  callEnded: boolean
  setCallEnded: (ended: boolean) => void
  // update reset() to include callEnded: false
}

// In create():
callEnded: false,
setCallEnded: (callEnded) => set({ callEnded }),
// reset: () => set({ ..., callEnded: false })
```

### Web Audio API Tones (Full Implementation)

```typescript
// src/lib/sounds.ts
// Source: MDN Web Audio API + MDN OscillatorNode
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

function tone(freq: number, start: number, duration: number, ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.12, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.start(start)
  osc.stop(start + duration)
}

export function playJoinSound(): void {
  const ctx = getCtx()
  const t = ctx.currentTime
  tone(523, t, 0.12)       // C5
  tone(784, t + 0.13, 0.18) // G5 — ascending = join
}

export function playLeaveSound(): void {
  const ctx = getCtx()
  const t = ctx.currentTime
  tone(784, t, 0.12)       // G5
  tone(523, t + 0.13, 0.18) // C5 — descending = leave
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `MediaConnection.close()` silent on remote | `close` fires on remote peer via aux data channel | PeerJS 1.5.0 (2023) | No workarounds needed; `call.on('close')` is reliable |
| Audio files (mp3/wav) for notifications | Web Audio API oscillator synthesis | Browser support matured ~2018 | Zero asset bytes, no load delay, no external dependency |
| `connectionState = 'connected'` on ICE connected | `connectionState = 'connected'` on `call.on('stream')` | Best practice — always | ICE connected ≠ media flowing; stream event is the correct signal |
| Storing remote stream in React state | Storing remote stream in `useRef`, assign to `video.srcObject` | Always the correct pattern | `MediaStream` in state causes re-render loops and serialization issues |

**Deprecated/outdated:**
- `simple-peer`: Archived by feross. PeerJS is the maintained alternative.
- Polling with `getStats()` to detect remote disconnect: Unnecessary in PeerJS 1.5.x — `close` event is reliable for clean disconnects.
- `URL.createObjectURL(stream)` for remote video: Deprecated. Always use `srcObject`.

---

## Open Questions

1. **Joiner Calls Before Answerer Registers `peer.on('call')` — Timing Validation**
   - What we know: React effects run synchronously after render. PeerJS queues events internally. In practice the handler should be registered before the call event fires.
   - What's unclear: Whether the event queuing is guaranteed across all browsers and PeerJS versions, particularly when tabs open simultaneously.
   - Recommendation: Test by opening both tabs within 1 second of each other. If the race is real in testing, the mitigation is to move `peer.on('call', ...)` registration into the `usePeer` effect rather than `useCall` — register it immediately when the Peer is created.

2. **Tab-Close Disconnect Detection Latency**
   - What we know: ICE keepalive timeout for detecting dead connections is browser/network dependent (5-30 seconds). The `beforeunload` handler calling `peer.destroy()` reduces this to near-instant for clean closes.
   - What's unclear: Mobile Safari's handling of `beforeunload` is historically unreliable. Mobile users who background-switch away from MeetDrop may not trigger `beforeunload`.
   - Recommendation: Accept the ICE timeout latency for Phase 3. Document as known behavior. Mobile `beforeunload` issues are a Phase 5 hardening concern.

3. **`MeetingEnded` State After Network Drop vs. Call End**
   - What we know: `call.on('close')` fires for both clean call ends and network disconnects.
   - What's unclear: Whether a brief network hiccup (ICE `disconnected` → ICE `connected` recovery) triggers a false `close` event.
   - Recommendation: For Phase 3, treat all `close` events as terminal — show `MeetingEnded`. Add ICE disconnect recovery in Phase 5 if needed. PeerJS 1.5.x should not emit `close` on transient ICE disconnects (it uses an aux data channel, not ICE state, to signal intentional closes).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vite.config.ts` — `test` section with `environment: 'jsdom'`, `globals: true` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AV-01 | `useCall` calls `peer.call(roomId, stream)` when `peer.id !== roomId` (joiner path) | unit | `npm test -- --run src/hooks/useCall.test.ts` | Wave 0 |
| AV-01 | `useCall` calls `call.answer(stream)` when `peer.on('call')` fires (creator path) | unit | `npm test -- --run src/hooks/useCall.test.ts` | Wave 0 |
| AV-01 | `call.on('stream')` sets `connectionState = 'connected'` and assigns `remoteStreamRef.current` | unit | `npm test -- --run src/hooks/useCall.test.ts` | Wave 0 |
| CONN-04 | `ConnectionStatus` renders "Connecting" badge for state `'connecting'` | unit | `npm test -- --run src/components/ConnectionStatus.test.tsx` | Wave 0 |
| CONN-04 | `ConnectionStatus` renders "Connected" badge for state `'connected'` | unit | `npm test -- --run src/components/ConnectionStatus.test.tsx` | Wave 0 |
| CONN-04 | `ConnectionStatus` renders "Disconnected" badge for state `'disconnected'` | unit | `npm test -- --run src/components/ConnectionStatus.test.tsx` | Wave 0 |
| UX-02 | `MeetingEnded` renders "Meeting Ended" heading, "New Meeting" button, and "Return Home" button | unit | `npm test -- --run src/components/MeetingEnded.test.tsx` | Wave 0 |
| UX-02 | `MeetingEnded` "Return Home" navigates to `/` | unit | `npm test -- --run src/components/MeetingEnded.test.tsx` | Wave 0 |
| UX-02 | `RoomPage` renders `MeetingEnded` when `callEnded === true` | smoke | `npm test -- --run src/pages/RoomPage.test.tsx` | Wave 0 |
| UX-04 | `playJoinSound()` creates/resumes AudioContext and starts two oscillators | unit | `npm test -- --run src/lib/sounds.test.ts` | Wave 0 |
| UX-04 | `playLeaveSound()` creates/resumes AudioContext and starts two oscillators | unit | `npm test -- --run src/lib/sounds.test.ts` | Wave 0 |
| AV-01 | Two-browser end-to-end: remote video appears within 15 seconds of second tab joining | e2e / manual | Manual: open two tabs on same room URL, verify video within 15s | manual-only |
| UX-02 | Closing one tab causes other to show "Meeting Ended" screen | manual | Manual: open two tabs, close one, observe other | manual-only |
| UX-04 | Join and leave sounds play audibly at appropriate moments | manual | Manual: listen during test session | manual-only |

**Manual-only justification:** End-to-end WebRTC behavior (actual ICE negotiation, media flow, tab-close events) cannot be simulated in Vitest/jsdom. These require two real browser tabs.

### Vitest Mock Strategy for PeerJS

```typescript
// Wave 0 test setup — mock PeerJS in jsdom environment
// The real peerjs module requires WebRTC APIs not available in jsdom

vi.mock('peerjs', () => {
  const mockCall = {
    on: vi.fn(),
    answer: vi.fn(),
    close: vi.fn(),
  }
  const MockPeer = vi.fn().mockImplementation(() => ({
    id: 'test-peer-id',
    on: vi.fn(),
    call: vi.fn().mockReturnValue(mockCall),
    destroy: vi.fn(),
    connect: vi.fn(),
  }))
  return { default: MockPeer }
})
```

```typescript
// Mock AudioContext for sounds.test.ts
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  type: 'sine',
  frequency: { setValueAtTime: vi.fn() },
}
const mockGain = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
}
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGain),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
}))
```

### Sampling Rate

- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run --coverage`
- **Phase gate:** Full suite green + manual two-browser test before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/useCall.test.ts` — covers AV-01 caller path, AV-01 answerer path, stream event, close event
- [ ] `src/components/ConnectionStatus.test.tsx` — covers CONN-04 badge label for all states
- [ ] `src/components/MeetingEnded.test.tsx` — covers UX-02 render, navigation
- [ ] `src/pages/RoomPage.test.tsx` — covers UX-02 conditional render of MeetingEnded
- [ ] `src/lib/sounds.test.ts` — covers UX-04 AudioContext creation, oscillator creation

---

## Sources

### Primary (HIGH confidence)

- [PeerJS Getting Started](https://peerjs.com/docs/) — `peer.call()`, `call.answer()`, `peer.on('call')`, `call.on('stream')` API
- [PeerJS Issue #1089 — MediaConnection.close() fix](https://github.com/peers/peerjs/issues/1089) — confirmed fixed in PeerJS 1.5.0 via auxiliary data channel; `close` event fires reliably on remote peer
- [PeerJS jsDocs.io package reference](https://www.jsdocs.io/package/peerjs) — MediaConnection methods: `answer()`, `close()`, `addStream()`; Peer events: `open`, `call`, `close`, `disconnected`, `error`
- [MDN: Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — AudioContext autoplay policy, suspended state, resume pattern
- [MDN: OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode) — `type`, `frequency`, `start()`, `stop()` API
- [MDN: RTCPeerConnection.iceConnectionState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState) — ICE state values: new, checking, connected, completed, failed, disconnected, closed

### Secondary (MEDIUM confidence)

- [LogRocket: Getting Started with PeerJS](https://blog.logrocket.com/getting-started-peerjs/) — caller/callee lifecycle pattern, `call.on('close')` usage confirmed with React examples
- [PeerJS commit 0836356](https://github.com/peers/peerjs/commit/0836356d18c91449f4cbb23e4d4660a4351d7f56) — fix(MediaConnection): close event fired on remote peer; resolved issues #636, #1089, #1032, #832, #780, #653
- [PeerJS Issue #883 — iceConnectionState disconnected](https://github.com/peers/peerjs/issues/883) — ICE state change behavior, heartbeat discussion; conclusion: not needed with PeerJS 1.5.x close event fix
- [use-sound npm](https://www.npmjs.com/package/use-sound) — version 5.0.0, peer dep `react >= 16.8`, howler.js wrapper; rejected in favor of native Web Audio API for this phase
- [howler.js npm](https://www.npmjs.com/package/howler) — version 2.2.4; not needed for synthesized tones

### Tertiary (LOW confidence, flag for validation)

- [Toptal: Taming WebRTC with PeerJS](https://www.toptal.com/webrtc/taming-webrtc-with-peerjs) — general PeerJS architecture patterns; confirms peer ID = room ID as a valid signaling pattern
- [DEV Community: Video Chatting with PeerJS](https://dev.to/arjhun777/video-chatting-and-screen-sharing-with-react-node-webrtc-peerjs-18fg) — join-order caller/callee determination; single community source, consistent with PeerJS docs

---

## Metadata

**Confidence breakdown:**
- Standard stack (PeerJS calling API): HIGH — confirmed via official docs and jsDocs.io type reference
- `close` event reliability in 1.5.x: HIGH — confirmed via GitHub issue #1089 and commit 0836356 citing v1.5.0
- Caller/callee role pattern (joiner calls roomId): HIGH — follows directly from PeerJS peer ID architecture; confirmed in multiple sources
- Connection state transitions: HIGH — based on official event semantics (`stream` = media flowing)
- Web Audio API synthesis: HIGH — MDN official docs, native browser API
- Race condition timing (handler registration before event): MEDIUM — logical from React/PeerJS behavior but not benchmarked across all browsers
- Tab-close detection latency (mobile): MEDIUM — known WebRTC limitation, acknowledged in multiple sources

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (90 days — PeerJS 1.5.x is stable; Web Audio API is stable)
