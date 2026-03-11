# Phase 2: Media + Lobby - Research

**Researched:** 2026-03-11
**Domain:** getUserMedia / MediaStream lifecycle, lobby UI, Clipboard API, responsive Tailwind layout
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONN-01 | User can create a meeting room with a unique readable ID (`meet-xxxxxx`) | `generateRoomId()` + `nanoid customAlphabet` already implemented in `src/lib/room.ts`. Phase 2 surfaces this in the lobby UI: "New Meeting" button triggers `generateRoomId()`, then navigates to `#/room/<id>`. |
| CONN-02 | User can join a meeting via Room ID or full link | Two join paths: (1) user opens a `#/room/<id>` hash URL directly — `useParams` extracts the ID from the hash segment and renders the lobby pre-loaded with that room; (2) manual text input on `HomePage` lets the user type a Room ID and submit. wouter hash routing handles both. |
| CONN-03 | User can copy the meeting link to clipboard with one click | `navigator.clipboard.writeText(window.location.href)` inside a button `onClick` handler. Requires HTTPS (satisfied on GitHub Pages, localhost). Falls back to `document.execCommand('copy')` only if Clipboard API is unavailable. Clipboard API reached Baseline Newly Available in March 2025. |
| AV-02 | User can toggle microphone on/off during a call | `stream.getAudioTracks()[0].enabled = !enabled`. Using `enabled` (not `stop()`) preserves the hardware permission and allows toggling back. Store `isMicOn: boolean` in Zustand. |
| AV-03 | User can toggle camera on/off during a call | Same pattern as AV-02: `stream.getVideoTracks()[0].enabled = !enabled`. Store `isCameraOn: boolean` in Zustand. Note: `enabled = false` sends black frames but retains the permission grant. Camera indicator light behavior varies by browser/OS — this is expected. |
| AV-04 | User can preview camera and mic in a lobby screen before joining | `useMedia` hook calls `navigator.mediaDevices.getUserMedia({ video: true, audio: true })` on mount, assigns stream to a `<video>` element via `videoRef.current.srcObject = stream`. Must be `muted` + `autoPlay` + `playsInline` to avoid echo and iOS restrictions. |
| AV-05 | User can see their own video as a small picture-in-picture overlay | A `<video>` element with Tailwind classes `absolute bottom-4 right-4 w-32 md:w-40 aspect-video rounded-lg -scale-x-100` renders the self-view mirrored in a PiP corner position. `-scale-x-100` is the Tailwind v4 class for `scaleX(-1)`. |
| UX-01 | App layout is responsive and works on desktop and mobile browsers | Mobile-first Tailwind layout. Single-column stack on 375px, two-column side-by-side on `md:` (768px+). `w-full max-w-screen-sm mx-auto` prevents overflow. No horizontal scroll: avoid fixed widths wider than viewport. |
</phase_requirements>

---

## Summary

Phase 2 builds the pre-call experience: a lobby screen where the user can see their own camera preview, toggle mic/camera, create or join a room, and copy the meeting link. No PeerJS `MediaConnection` is established in this phase — the `usePeer` hook from Phase 1 is already initializing and registering the Peer ID on the signaling server, but actual peer-to-peer calling happens in Phase 3. Phase 2 only adds `getUserMedia`, the lobby UI, and clipboard functionality on top of the working foundation.

The central technical challenge is `getUserMedia` lifecycle management. The stream must be acquired on lobby mount, kept alive while the user adjusts settings, and stopped cleanly when the user navigates away (to prevent camera indicator light staying on). All three media toggle patterns (mic, camera, lobby preview) use the same primitive: `MediaStreamTrack.enabled`. The `useMedia` hook owns the stream ref, supplies track references to the Zustand store for toggle actions, and stops all tracks in a `useEffect` cleanup.

Phase 2 also finalizes the two join paths required by CONN-02: direct URL entry (hash URL already routes via `useParams`) and manual Room ID input on the home page. Both paths land the user in the lobby with the correct room ID pre-populated.

**Primary recommendation:** Build a `useMedia` hook that returns `{ streamRef, isCameraOn, isMicOn, toggleCamera, toggleMic, error }`. Use the stream in a `LobbyPage` component (replacing the current stub `RoomPage` for the pre-join state). Keep all stream lifecycle logic in `useMedia`; keep UI toggle state in Zustand. Do not use third-party camera libraries — `getUserMedia` is sufficient.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Component lifecycle | `useEffect` cleanup is the correct pattern for stopping media tracks on unmount |
| TypeScript | 5.7.x | Type safety | `MediaStream`, `MediaStreamTrack`, `HTMLVideoElement` are well-typed in lib.dom.d.ts |
| Tailwind CSS | 4.x | Lobby styling | `-scale-x-100` for mirror, `aspect-video` for 16:9, `absolute` positioning for PiP overlay |
| wouter | 3.9.0 | Hash routing | `useParams` extracts room ID from `#/room/:id` — already proven in Phase 1 |
| Zustand | 5.x | Media toggle state | `isMicOn`, `isCameraOn` in store — only subscribed components re-render on toggle |
| nanoid | 5.x | Room ID generation | Already implemented in `src/lib/room.ts` |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | 2.x / 3.x | `cn()` utility | All conditional class strings on toggle buttons (active/inactive state) |

### What NOT to Add

No new runtime dependencies are needed for Phase 2. Do not add:
- `react-webcam` — wraps `getUserMedia` with no benefit, adds bundle size
- `use-media-devices` / `react-use-user-media` — too small to justify a dependency; `useMedia` hook is 40 lines
- Any camera SDK — overkill for a 1-on-1 app

**Installation:** None required. All dependencies are already in `package.json`.

---

## Architecture Patterns

### Recommended File Structure for Phase 2

```
src/
├── hooks/
│   ├── usePeer.ts          # Phase 1 — unchanged
│   └── useMedia.ts         # NEW — getUserMedia lifecycle, track toggles
├── pages/
│   ├── HomePage.tsx        # MODIFIED — add manual Room ID join input
│   └── RoomPage.tsx        # MODIFIED — add LobbyView before join; split into lobby + call states
├── components/
│   ├── VideoPreview.tsx    # NEW — <video> element with srcObject via useRef
│   ├── MediaControls.tsx   # NEW — mic/camera toggle icon buttons
│   ├── CopyLinkButton.tsx  # NEW — clipboard copy + feedback (CONN-03)
│   └── SelfViewOverlay.tsx # NEW — PiP self-view (AV-05)
├── store/
│   └── index.ts            # MODIFIED — add isMicOn, isCameraOn, setMicOn, setCameraOn
└── types/
    └── index.ts            # MODIFIED — add MediaError type
```

### Pattern 1: useMedia Hook — Stream Lifecycle

**What:** Acquires `getUserMedia` stream on mount, exposes toggle functions, stops all tracks on unmount.
**When to use:** Mount this hook in `RoomPage` (or `LobbyPage`). Do NOT mount in `HomePage`.

```typescript
// src/hooks/useMedia.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { useCallStore } from '../store'

export type MediaError = 'not-allowed' | 'not-found' | 'not-readable' | 'unknown'

export function useMedia() {
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<MediaError | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { isMicOn, isCameraOn, setMicOn, setCameraOn } = useCallStore()

  useEffect(() => {
    let cancelled = false

    async function acquire() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        setIsLoading(false)
      } catch (err) {
        if (cancelled) return
        setIsLoading(false)
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') setError('not-allowed')
          else if (err.name === 'NotFoundError') setError('not-found')
          else if (err.name === 'NotReadableError') setError('not-readable')
          else setError('unknown')
        } else {
          setError('unknown')
        }
      }
    }

    acquire()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const toggleMic = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    const next = !isMicOn
    track.enabled = next
    setMicOn(next)
  }, [isMicOn, setMicOn])

  const toggleCamera = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !isCameraOn
    track.enabled = next
    setCameraOn(next)
  }, [isCameraOn, setCameraOn])

  return { streamRef, error, isLoading, toggleMic, toggleCamera }
}
```

**Key details:**
- `cancelled` flag prevents state updates after unmount (async getUserMedia resolving after navigation away)
- Cleanup calls `track.stop()` (not just `track.enabled = false`) to release hardware on lobby exit
- Toggle functions use `track.enabled` (not `stop()`) so the user can re-enable the track without re-requesting permission

### Pattern 2: VideoPreview Component — srcObject via Ref

**What:** Assigns a `MediaStream` to a `<video>` element's `srcObject` property imperatively. React does not support `srcObject` as a JSX prop.
**When to use:** Any `<video>` element that needs to display a live `MediaStream`.

```typescript
// src/components/VideoPreview.tsx
import { useEffect, useRef } from 'react'

interface VideoPreviewProps {
  stream: MediaStream | null
  mirror?: boolean
  className?: string
}

export function VideoPreview({ stream, mirror = false, className = '' }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`${mirror ? '-scale-x-100' : ''} ${className}`}
    />
  )
}
```

**Key details:**
- `muted` is mandatory — autoplay without mute is blocked by browsers; prevents echo on self-view
- `playsInline` is mandatory on iOS — without it, Safari opens fullscreen player
- `autoPlay` enables playback without a user gesture (stream assignment counts as programmatic, not media)
- `-scale-x-100` is the Tailwind v4 CSS for `scaleX(-1)` mirror transform

### Pattern 3: SelfViewOverlay — PiP Position (AV-05)

**What:** Absolutely positioned self-view video in the corner, mirrored.
**When to use:** On the lobby screen and active call screen.

```typescript
// src/components/SelfViewOverlay.tsx
// Position classes: absolute bottom-4 right-4 w-32 md:w-40 aspect-video
// rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10 z-10
<div className="absolute bottom-4 right-4 w-32 md:w-40 aspect-video
                rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10 z-10">
  <VideoPreview stream={stream} mirror className="w-full h-full object-cover" />
</div>
```

### Pattern 4: Clipboard Copy with Fallback (CONN-03)

**What:** One-click copy of the meeting URL using the Clipboard API.
**When to use:** In the lobby, after the room URL is known.

```typescript
// src/components/CopyLinkButton.tsx
import { useState } from 'react'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for non-HTTPS dev environments only
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleCopy} className="...">
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  )
}
```

**Key details:**
- `navigator.clipboard.writeText` requires HTTPS or `localhost` — GitHub Pages satisfies this requirement
- Requires transient user activation (a click event satisfies this)
- `execCommand('copy')` fallback is only for non-HTTPS dev environments; in production (GitHub Pages) it will never be needed

### Pattern 5: Manual Room ID Join (CONN-02)

**What:** Text input on `HomePage` lets user type a Room ID and navigate to it.
**When to use:** Home page, as an alternative to opening a link directly.

```typescript
// In HomePage.tsx — add alongside the Create Meeting button
const [joinId, setJoinId] = useState('')

function handleJoin() {
  const id = joinId.trim()
  if (!id) return
  // Accept both "meet-abc123" and full URLs pasted in
  const match = id.match(/meet-[0-9a-z]{6}/)
  if (match) {
    setLocation(`/room/${match[0]}`)
  }
}

// JSX
<input
  value={joinId}
  onChange={(e) => setJoinId(e.target.value)}
  placeholder="Enter Room ID (meet-xxxxxx)"
  className="..."
/>
<button onClick={handleJoin}>Join</button>
```

### Pattern 6: Zustand Store Extension for Media State

**What:** Add media toggle booleans to the existing `CallStore`.

```typescript
// src/store/index.ts — extend existing store
interface CallStore {
  connectionState: ConnectionState
  peerId: string | null
  isMicOn: boolean        // NEW
  isCameraOn: boolean     // NEW
  setConnectionState: (state: ConnectionState) => void
  setPeerId: (id: string | null) => void
  setMicOn: (on: boolean) => void        // NEW
  setCameraOn: (on: boolean) => void     // NEW
  reset: () => void
}

export const useCallStore = create<CallStore>((set) => ({
  connectionState: 'idle',
  peerId: null,
  isMicOn: true,       // Start with mic on
  isCameraOn: true,    // Start with camera on
  setConnectionState: (connectionState) => set({ connectionState }),
  setPeerId: (peerId) => set({ peerId }),
  setMicOn: (isMicOn) => set({ isMicOn }),
  setCameraOn: (isCameraOn) => set({ isCameraOn }),
  reset: () => set({ connectionState: 'idle', peerId: null, isMicOn: true, isCameraOn: true }),
}))
```

### Pattern 7: Lobby Responsive Layout (UX-01)

**What:** Mobile-first single-column layout expanding to two-column on `md:`.
**When to use:** The lobby screen.

```
Mobile (375px):           Desktop (1280px):
┌──────────────────┐      ┌────────────────┬────────────┐
│  Video Preview   │      │  Video Preview │  Controls  │
│  (full width,    │      │  (aspect-video)│  + Actions │
│  aspect-video)   │      │                │            │
│                  │      │                │            │
│  [Mic] [Cam]     │      │  [Mic] [Cam]   │  [Copy]    │
│  [Join Meeting]  │      │  [Join Meeting]│  [Room ID] │
└──────────────────┘      └────────────────┴────────────┘
```

Tailwind classes for the outer wrapper:
```html
<div class="flex flex-col md:flex-row gap-4 p-4 w-full max-w-4xl mx-auto min-h-screen">
```

Video container:
```html
<div class="relative w-full md:flex-1 aspect-video bg-zinc-900 rounded-xl overflow-hidden">
```

Controls sidebar:
```html
<div class="flex flex-col gap-3 w-full md:w-64">
```

### Anti-Patterns to Avoid

- **Storing `MediaStream` in Zustand:** `MediaStream` is a mutable browser object with event listeners. Putting it in Zustand state causes serialization issues and re-render loops. Store it in `useRef` inside `useMedia`.
- **Calling `getUserMedia` on HomePage:** Asking for camera permission before the user has clicked "Create Meeting" or entered a room is bad UX. Only request media in `RoomPage` (lobby state).
- **Using `track.stop()` for toggle:** Stops the track permanently. Cannot be resumed without a new `getUserMedia` call. Use `track.enabled = false` for muting.
- **Using `track.enabled = false` for cleanup on unmount:** Does NOT release hardware or camera indicator. Must call `track.stop()` on all tracks in the `useEffect` cleanup.
- **Missing `muted` on self-view `<video>`:** Without `muted`, browsers may block autoplay or cause echo feedback.
- **Missing `playsInline` on iOS:** Without this, Safari opens a fullscreen player instead of inline preview.
- **Fixed pixel widths in the lobby:** Use `w-full`, `max-w-*`, and `aspect-video` instead of `width: 640px`. Fixed pixel widths cause horizontal scroll at 375px.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera/mic access | Custom device enumeration | `getUserMedia({ video: true, audio: true })` | Browser API handles device selection, permission UI, OS integration. Custom enumeration is only needed for multi-device switching (Phase 5+). |
| Mirror transform | Custom canvas-based flip | CSS `scaleX(-1)` / Tailwind `-scale-x-100` | Canvas mirroring requires 2D context drawing on every frame — 60x per second CPU cost. CSS transform is hardware-accelerated and zero-cost. |
| Clipboard copy | `document.execCommand('copy')` | `navigator.clipboard.writeText()` | `execCommand` is deprecated. Clipboard API is Baseline 2025 and works in all target browsers on HTTPS. |
| Room ID extraction from pasted URL | Manual URL parsing | `id.match(/meet-[0-9a-z]{6}/)` regex | A single regex handles both "meet-abc123" and full URLs pasted from clipboard. No URL parsing library needed. |

**Key insight:** Phase 2 has zero external dependencies to add. The entire lobby feature is built from browser primitives (`getUserMedia`, `Clipboard API`) plus what's already installed.

---

## Common Pitfalls

### Pitfall 1: getUserMedia Resolves After Component Unmounts

**What goes wrong:** User clicks "Create Meeting" and immediately closes the tab or navigates back before the camera permission dialog resolves. `getUserMedia` promise resolves with a stream, then React tries to call `setState` on an unmounted component. Console warning: "Warning: Can't perform a React state update on an unmounted component."

**Why it happens:** `getUserMedia` is async. The component may unmount before the promise settles.

**How to avoid:** Use a `cancelled` boolean flag in the `useEffect` closure. Check `if (cancelled) return` after `await getUserMedia`. If cancelled, call `stream.getTracks().forEach(t => t.stop())` to release the orphaned stream.

**Warning signs:** Console warning about state updates on unmounted components. Camera indicator stays on after navigating away from the room.

### Pitfall 2: Camera Indicator Stays On After Leaving Lobby

**What goes wrong:** User navigates back to `HomePage`. The camera light stays on. Camera permission is held open.

**Why it happens:** The `useEffect` cleanup function was not called, or it only set `track.enabled = false` instead of calling `track.stop()`.

**How to avoid:** In `useMedia`'s `useEffect` cleanup: `streamRef.current?.getTracks().forEach(t => t.stop())`. This is the definitive way to release the camera. `track.enabled = false` does NOT release hardware.

**Warning signs:** Browser tab camera indicator stays visible after returning to home page.

### Pitfall 3: Autoplay Blocked on iOS (Missing `playsInline`)

**What goes wrong:** Safari on iPhone opens a fullscreen native player instead of showing the inline lobby preview. The lobby layout breaks.

**Why it happens:** iOS Safari requires `playsInline` attribute on `<video>` elements to prevent the system from hijacking playback.

**How to avoid:** Always include `autoPlay playsInline muted` as a trio on any self-view `<video>` element. Missing any one of these breaks on a subset of browsers.

**Warning signs:** Testing in iOS Safari simulator shows full-screen video player appearing over the lobby UI.

### Pitfall 4: Clipboard API Silently Fails on HTTP

**What goes wrong:** The "Copy Link" button silently does nothing in local development served over HTTP.

**Why it happens:** `navigator.clipboard.writeText()` throws `NotAllowedError` on non-secure contexts. `navigator.clipboard` is `undefined` on HTTP.

**How to avoid:** Vite dev server serves on `http://localhost` — `localhost` IS a secure context so Clipboard API works. If you manually test via an IP address (e.g., `http://192.168.x.x:5173`), the API will fail. Test clipboard on localhost only.

**Warning signs:** Copy button does nothing with no console error. Check `window.isSecureContext` — should be `true` on localhost.

### Pitfall 5: `srcObject` Is Not a React JSX Prop

**What goes wrong:** Writing `<video srcObject={stream} />` in JSX causes a TypeScript error and the video does not display.

**Why it happens:** React's synthetic event system does not pass `srcObject` through to the DOM element as a property. It is not a standard HTML attribute.

**How to avoid:** Always use `useRef<HTMLVideoElement>` + `useEffect` to assign `videoRef.current.srcObject = stream`. This is the only correct pattern.

**Warning signs:** TypeScript error on the `srcObject` prop. Video element is blank even when stream is active.

### Pitfall 6: `isMicOn` / `isCameraOn` Store State vs. Track State Drift

**What goes wrong:** The Zustand store says `isMicOn: true` but the audio track's `enabled` property is `false`. Toggles behave in reverse.

**Why it happens:** If the stream is re-acquired (e.g., after a permission error + retry), the new tracks default to `enabled: true`. If the Zustand store was not reset, the store booleans are stale.

**How to avoid:** When a new stream is acquired in `useMedia`, reset `isMicOn` and `isCameraOn` to `true` in the store to match the track state. When `useMedia` unmounts, reset these values.

---

## Code Examples

### Complete getUserMedia Constraints for Lobby

```typescript
// Source: MDN MediaDevices.getUserMedia
// Use ideal constraints — requests are preferences, not mandates
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',         // front camera preferred on mobile
  },
  audio: {
    echoCancellation: true,     // browser built-in, no SDK needed
    noiseSuppression: true,     // browser built-in
    autoGainControl: true,      // browser built-in
  },
})
```

### getUserMedia Error Classification

```typescript
// Source: MDN DOMException.name values for getUserMedia
function classifyMediaError(err: unknown): MediaError {
  if (!(err instanceof DOMException)) return 'unknown'
  switch (err.name) {
    case 'NotAllowedError':   return 'not-allowed'   // user denied or HTTP context
    case 'NotFoundError':     return 'not-found'     // no camera/mic found
    case 'NotReadableError':  return 'not-readable'  // hardware/OS failure
    case 'OverconstrainedError': return 'not-found'  // impossible constraints
    default:                  return 'unknown'
  }
}
```

### Track Toggle (Mic / Camera)

```typescript
// Source: MDN MediaStreamTrack.enabled
// Use enabled for toggles — preserves permission grant, allows re-enable
const audioTrack = stream.getAudioTracks()[0]
audioTrack.enabled = false  // muted: sends silence, keeps permission
audioTrack.enabled = true   // unmuted: resumes normal capture

// Use stop() ONLY for permanent termination (component unmount, end call)
stream.getTracks().forEach(track => track.stop())
```

### Tailwind Mirror + PiP Self-View

```html
<!-- Source: Tailwind CSS docs (scale utilities) -->
<!-- -scale-x-100 applies scaleX(-1) — horizontal mirror -->
<div class="absolute bottom-4 right-4 w-32 md:w-40 aspect-video
            rounded-lg overflow-hidden shadow-lg z-10">
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    class="w-full h-full object-cover -scale-x-100"
  />
</div>
```

### Clipboard Copy with User Feedback

```typescript
// Source: MDN Clipboard API (Baseline Newly Available March 2025)
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Only hit on non-secure contexts (IP addresses in dev)
    return false
  }
}
```

### Hash URL Construction for Room Link

```typescript
// The full meeting link for hash routing
// window.location.origin + base + '#/room/' + roomId
function getRoomLink(roomId: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/#/room/${roomId}`
}
// Example: https://user.github.io/meet-drop/#/room/meet-k3n9pq
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `URL.createObjectURL(stream)` for video src | `videoRef.current.srcObject = stream` | ~2018, but still seen in old tutorials | srcObject is the correct modern API; createObjectURL for streams was deprecated |
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | Clipboard API Baseline March 2025 | execCommand is deprecated; Clipboard API is fully supported in all target browsers |
| Requesting media on page load | Request media only when user enters a room | UX evolution | Avoids aggressive permission prompts; browser may auto-deny if permission prompt appears unexpectedly |
| Canvas-based video mirroring | CSS `scaleX(-1)` | CSS transforms always available | Zero CPU cost vs per-frame canvas drawing |

**Deprecated/outdated:**
- `URL.createObjectURL(stream)`: Still seen in old blog posts. Use `srcObject` instead.
- `navigator.getUserMedia()` (without `mediaDevices`): Removed from all modern browsers. Always use `navigator.mediaDevices.getUserMedia()`.
- `document.execCommand('copy')`: Deprecated. Works as a fallback only; primary path must be Clipboard API.

---

## Open Questions

1. **Camera indicator light behavior on camera toggle (AV-03 in lobby)**
   - What we know: Setting `track.enabled = false` sends black frames but browser behavior for the camera indicator light is inconsistent — some browsers turn off the light, some don't. The W3C spec uses permissive "can be" language.
   - What's unclear: Should the Phase 2 camera toggle use `track.enabled = false` (keeps permission, may not extinguish light) or `track.stop()` + re-`getUserMedia` on re-enable (always extinguishes light, but requires permission re-grant)?
   - Recommendation: Use `track.enabled = false` for the lobby preview. The camera light inconsistency is a known platform limitation, not a bug in our code. Phase 3 (active call) will use the same pattern — sending black frames is intentional when camera is "off" during a call. Document this behavior for users. `track.stop()` + re-acquire is a valid alternative but adds async complexity to the toggle path.

2. **RoomPage architecture — lobby state vs. call state**
   - What we know: Phase 2 adds a "lobby" state where the user sees preview but is not yet connected to a peer. Phase 3 adds the active call state (PeerJS MediaConnection). Both states live at `#/room/:id`.
   - What's unclear: Should `RoomPage` conditionally render `<LobbyView>` vs `<CallView>` based on connection state, or should these be separate pages/routes?
   - Recommendation: Use a single `RoomPage` with a `lobbyPhase` boolean in the store (or infer from `connectionState === 'idle' | 'connecting'`). Phase 2 only implements `LobbyView`. Phase 3 adds `CallView`. One route, two views — cleaner than adding a new route.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vite.config.ts` — `test` section with `environment: 'jsdom'`, `globals: true` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONN-01 | `generateRoomId()` returns `meet-xxxxxx` format | unit | `npm test -- --run src/lib/room.test.ts` | Yes (Phase 1) |
| CONN-02 | Navigating to `#/room/meet-abc123` renders room with correct ID | smoke | `npm test -- --run src/App.test.tsx` | Yes (Phase 1) |
| CONN-02 | Manual join input extracts room ID from pasted text/URL | unit | `npm test -- --run src/pages/HomePage.test.tsx` | Wave 0 |
| CONN-03 | `CopyLinkButton` calls `navigator.clipboard.writeText` with correct URL | unit | `npm test -- --run src/components/CopyLinkButton.test.tsx` | Wave 0 |
| AV-02 | `toggleMic()` sets `getAudioTracks()[0].enabled` to false | unit | `npm test -- --run src/hooks/useMedia.test.ts` | Wave 0 |
| AV-03 | `toggleCamera()` sets `getVideoTracks()[0].enabled` to false | unit | `npm test -- --run src/hooks/useMedia.test.ts` | Wave 0 |
| AV-04 | `useMedia` calls `getUserMedia` on mount and stops tracks on unmount | unit | `npm test -- --run src/hooks/useMedia.test.ts` | Wave 0 |
| AV-04 | `VideoPreview` assigns stream to `videoRef.current.srcObject` | unit | `npm test -- --run src/components/VideoPreview.test.tsx` | Wave 0 |
| AV-05 | `SelfViewOverlay` renders video with `-scale-x-100` mirror class | unit | `npm test -- --run src/components/SelfViewOverlay.test.tsx` | Wave 0 |
| UX-01 | Lobby renders without horizontal overflow on 375px viewport | manual | DevTools Device emulation — no horizontal scroll | manual-only |

**Manual-only justification:** UX-01 responsive layout requires visual inspection at specific viewport widths. Vitest/jsdom does not render at actual pixel dimensions. Test with Chrome DevTools device emulation at 375px and 1280px widths.

### Vitest Mock Strategy for getUserMedia

```typescript
// Wave 0 test setup — mock getUserMedia in jsdom
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [
        { kind: 'audio', enabled: true, stop: vi.fn() },
        { kind: 'video', enabled: true, stop: vi.fn() },
      ],
      getAudioTracks: () => [{ enabled: true, stop: vi.fn() }],
      getVideoTracks: () => [{ enabled: true, stop: vi.fn() }],
    }),
  },
})
```

```typescript
// Mock navigator.clipboard
Object.defineProperty(global.navigator, 'clipboard', {
  writable: true,
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
})
```

### Sampling Rate

- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/useMedia.test.ts` — covers AV-02, AV-03, AV-04 (mount/unmount lifecycle, toggle behaviors)
- [ ] `src/components/VideoPreview.test.tsx` — covers AV-04 srcObject assignment via ref
- [ ] `src/components/CopyLinkButton.test.tsx` — covers CONN-03 clipboard call
- [ ] `src/components/SelfViewOverlay.test.tsx` — covers AV-05 mirror class presence
- [ ] `src/pages/HomePage.test.tsx` — covers CONN-02 manual join input parsing

---

## Sources

### Primary (HIGH confidence)

- [MDN: MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — constraints syntax, error types, secure context requirement
- [MDN: MediaStreamTrack.enabled](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/enabled) — `enabled` vs `stop()` semantics, audio silence / video black frame behavior
- [MDN: HTMLMediaElement.srcObject](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject) — correct pattern for assigning MediaStream to video element
- [MDN: Clipboard.writeText()](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — HTTPS requirement, user activation requirement
- [Tailwind CSS: Scale utilities](https://tailwindcss.com/docs/scale) — `-scale-x-100` applies `scaleX(-1)`, verified v4 syntax
- [wouter GitHub README](https://github.com/molefrog/wouter) — `useParams` with hash routing, `useHashLocation` hook pattern

### Secondary (MEDIUM confidence)

- [Clipboard API: Can I Use](https://caniuse.com/mdn-api_clipboard_writetext) — Baseline Newly Available March 2025, full support in Chrome, Edge, Firefox, Safari
- [Agora camera light documentation](https://docs.agora.io/en/help/integration-issues/web_camera_light) — `enabled=false` vs `stop()` camera indicator behavior, confirms platform inconsistency
- [MDN: RTCRtpSender.replaceTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack) — `replaceTrack(null)` vs `removeTrack()` semantics (relevant context for Phase 3)
- [addpipe.com: getUserMedia Getting Started](https://blog.addpipe.com/getusermedia-getting-started/) — Error name cross-browser consistency, OverconstrainedError details

### Tertiary (LOW confidence, flag for validation)

- [addpipe.com: Common getUserMedia Errors](https://blog.addpipe.com/common-getusermedia-errors/) — error classification patterns, single source
- [LogRocket: Responsive camera component](https://blog.logrocket.com/responsive-camera-component-react-hooks/) — hook structure reference, patterns consistent with MDN but from community source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed in Phase 1
- getUserMedia API patterns: HIGH — verified via MDN official docs
- Clipboard API: HIGH — MDN confirmed, Baseline 2025 status confirmed via caniuse
- Tailwind mirror class `-scale-x-100`: HIGH — verified via official Tailwind docs
- wouter useParams with hash routing: HIGH — verified via GitHub README, already proven in Phase 1
- Camera indicator light behavior: MEDIUM — MDN spec is permissive; platform behavior documented by multiple sources but inconsistent
- Responsive layout: MEDIUM — Tailwind breakpoint utilities are authoritative, specific lobby layout is synthesized from principles

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (90 days — stable browser APIs, Tailwind and wouter are stable)
