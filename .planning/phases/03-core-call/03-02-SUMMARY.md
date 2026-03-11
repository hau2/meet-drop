---
phase: 03-core-call
plan: 02
subsystem: ui
tags: [peerjs, mediaconnection, react, vitest, zustand, webrtc, hooks]

# Dependency graph
requires:
  - phase: 03-core-call/plan-01
    provides: callEnded/wasConnected store fields, playJoinSound/playLeaveSound, ConnectionStatus, MeetingEnded
  - phase: 02-media-lobby
    provides: usePeer, useMedia, streamRef, peerRef, lobby UI components
provides:
  - useCall hook managing MediaConnection lifecycle for joiner and creator paths
  - CallView component with remote video (unmuted), self-view PiP, and hang-up button
  - RoomPage state-machine rendering: lobby → connected → meeting-ended
  - ConnectionStatus badge in lobby card header
affects: [03-03-PLAN, phase-4-encryption]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useCall hook: subscribeToCall() shared by both joiner and creator paths to avoid duplication
    - wasConnected flag read via useCallStore.getState() inside close handler to avoid stale closure
    - State machine rendering in RoomPage: callEnded first, then connectionState, then lobby fallback
    - Remote video element has no muted attribute — audio plays through (critical for call UX)

key-files:
  created:
    - src/hooks/useCall.ts
    - src/hooks/useCall.test.ts
    - src/components/CallView.tsx
    - src/pages/RoomPage.test.tsx
  modified:
    - src/pages/RoomPage.tsx

key-decisions:
  - "subscribeToCall() shared helper handles both joiner (peer.call) and creator (call.answer) paths to avoid duplicate event registration code"
  - "wasConnected read via useCallStore.getState() inside close handler — avoids stale closure bug if state changes between render and event fire"
  - "RoomPage renders callEnded check first — prevents brief flash of connected state before meeting-ended renders"
  - "Remote video element has no muted attribute — remote audio MUST play through for valid call UX"

patterns-established:
  - "Pattern: Store.getState() in async event handlers to read latest state without stale closures"
  - "Pattern: State machine rendering — exhaustive conditional render based on store state (callEnded→MeetingEnded, connected→CallView, else lobby)"
  - "Pattern: subscribeToCall shared helper — pass MediaConnection object to a shared subscription function from both joiner and creator paths"

requirements-completed: [AV-01, CONN-04, UX-02, UX-04]

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 3 Plan 02: Core Call Summary

**PeerJS MediaConnection wired end-to-end: useCall hook handles joiner/creator paths, CallView renders unmuted remote video with PiP self-view, RoomPage drives state-machine rendering across lobby/connected/ended states — 11 TDD tests passing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-11T01:31:39Z
- **Completed:** 2026-03-11T01:36:00Z
- **Tasks:** 2 (of 3 — Task 3 is human verification checkpoint)
- **Files modified:** 5

## Accomplishments
- Created `useCall` hook with `subscribeToCall()` shared by both joiner (peer.call) and creator (peer.on('call')) paths
- Stream event sets `connectionState='connected'`, `wasConnected=true`, and calls `playJoinSound()`
- Close event after connection sets `callEnded=true` and calls `playLeaveSound()`; close before stream sets `connectionState='failed'` without callEnded
- `hangUp()` callback closes MediaConnection and sets disconnected+callEnded
- Created `CallView` component: remote video (no muted), SelfViewOverlay PiP, MediaControls + red hang-up button
- Rewrote `RoomPage` as state machine: callEnded → MeetingEnded, connected → CallView, else lobby with ConnectionStatus badge
- RoomPage.test.tsx: 3 smoke tests verifying all three rendering branches
- Full test suite: 63 tests passing across 14 files, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCall hook and CallView component** - `221daf8` (feat)
2. **Task 2: Integrate useCall and state-driven rendering into RoomPage with smoke tests** - `1cd1872` (feat)

Task 3 (human verification) pending user approval.

## Files Created/Modified
- `src/hooks/useCall.ts` - Hook managing MediaConnection lifecycle, subscribeToCall, hangUp
- `src/hooks/useCall.test.ts` - 8 TDD tests covering joiner/creator, stream, close, error, hangUp
- `src/components/CallView.tsx` - Remote video (unmuted), self-view overlay, controls bar with hang-up
- `src/pages/RoomPage.tsx` - State-machine rendering: callEnded/connected/lobby; ConnectionStatus badge
- `src/pages/RoomPage.test.tsx` - 3 smoke tests for MeetingEnded, CallView, and lobby branches

## Decisions Made
- `subscribeToCall()` shared helper: both joiner and creator code paths call this same function after obtaining a MediaConnection — avoids duplicated event handler registration
- `useCallStore.getState()` inside close handler: reads current `wasConnected` at event fire time, not at render time — prevents stale closure bug where wasConnected might be false even after stream arrived
- callEnded checked before connectionState in render: prevents brief flash of CallView if both happen near-simultaneously
- Remote video element has no `muted` attribute: remote audio MUST play through — only self-view is muted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all implementations matched plan spec without surprises. The App.test.tsx WebRTC browser-incompatible console.error is a pre-existing expected warning from the jsdom test environment, not a regression.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- useCall hook, CallView, and RoomPage state machine are complete
- Task 3 (human verification) requires manual two-browser test of the live video call
- After human approval, Phase 3 Plan 02 is fully complete
- Phase 4 (encryption) can import useCall's remoteStreamRef and hangUp if needed

## Self-Check: PASSED

Files confirmed present:
- src/hooks/useCall.ts: FOUND
- src/hooks/useCall.test.ts: FOUND
- src/components/CallView.tsx: FOUND
- src/pages/RoomPage.tsx: FOUND (modified)
- src/pages/RoomPage.test.tsx: FOUND

Commits confirmed:
- 221daf8: feat(03-02): create useCall hook and CallView component — FOUND
- 1cd1872: feat(03-02): integrate useCall and state-driven rendering into RoomPage with smoke tests — FOUND

---
*Phase: 03-core-call*
*Completed: 2026-03-11*
