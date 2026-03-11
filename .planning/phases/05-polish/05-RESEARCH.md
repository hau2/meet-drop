# Phase 5: Polish - Research

**Researched:** 2026-03-11
**Domain:** WebRTC screen sharing, Fullscreen API, CSS pointer events / drag, Tailwind dark/light theme, RTCPeerConnection stats
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AV-06 | User can share their screen, replacing the camera track for the remote peer; camera auto-restores when sharing stops (including OS "Stop Sharing" button) | `getDisplayMedia` + `RTCRtpSender.replaceTrack` pattern; `MediaStreamTrack.onended` for OS stop-button detection |
| AV-07 | User can enter fullscreen mode for the remote video with a single click and exit with Escape or a toggle button | Fullscreen API (`requestFullscreen` / `exitFullscreen` / `fullscreenchange` event) on the video container element |
| AV-08 | User can drag and reposition their self-view overlay to any corner; position persists for the session | CSS `position:absolute` + `pointer-events` / mouse+touch event handlers in React; corner-snapping via clamp math |
| UX-03 | App renders in dark theme by default; user can toggle to light theme; preference persists for the session | Tailwind v4 class-based dark mode; `classList.toggle('dark')` on `<html>`; `sessionStorage` for persistence |
| UX-05 | A network quality badge (Good / Fair / Poor) visible during the call, updates in real time from RTCPeerConnection stats | `RTCPeerConnection.getStats()` polled on interval; `outbound-rtp` / `candidate-pair` packet loss + RTT heuristics |

</phase_requirements>

## Summary

Phase 5 adds five UI/UX enhancements on top of the fully working call established in Phases 3 and 4. Every feature targets existing browser APIs — no new npm dependencies are required. The most technically careful features are screen sharing (track replacement on a live peer connection) and network quality (getStats polling).

Screen sharing uses `navigator.mediaDevices.getDisplayMedia()` to obtain a display track, then `RTCRtpSender.replaceTrack()` to hot-swap that track into the existing peer connection without renegotiation. The hardest edge case is OS-level stop: the browser fires `MediaStreamTrack.onended` on the display track when the user clicks the OS "Stop Sharing" button — the hook must listen for this and restore the camera track automatically.

Dark/light theme is already half-built: `index.css` already defines `.dark` CSS custom properties and `@custom-variant dark (&:is(.dark *))`. The app just needs a `<html class="dark">` default and a toggle that flips the class and persists choice to `sessionStorage`. Network quality polling uses `RTCPeerConnection.getStats()` every 2–3 seconds and derives a three-tier badge from packet-loss ratio and RTT.

**Primary recommendation:** Implement all five features as targeted additions to existing files — `useCall.ts`, `CallView.tsx`, `SelfViewOverlay.tsx`, `store/index.ts`, and `App.tsx` — with no new dependencies.

---

## Standard Stack

### Core (already installed, no additions needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (hooks) | 19.x | Component logic for all new UI | Already installed; hooks are the idiomatic pattern throughout the codebase |
| Tailwind CSS v4 | 4.x | Styling for new badge, theme toggle button | Already installed; all components use it |
| lucide-react | 0.577.x | Icons (Monitor, Maximize2, Sun, Moon) | Already installed; used project-wide for icon set |
| zustand | 5.x | Store additions (isScreenSharing, theme) | Already installed; existing store pattern must be extended |
| Browser Fullscreen API | native | Remote video fullscreen | No package needed |
| `getDisplayMedia` | native | Screen capture | No package needed |
| `RTCPeerConnection.getStats()` | native | Network quality | No package needed |

### No New Dependencies

All five features rely entirely on browser-native APIs and existing packages. Do not add new npm packages.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native drag in SelfViewOverlay | `react-draggable` or `@dnd-kit` | Library adds ~15–30 KB and a dependency; native pointer events are sufficient for corner-snap drag within a bounded container |
| Custom getStats polling | A stats library | No good lightweight library exists; raw polling is 20 lines and fully controllable |
| sessionStorage for theme | localStorage | Requirement says "persists for the session" — sessionStorage exactly matches this (tab-scoped, no cross-session bleed, PRIV-01 compatible) |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── components/
│   ├── CallView.tsx          # Add: fullscreen button, screen-share button, NetworkQualityBadge
│   ├── SelfViewOverlay.tsx   # Add: drag-to-corner behavior
│   ├── NetworkQualityBadge.tsx  # NEW: Good/Fair/Poor badge component
│   └── ThemeToggle.tsx       # NEW: sun/moon toggle, reads/writes sessionStorage
├── hooks/
│   ├── useCall.ts            # Add: useScreenShare helper or inline screen share logic
│   ├── useNetworkQuality.ts  # NEW: getStats polling hook
│   └── useTheme.ts           # NEW: dark/light toggle with sessionStorage
├── store/
│   └── index.ts              # Add: isScreenSharing flag (for MediaControls UI)
└── App.tsx                   # Add: dark class on <html> initialization
```

### Pattern 1: Screen Share Track Replacement

**What:** Hot-swap the video track in the existing peer connection without renegotiation.

**When to use:** When the user initiates screen share while a call is active.

```typescript
// Source: MDN Web Docs — RTCRtpSender.replaceTrack()
async function startScreenShare(callRef: React.RefObject<MediaConnection | null>, streamRef: React.RefObject<MediaStream | null>) {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
  const displayTrack = displayStream.getVideoTracks()[0]

  // Replace track in the peer connection
  const pc = callRef.current?.peerConnection
  const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
  if (sender) {
    await sender.replaceTrack(displayTrack)
  }

  // OS "Stop Sharing" button fires track.onended
  displayTrack.onended = () => {
    restoreCameraTrack(callRef, streamRef)
  }

  return displayTrack
}

async function restoreCameraTrack(callRef: React.RefObject<MediaConnection | null>, streamRef: React.RefObject<MediaStream | null>) {
  const cameraTrack = streamRef.current?.getVideoTracks()[0]
  if (!cameraTrack) return
  const pc = callRef.current?.peerConnection
  const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
  if (sender) {
    await sender.replaceTrack(cameraTrack)
  }
}
```

**Key nuance:** `replaceTrack` does NOT trigger ICE renegotiation. The remote peer's existing video element continues rendering the new track transparently. This is the correct pattern — do NOT call `peer.call()` again.

**Access PeerJS's peerConnection:** `callRef.current?.peerConnection` (the `MediaConnection` object exposes this as a public property).

### Pattern 2: Fullscreen API

**What:** Enter/exit browser fullscreen on the remote video container.

**When to use:** User clicks fullscreen toggle in CallView.

```typescript
// Source: MDN Web Docs — Fullscreen API
const containerRef = useRef<HTMLDivElement>(null)
const [isFullscreen, setIsFullscreen] = useState(false)

useEffect(() => {
  const handler = () => setIsFullscreen(!!document.fullscreenElement)
  document.addEventListener('fullscreenchange', handler)
  return () => document.removeEventListener('fullscreenchange', handler)
}, [])

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await containerRef.current?.requestFullscreen()
  } else {
    await document.exitFullscreen()
  }
}
```

**Note:** Escape key exits fullscreen natively — the browser handles this without custom keydown listeners. The `fullscreenchange` event keeps the button icon in sync.

**Apply `ref` to:** The outer `div` wrapping the remote `<video>`, not the video element itself (so controls remain visible in fullscreen).

### Pattern 3: Drag-to-Corner Self-View

**What:** Pointer event drag that snaps to the nearest corner on release.

**When to use:** User drags the self-view overlay during a call.

```typescript
// Source: MDN Web Docs — Pointer Events API
// Corner-snap approach: on pointerup, compute nearest corner from current position
type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

function snapToCorner(x: number, y: number, containerW: number, containerH: number): Corner {
  const isRight = x > containerW / 2
  const isBottom = y > containerH / 2
  if (isRight && isBottom) return 'bottom-right'
  if (!isRight && isBottom) return 'bottom-left'
  if (isRight && !isBottom) return 'top-right'
  return 'top-left'
}

// Tailwind classes per corner
const cornerClasses: Record<Corner, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
}
```

**Implementation strategy:** Track drag with `onPointerDown` / `onPointerMove` / `onPointerUp` on the overlay `div`. On `pointerup`, compute which corner the center of the overlay is closest to and apply the corresponding Tailwind corner classes. Use `element.setPointerCapture(e.pointerId)` so drag continues outside the element boundary.

**Do NOT:** Attempt pixel-perfect free drag — the requirement says "any corner", not arbitrary pixel position. Corner-snap simplifies implementation dramatically and matches the success criteria exactly.

### Pattern 4: Dark/Light Theme Toggle

**What:** Toggle `dark` class on `<html>` element, persist to sessionStorage.

**When to use:** Theme initialization on app load + toggle button click.

```typescript
// Source: Tailwind CSS v4 docs — class-based dark mode
// index.css already defines .dark {} — @custom-variant dark (&:is(.dark *)) is already set

// Initialization (in App.tsx or useTheme hook)
function initTheme() {
  const saved = sessionStorage.getItem('theme')
  // Default: dark
  if (saved === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    document.documentElement.classList.add('dark')
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark')
  sessionStorage.setItem('theme', isDark ? 'dark' : 'light')
}
```

**Key fact:** The CSS in `index.css` already has both `:root` (light variables) and `.dark` (dark variables) blocks. The project uses `@custom-variant dark (&:is(.dark *))` which means dark mode activates when `class="dark"` is on any ancestor — putting it on `<html>` is the standard approach.

**Where to place ThemeToggle:** In the top-right of the call controls bar or as a floating button accessible from both lobby and call views. Adding it to `App.tsx` render or to `CallView` controls bar are both valid.

**sessionStorage fits PRIV-01:** sessionStorage is tab-scoped and clears on tab close. The requirement says "persists for the session" — this is the exact scope intended, and it satisfies the zero-persistence philosophy.

### Pattern 5: Network Quality Badge via getStats

**What:** Poll `RTCPeerConnection.getStats()` every 2 seconds, compute quality tier from packet loss and RTT.

**When to use:** During active call (when `connectionState === 'connected'`).

```typescript
// Source: MDN Web Docs — RTCPeerConnection.getStats()
type NetworkQuality = 'good' | 'fair' | 'poor'

async function computeQuality(pc: RTCPeerConnection, prevStats: Map<string, RTCStats>): Promise<NetworkQuality> {
  const statsReport = await pc.getStats()
  let packetLoss = 0
  let rtt = 0

  statsReport.forEach((report) => {
    if (report.type === 'outbound-rtp' && report.kind === 'video') {
      const prev = prevStats.get(report.id) as RTCOutboundRtpStreamStats | undefined
      if (prev && prev.packetsSent && report.packetsSent > prev.packetsSent) {
        const sent = report.packetsSent - prev.packetsSent
        const lost = (report.retransmittedPacketsSent ?? 0) - (prev.retransmittedPacketsSent ?? 0)
        packetLoss = lost / sent
      }
    }
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      rtt = (report as RTCIceCandidatePairStats).currentRoundTripTime ?? 0
    }
  })

  if (packetLoss < 0.02 && rtt < 0.15) return 'good'
  if (packetLoss < 0.08 && rtt < 0.4) return 'fair'
  return 'poor'
}
```

**Thresholds (MEDIUM confidence — based on WebRTC best practices):**
- Good: packet loss < 2%, RTT < 150 ms
- Fair: packet loss < 8%, RTT < 400 ms
- Poor: anything worse

**Hook lifecycle:** Start polling when `connectionState === 'connected'`, stop on cleanup. Pass the `peerConnection` from `callRef.current?.peerConnection`.

### Anti-Patterns to Avoid

- **Calling `peer.call()` again for screen share:** This creates a new peer connection and destroys the existing call. Use `sender.replaceTrack()` only.
- **Storing display track in Zustand state:** MediaStream objects in React state cause re-render loops. Use `useRef` (same pattern as `streamRef` in `useMedia`).
- **Polling getStats faster than 2s:** Creates performance overhead; 2–3 second intervals are the community standard.
- **Requesting `audio: true` in getDisplayMedia:** Tab audio capture requires explicit user permission and adds complexity not required by AV-06.
- **Using localStorage for theme:** Violates PRIV-01 spirit (cross-session persistence). Use sessionStorage.
- **Pixel-precise drag:** AV-08 says "any corner" — free-position drag adds complexity with no requirement value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screen share device capture | Custom canvas/DOM capture | `navigator.mediaDevices.getDisplayMedia()` | Browser API handles screen picker UI, permissions, OS integration |
| Fullscreen keyboard handler (Escape) | Custom `keydown` listener for Escape | Native Fullscreen API | Browser handles Escape natively; custom listener conflicts with it |
| Track injection into WebRTC | Destroying and re-creating peer connection | `RTCRtpSender.replaceTrack()` | replaceTrack is zero-renegotiation; re-creating destroys the call |
| Network stats library | npm package for WebRTC stats | Raw `getStats()` polling | No mature lightweight package exists; raw API is straightforward |

**Key insight:** Every problem in this phase has a browser-native solution. Adding npm packages would introduce maintenance burden with no capability gain.

---

## Common Pitfalls

### Pitfall 1: OS "Stop Sharing" Button Not Handled

**What goes wrong:** User clicks the OS-level "Stop sharing" button (outside the app). The display track stops, but camera is never restored. Remote peer sees a frozen/black screen.

**Why it happens:** The app only handles the in-app "Stop sharing" button click, not the `ended` event on the display track.

**How to avoid:** Always attach `displayTrack.onended = () => restoreCameraTrack(...)` immediately after `getDisplayMedia` resolves.

**Warning signs:** Screen sharing works in-app but breaks when OS chrome stop button is used.

### Pitfall 2: SelfViewOverlay Drag Coordinate Space

**What goes wrong:** Drag coordinates are relative to the viewport, but the overlay is positioned absolute within a container. The overlay jumps to wrong position.

**Why it happens:** `e.clientX/Y` is viewport-relative; the container's bounding rect must be subtracted.

**How to avoid:** Use `containerRef.getBoundingClientRect()` and compute relative position. Since the requirement is corner-snap (not free positioning), compute which quadrant of the container the pointer is in and apply the matching corner class.

### Pitfall 3: getStats `outbound-rtp` Fields Are Cumulative

**What goes wrong:** Reading `packetsSent` directly as "packets this interval" gives wrong loss ratios.

**Why it happens:** `getStats()` returns cumulative counters since connection start, not per-interval deltas.

**How to avoid:** Store the previous stats report in a ref, compute delta between polls for all counter fields.

### Pitfall 4: Fullscreen Applied to `<video>` Instead of Container

**What goes wrong:** The controls bar disappears when fullscreen activates because it is outside the `<video>` element.

**Why it happens:** `requestFullscreen()` is called on the video element, not the wrapping div.

**How to avoid:** Apply `ref` to the outer container div that wraps both the remote video and the controls overlay. Call `containerRef.current.requestFullscreen()`.

### Pitfall 5: Theme Class Race at Hydration

**What goes wrong:** The `<html>` element briefly renders without the `dark` class, causing a flash of light theme.

**Why it happens:** `useEffect` runs after first paint; theme init code inside `useEffect` is too late.

**How to avoid:** Initialize theme synchronously in `App.tsx` before render (outside useEffect, or in a script that runs before React mounts — the simplest approach is a `useLayoutEffect` or calling it in the module scope of `main.tsx` before `ReactDOM.createRoot`).

### Pitfall 6: PeerJS `peerConnection` Access

**What goes wrong:** `callRef.current?.peerConnection` is `undefined` because access is attempted before the `stream` event fires.

**Why it happens:** PeerJS may not expose `peerConnection` until ICE negotiation is underway.

**How to avoid:** Access `peerConnection` only inside `useNetworkQuality` which starts polling after `connectionState === 'connected'` — at that point the peer connection is fully established.

---

## Code Examples

### Screen Share Hook Skeleton

```typescript
// Source: MDN getDisplayMedia + replaceTrack pattern
// src/hooks/useScreenShare.ts
import { useRef, useCallback, useState } from 'react'
import type { RefObject } from 'react'
import type { MediaConnection } from 'peerjs'

export function useScreenShare(
  callRef: RefObject<MediaConnection | null>,
  streamRef: RefObject<MediaStream | null>
) {
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const displayTrackRef = useRef<MediaStreamTrack | null>(null)

  const startScreenShare = useCallback(async () => {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    const displayTrack = displayStream.getVideoTracks()[0]
    displayTrackRef.current = displayTrack

    const pc = callRef.current?.peerConnection
    const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
    if (sender) await sender.replaceTrack(displayTrack)

    setIsScreenSharing(true)

    displayTrack.onended = () => stopScreenShare()
  }, [callRef, streamRef])

  const stopScreenShare = useCallback(async () => {
    displayTrackRef.current?.stop()
    displayTrackRef.current = null

    const cameraTrack = streamRef.current?.getVideoTracks()[0]
    const pc = callRef.current?.peerConnection
    const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
    if (sender && cameraTrack) await sender.replaceTrack(cameraTrack)

    setIsScreenSharing(false)
  }, [callRef, streamRef])

  return { isScreenSharing, startScreenShare, stopScreenShare }
}
```

### Network Quality Hook Skeleton

```typescript
// Source: MDN RTCPeerConnection.getStats()
// src/hooks/useNetworkQuality.ts
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { MediaConnection } from 'peerjs'

export type NetworkQuality = 'good' | 'fair' | 'poor' | null

export function useNetworkQuality(
  callRef: RefObject<MediaConnection | null>,
  active: boolean
): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>(null)
  const prevStatsRef = useRef<Map<string, RTCStats>>(new Map())

  useEffect(() => {
    if (!active) return
    const interval = setInterval(async () => {
      const pc = callRef.current?.peerConnection
      if (!pc) return
      const report = await pc.getStats()
      // compute delta packet loss and RTT, derive quality tier
      const prev = prevStatsRef.current
      let loss = 0, rtt = 0
      report.forEach((r) => {
        if (r.type === 'candidate-pair' && (r as RTCIceCandidatePairStats).state === 'succeeded') {
          rtt = (r as RTCIceCandidatePairStats).currentRoundTripTime ?? 0
        }
        if (r.type === 'outbound-rtp' && (r as RTCOutboundRtpStreamStats).kind === 'video') {
          const p = prev.get(r.id) as RTCOutboundRtpStreamStats | undefined
          if (p) {
            const sent = ((r as RTCOutboundRtpStreamStats).packetsSent ?? 0) - (p.packetsSent ?? 0)
            if (sent > 0) {
              // retransmittedPacketsSent is a rough proxy for loss; use nackCount if available
              const nack = ((r as RTCOutboundRtpStreamStats).nackCount ?? 0) - ((p as RTCOutboundRtpStreamStats).nackCount ?? 0)
              loss = nack / sent
            }
          }
        }
      })
      report.forEach((r, id) => prevStatsRef.current.set(id, r))
      if (loss < 0.02 && rtt < 0.15) setQuality('good')
      else if (loss < 0.08 && rtt < 0.4) setQuality('fair')
      else setQuality('poor')
    }, 2000)
    return () => clearInterval(interval)
  }, [active, callRef])

  return quality
}
```

### Corner-Snap Drag for SelfViewOverlay

```typescript
// Approach: replace absolute Tailwind classes; track drag with pointer events
// Key: on pointerup, snap to nearest quadrant corner of the container

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_CLASSES: Record<Corner, string> = {
  tl: 'top-4 left-4',
  tr: 'top-4 right-4',
  bl: 'bottom-4 left-4',
  br: 'bottom-4 right-4',
}

function getCorner(el: HTMLElement, container: HTMLElement): Corner {
  const cr = container.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  const cx = er.left + er.width / 2 - cr.left
  const cy = er.top + er.height / 2 - cr.top
  const isRight = cx > cr.width / 2
  const isBottom = cy > cr.height / 2
  if (isRight && isBottom) return 'br'
  if (!isRight && isBottom) return 'bl'
  if (isRight) return 'tr'
  return 'tl'
}
```

### Theme Initialization

```typescript
// In src/main.tsx — runs before React mounts, eliminates flash
const saved = sessionStorage.getItem('theme')
if (saved === 'light') {
  document.documentElement.classList.remove('dark')
} else {
  document.documentElement.classList.add('dark')
}

// Then ReactDOM.createRoot(...)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Renegotiate peer connection for screen share | `RTCRtpSender.replaceTrack()` | WebRTC 1.0 ~2018 | Zero-disruption track swap; call stays alive |
| `webkitRequestFullscreen` prefix | Standard `requestFullscreen()` | ~2020 (Safari 16.4 in 2023) | All major browsers now support unprefixed API |
| `system` Tailwind dark mode (OS preference) | Class-based dark mode | Tailwind v3+ | App controls theme explicitly, not OS |
| Free-position draggable overlays | Corner-snap (requirement-specific) | N/A | Simpler implementation, meets stated requirement |

**Deprecated/outdated:**
- `webkitGetUserMedia` / `mozGetUserMedia`: Do not use. Standard `getUserMedia` is universal.
- `MediaStream.addTrack()` to inject screen track: Adds a third track instead of replacing; wrong pattern.

---

## Open Questions

1. **`peerConnection` TypeScript types in PeerJS 1.5.x**
   - What we know: `MediaConnection` exposes `peerConnection: RTCPeerConnection` as a public property in PeerJS 1.x.
   - What's unclear: Whether the TypeScript types in PeerJS 1.5.5 correctly type `peerConnection` — may need `(callRef.current as any).peerConnection` if types are wrong.
   - Recommendation: Check PeerJS TypeScript definitions at implementation time; cast if needed.

2. **Safari fullscreen on iOS**
   - What we know: iOS Safari does not support the standard Fullscreen API (`requestFullscreen` is undefined on iOS Safari).
   - What's unclear: The requirement does not specify iOS. AV-07 says "single click" — on iOS this is a native browser behavior for video elements.
   - Recommendation: Detect iOS and skip fullscreen button rendering, or show a "not supported on iOS" state. Check `document.fullscreenEnabled` before rendering the button.

3. **`nackCount` field availability in getStats**
   - What we know: `nackCount` is in the WebRTC spec for `outbound-rtp` stats.
   - What's unclear: Availability varies slightly across Chrome/Firefox/Safari versions.
   - Recommendation: Null-guard all stat field reads; fall back to RTT-only quality if loss data unavailable.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + Testing Library React 16.x |
| Config file | `vite.config.ts` — `test.environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AV-06 | Screen share starts and replaces video sender track | unit | `npx vitest run src/hooks/useScreenShare.test.ts` | Wave 0 |
| AV-06 | `displayTrack.onended` calls stopScreenShare | unit | `npx vitest run src/hooks/useScreenShare.test.ts` | Wave 0 |
| AV-07 | Fullscreen button calls `requestFullscreen` on container | unit | `npx vitest run src/components/CallView.test.tsx` | Wave 0 |
| AV-07 | `fullscreenchange` event syncs button icon state | unit | `npx vitest run src/components/CallView.test.tsx` | Wave 0 |
| AV-08 | SelfViewOverlay renders with corner-snap class on drag end | unit | `npx vitest run src/components/SelfViewOverlay.test.tsx` | Exists (extend) |
| UX-03 | Default theme sets `dark` class on `<html>` | unit | `npx vitest run src/hooks/useTheme.test.ts` | Wave 0 |
| UX-03 | Toggle removes `dark` class and writes to sessionStorage | unit | `npx vitest run src/hooks/useTheme.test.ts` | Wave 0 |
| UX-05 | NetworkQualityBadge renders "Good" / "Fair" / "Poor" text | unit | `npx vitest run src/components/NetworkQualityBadge.test.tsx` | Wave 0 |
| UX-05 | useNetworkQuality returns `null` before active, quality after | unit | `npx vitest run src/hooks/useNetworkQuality.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/useScreenShare.test.ts` — covers AV-06
- [ ] `src/hooks/useNetworkQuality.test.ts` — covers UX-05
- [ ] `src/hooks/useTheme.test.ts` — covers UX-03
- [ ] `src/components/NetworkQualityBadge.test.tsx` — covers UX-05
- [ ] `src/components/CallView.test.tsx` — covers AV-07 fullscreen button behavior

**jsdom mocking notes for Wave 0:**
- `requestFullscreen` is not implemented in jsdom — mock it: `vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockResolvedValue(undefined)`
- `getDisplayMedia` is not in jsdom — mock on `navigator.mediaDevices`
- `RTCPeerConnection.getStats()` not in jsdom — mock `peerConnection.getStats` to return a fabricated `RTCStatsReport`
- `sessionStorage` IS available in jsdom — no mock needed for theme tests

---

## Sources

### Primary (HIGH confidence)

- MDN Web Docs — `RTCRtpSender.replaceTrack()`: https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
- MDN Web Docs — `getDisplayMedia()`: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- MDN Web Docs — Fullscreen API: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
- MDN Web Docs — `RTCPeerConnection.getStats()`: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats
- MDN Web Docs — Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- Tailwind CSS v4 — Dark mode (class strategy): https://tailwindcss.com/docs/dark-mode

### Secondary (MEDIUM confidence)

- Project codebase (index.css): `.dark` CSS variables already defined; `@custom-variant dark` already configured — verified by direct file read
- Project codebase (useCall.ts): `callRef.current?.peerConnection` access pattern verified — `MediaConnection` exposes `peerConnection` as public property
- Project codebase (useMedia.ts): `streamRef` pattern for MediaStream (not in state) — consistent with screen share displayTrack storage approach

### Tertiary (LOW confidence — flag for validation)

- Network quality thresholds (Good < 2% loss / 150ms RTT, Fair < 8% / 400ms): Based on WebRTC community conventions — validate against real network conditions during human verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all browser-native APIs
- Architecture: HIGH — patterns verified against MDN and existing codebase
- Screen share (AV-06): HIGH — replaceTrack is well-documented; OS stop-button via `onended` is standard pattern
- Fullscreen (AV-07): HIGH — standard Fullscreen API; iOS caveat noted
- Drag (AV-08): HIGH — corner-snap requirement simplifies implementation; pointer events are standard
- Theme (UX-03): HIGH — index.css already has .dark variables; sessionStorage scoping correct for PRIV-01
- Network quality thresholds: MEDIUM — thresholds are reasonable but not from a definitive spec
- PeerJS TypeScript types for `peerConnection`: MEDIUM — known to be public property, exact type accuracy at compile time needs verification

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable browser APIs, 30-day window)
