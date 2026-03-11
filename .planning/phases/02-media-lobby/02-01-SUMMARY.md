---
phase: 02-media-lobby
plan: "01"
subsystem: ui
tags: [getUserMedia, MediaStream, react, zustand, vitest, tailwind]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Zustand store (CallStore), TypeScript types (ConnectionState), test infrastructure (Vitest + jsdom)
provides:
  - useMedia hook with getUserMedia lifecycle, track toggles, error classification
  - VideoPreview component that assigns MediaStream via srcObject ref
  - Extended CallStore with isMicOn, isCameraOn, setMicOn, setCameraOn
  - MediaError type in src/types/index.ts
affects: [03-active-call, 04-encryption, lobby UI, SelfViewOverlay, MediaControls]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - cancelled-flag pattern for async getUserMedia teardown safety
    - useRef<MediaStream> not useState to avoid re-render loops
    - useEffect srcObject assignment for imperative video element prop (not JSX)
    - track.enabled for toggles (not stop) to preserve permission grant
    - track.stop() only in cleanup (not toggle) to release hardware

key-files:
  created:
    - src/hooks/useMedia.ts
    - src/hooks/useMedia.test.ts
    - src/components/VideoPreview.tsx
    - src/components/VideoPreview.test.tsx
  modified:
    - src/types/index.ts
    - src/store/index.ts

key-decisions:
  - "useCallStore.getState() used inside toggleMic/toggleCamera callbacks instead of closure over isMicOn/isCameraOn — avoids stale closure bug when toggling rapidly"
  - "stream stored in useRef not useState — MediaStream is mutable browser object, Zustand serialization causes re-render loops"
  - "track.enabled=false for toggles, track.stop() only in useEffect cleanup — consistent with RESEARCH.md recommendation"
  - "getUserMedia constraints use ideal values (ideal: 1280) not exact — preferences not mandates, avoids OverconstrainedError"

patterns-established:
  - "Pattern: cancelled flag in useEffect for async teardown safety"
  - "Pattern: srcObject assignment via useRef + useEffect (never JSX prop)"
  - "Pattern: track.enabled for mute/unmute, track.stop() for cleanup only"

requirements-completed: [AV-02, AV-03, AV-04]

# Metrics
duration: 8min
completed: 2026-03-11
---

# Phase 2 Plan 01: Media Acquisition Primitives Summary

**getUserMedia hook with cancelled-flag async safety, track toggle via track.enabled, and a VideoPreview component assigning MediaStream via srcObject ref — 26 tests green**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-11T07:30:00Z
- **Completed:** 2026-03-11T07:38:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- useMedia hook acquires camera+mic on mount, stops all tracks on unmount using cancelled flag to prevent orphaned async state updates
- toggleMic/toggleCamera flip track.enabled and sync Zustand store using getState() to avoid stale closure bug
- VideoPreview component imperatively assigns MediaStream to srcObject via useRef + useEffect with muted/autoPlay/playsInline trio
- Extended CallStore with isMicOn/isCameraOn booleans and MediaError type in types

## Task Commits

Each task was committed atomically via TDD (test RED then implementation GREEN):

1. **Task 1 RED: useMedia failing tests** - `195b903` (test)
2. **Task 1 GREEN: useMedia implementation** - `97b3601` (feat)
3. **Task 2 RED: VideoPreview failing tests** - `84528d8` (test)
4. **Task 2 GREEN: VideoPreview implementation** - `e265d66` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks produced test RED commit followed by feat GREEN commit per task_

## Files Created/Modified

- `src/hooks/useMedia.ts` - getUserMedia lifecycle hook with cancelled-flag, error classification, track toggle callbacks
- `src/hooks/useMedia.test.ts` - 9 tests covering mount/unmount lifecycle, async teardown, toggles, error types, store reset
- `src/components/VideoPreview.tsx` - video element with srcObject via useRef + useEffect, mirror prop, cn() for classes
- `src/components/VideoPreview.test.tsx` - 5 tests covering srcObject assignment, attributes, mirror class, stream updates
- `src/types/index.ts` - Added MediaError type ('not-allowed' | 'not-found' | 'not-readable' | 'unknown')
- `src/store/index.ts` - Extended CallStore with isMicOn, isCameraOn, setMicOn, setCameraOn; reset() also resets media state

## Decisions Made

- Used `useCallStore.getState()` inside toggleMic/toggleCamera callbacks instead of closing over `isMicOn`/`isCameraOn` from the hook's render scope. This prevents stale closure bugs when toggles happen in rapid succession before a re-render.
- Stream stored in `useRef` not `useState` — putting a MediaStream in Zustand or useState causes serialization issues and re-render loops (anti-pattern documented in RESEARCH.md).
- `track.enabled = false` for mute/unmute toggles preserves the hardware permission grant; `track.stop()` only in useEffect cleanup to release camera hardware.
- getUserMedia constraints use `ideal` values (not `exact`) to avoid OverconstrainedError on devices that can't meet strict specs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tests passed on first implementation. The test for srcObject assignment required defining `HTMLVideoElement.prototype.srcObject` with a setter (jsdom limitation documented in RESEARCH.md) which worked correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useMedia and VideoPreview are the building blocks for the lobby UI (Phase 2 Plan 02+)
- Store has isMicOn/isCameraOn ready for MediaControls toggle buttons
- streamRef returned from useMedia passes directly as stream prop to VideoPreview
- Full test suite: 26 tests across 6 files, all green with zero TypeScript errors

## Self-Check: PASSED

All files created and all commits verified present.

---
*Phase: 02-media-lobby*
*Completed: 2026-03-11*
