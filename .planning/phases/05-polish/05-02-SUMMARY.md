---
phase: 05-polish
plan: 02
subsystem: ui
tags: [react, webrtc, getDisplayMedia, replaceTrack, getStats, screen-share]

# Dependency graph
requires:
  - phase: 03-core-call
    provides: useCall hook with callRef (MediaConnection) and peerConnection access
  - phase: 02-media-lobby
    provides: useMedia hook with streamRef (local camera stream)
provides:
  - useScreenShare hook: screen share start/stop via replaceTrack, OS stop button via onended
  - useNetworkQuality hook: RTCPeerConnection.getStats polling returning good/fair/poor tier
  - NetworkQualityBadge component: color-coded Good/Fair/Poor badge
  - callRef exposed from useCall for downstream consumers
affects: [05-03-polish, CallView integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - displayTrackRef as useRef (not state) — avoids re-render anti-pattern for track storage
    - setInterval polling pattern with prevStatsRef for delta-based packet loss computation
    - onended callback for OS stop-sharing integration without renegotiation

key-files:
  created:
    - src/hooks/useScreenShare.ts
    - src/hooks/useScreenShare.test.ts
    - src/hooks/useNetworkQuality.ts
    - src/hooks/useNetworkQuality.test.ts
    - src/components/NetworkQualityBadge.tsx
    - src/components/NetworkQualityBadge.test.tsx
  modified:
    - src/hooks/useCall.ts

key-decisions:
  - "displayTrackRef stored in useRef not useState — avoids re-render on track assignment, consistent with stream-in-ref pattern from Phase 02"
  - "stopScreenShare async to await sender.replaceTrack during camera restore — matches replaceTrack Promise-returning API"
  - "useNetworkQuality uses delta nackCount/packetsSent across intervals for accurate loss ratio, not cumulative"
  - "callRef exposed from useCall return value — minimal one-line change to enable useScreenShare and useNetworkQuality access to peerConnection"

patterns-established:
  - "Screen share: replaceTrack for track substitution, never re-call peer.call() — avoids renegotiation"
  - "OS stop button: displayTrack.onended = () => stopScreenShare() — integrates native browser stop event"
  - "Stats polling: prevStatsRef.current Map keyed by stat ID for delta computation across 2s intervals"

requirements-completed: [AV-06, UX-05]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 5 Plan 02: Screen Share and Network Quality Summary

**Screen share via replaceTrack with OS stop handling, and RTCPeerConnection.getStats network quality polling with color-coded badge, all with TDD test coverage (23 tests)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T10:15:18Z
- **Completed:** 2026-03-11T10:18:28Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- useScreenShare hook: starts screen share via getDisplayMedia and replaceTrack without renegotiation, handles OS "Stop Sharing" button via displayTrack.onended, silently catches NotAllowedError
- useNetworkQuality hook: polls getStats every 2s, computes delta packet loss from nackCount/packetsSent, classifies good (loss<2%, RTT<150ms) / fair (loss<8%, RTT<400ms) / poor
- NetworkQualityBadge component: renders "Good/Fair/Poor" with matching green/yellow/red color classes and dot indicator, returns null when quality is null
- callRef exposed from useCall return value for downstream hook consumers

## Task Commits

Each task was committed atomically:

1. **Task 1: useScreenShare hook with replaceTrack and OS stop handling** - `5ba760f` (feat)
2. **Task 2: useNetworkQuality hook and NetworkQualityBadge component** - `a736d28` (feat)

**Plan metadata:** `[docs commit]` (docs: complete plan)

_Note: TDD tasks with failing tests first then implementation. Both tasks used TDD pattern._

## Files Created/Modified
- `src/hooks/useScreenShare.ts` - Screen share hook with startScreenShare/stopScreenShare and isScreenSharing state
- `src/hooks/useScreenShare.test.ts` - 8 tests covering all behavior including onended OS stop handler
- `src/hooks/useNetworkQuality.ts` - getStats polling hook returning NetworkQuality type
- `src/hooks/useNetworkQuality.test.ts` - 7 tests covering null/good/fair/poor tiers and reset on deactivate
- `src/components/NetworkQualityBadge.tsx` - Badge with green/yellow/red color coding and dot indicator
- `src/components/NetworkQualityBadge.test.tsx` - 8 tests covering all quality values and null rendering
- `src/hooks/useCall.ts` - Exposed callRef in return value (one-line change)

## Decisions Made
- displayTrackRef stored in useRef not useState — consistent with stream-in-ref pattern from Phase 02, avoids re-render on track assignment
- stopScreenShare made async to properly await sender.replaceTrack when restoring camera track
- useNetworkQuality computes delta nack/packetsSent across intervals for accurate loss ratio (not cumulative)
- callRef exposed from useCall to enable useScreenShare and useNetworkQuality access to RTCPeerConnection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed require() usage in first test to use ES module import**
- **Found during:** Task 1 (RED phase test run)
- **Issue:** First test used `require('./useScreenShare')` inside renderHook which fails in ESM/Vite test environment
- **Fix:** Changed to top-level `import { useScreenShare } from './useScreenShare'` and updated test to use imported function
- **Files modified:** src/hooks/useScreenShare.test.ts
- **Verification:** All 8 tests passed after fix
- **Committed in:** 5ba760f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor fix to test import pattern — no scope creep.

## Issues Encountered
- Pre-existing test failures in useChat.test.ts, usePeer.test.ts, and SelfViewOverlay.test.tsx were present before this plan and are unrelated to changes here. Verified by git stash comparison.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useScreenShare and useNetworkQuality hooks ready to wire into CallView in Plan 03
- callRef now accessible from useCall for both new hooks
- All new artifacts fully tested; no blockers for Plan 03 integration

---
*Phase: 05-polish*
*Completed: 2026-03-11*
