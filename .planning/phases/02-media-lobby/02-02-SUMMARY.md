---
phase: 02-media-lobby
plan: "02"
subsystem: ui
tags: [react, tailwind, clipboard, wouter, zustand, vitest, responsive]

# Dependency graph
requires:
  - phase: 02-media-lobby
    plan: "01"
    provides: useMedia hook, VideoPreview component, extended CallStore (isMicOn/isCameraOn)
  - phase: 01-foundation
    provides: usePeer hook, Zustand store, wouter routing, cn() utility, generateRoomId()
provides:
  - HomePage with manual Room ID join input (raw ID or full URL paste)
  - CopyLinkButton with clipboard.writeText + execCommand fallback, 2s Copied! feedback
  - MediaControls with mic/camera toggle buttons and visual on/off state
  - SelfViewOverlay with absolute PiP wrapper and mirrored VideoPreview
  - RoomPage full lobby layout wiring all components together
affects: [03-active-call, 04-encryption]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - meet-[0-9a-z]{6} regex for room ID extraction from both raw IDs and full URLs
    - navigator.clipboard.writeText with execCommand fallback for browser compatibility
    - Disabled placeholder button pattern for Phase 3 (Waiting for peer...)

key-files:
  created:
    - src/pages/HomePage.test.tsx
    - src/components/CopyLinkButton.tsx
    - src/components/CopyLinkButton.test.tsx
    - src/components/MediaControls.tsx
    - src/components/SelfViewOverlay.tsx
    - src/components/SelfViewOverlay.test.tsx
  modified:
    - src/pages/HomePage.tsx
    - src/pages/RoomPage.tsx

key-decisions:
  - "meet-[0-9a-z]{6} regex used in handleJoin to extract room IDs from both raw IDs and pasted full URLs — single extraction handles both cases"
  - "SelfViewOverlay rendered inside video area div (not at RoomPage level) so it positions absolutely relative to the video container"
  - "RoomPage renders VideoPreview only when not loading and no error — avoids blank black box when camera is initializing"
  - "usePeer call kept in RoomPage during lobby — peer must register on signaling server before Phase 3 call connection"

patterns-established:
  - "Pattern: clipboard.writeText with execCommand textarea fallback for older browser support"
  - "Pattern: disabled placeholder button with descriptive text for future-phase functionality"

requirements-completed: [CONN-01, CONN-02, CONN-03, AV-05, UX-01]

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 2 Plan 02: Media Lobby UI Summary

**Lobby shell with manual room join, one-click copy link, mic/camera toggle buttons, PiP self-view overlay, and responsive two-column RoomPage layout — 34 tests green**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T00:34:08Z
- **Completed:** 2026-03-11T00:36:30Z
- **Tasks:** 2 (automated) + 1 checkpoint pending human verify
- **Files modified:** 8

## Accomplishments

- HomePage gains manual join input: accepts raw room ID (`meet-abc123`) or full pasted URL, extracts ID via regex, navigates on match
- CopyLinkButton copies BASE_URL-aware room link to clipboard with `Copied!` visual feedback for 2 seconds
- MediaControls renders mic/camera toggle buttons: zinc-700 background when on, red-600 when off
- SelfViewOverlay renders mirrored VideoPreview in absolute bottom-right PiP position inside the video area
- RoomPage assembles all primitives into responsive mobile-first lobby: single column on 375px, two columns on 1280px

## Task Commits

Each task was committed atomically via TDD (test RED then implementation GREEN):

1. **Task 1 RED: failing tests for HomePage, CopyLinkButton, SelfViewOverlay** - `3b6c4d5` (test)
2. **Task 1 GREEN: implement all lobby UI components** - `eebceaf` (feat)
3. **Task 2: assemble RoomPage lobby layout** - `0f98672` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks produced test RED commit followed by feat GREEN commit per task_

## Files Created/Modified

- `src/pages/HomePage.tsx` - Added joinId state, handleJoin with regex extraction, join input + button
- `src/pages/HomePage.test.tsx` - 4 tests: valid ID, full URL paste, empty input guard, invalid input guard
- `src/components/CopyLinkButton.tsx` - Clipboard copy with execCommand fallback, 2s Copied! feedback
- `src/components/CopyLinkButton.test.tsx` - 2 tests: writeText called with url, button text changes to Copied!
- `src/components/MediaControls.tsx` - Mic/camera toggle buttons with zinc/red conditional classes via cn()
- `src/components/SelfViewOverlay.tsx` - Absolute PiP wrapper with mirrored VideoPreview inside
- `src/components/SelfViewOverlay.test.tsx` - 2 tests: mirror class on video, absolute class on wrapper
- `src/pages/RoomPage.tsx` - Full lobby layout: loading/error states, VideoPreview, SelfViewOverlay, MediaControls, CopyLinkButton, disabled join placeholder

## Decisions Made

- Used `meet-[0-9a-z]{6}` regex in `handleJoin` to extract room IDs — handles both raw IDs and pasted full URLs with a single `.match()` call, no URL parsing needed.
- `SelfViewOverlay` placed inside the video area div so its `absolute` positioning is relative to the video container, not the viewport.
- `VideoPreview` rendered only when not loading and no error — avoids a blank black box while camera is initializing; loading text shown instead.
- `usePeer` call preserved in RoomPage — peer registers on signaling server during lobby so Phase 3 can use it without re-initialization.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all 34 tests passed, zero TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Lobby UI complete: camera preview, mic/camera toggles, copy link, PiP self-view, manual join
- RoomPage has disabled "Waiting for peer..." button placeholder ready for Phase 3 to wire active call connection
- All components export correct interfaces for Phase 3 consumption
- Human verification checkpoint pending (Task 3) — dev server must be started for manual QA

## Self-Check: PASSED

All files created and all commits verified present.

---
*Phase: 02-media-lobby*
*Completed: 2026-03-11*
