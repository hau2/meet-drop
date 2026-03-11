---
phase: 03-core-call
plan: 01
subsystem: ui
tags: [zustand, web-audio-api, react, vitest, shadcn, badge, wouter]

# Dependency graph
requires:
  - phase: 02-media-lobby
    provides: useCallStore with connectionState, Badge/Button UI components, wouter routing, generateRoomId
provides:
  - Extended CallStore with callEnded and wasConnected booleans and setters
  - playJoinSound (C5→G5 ascending) and playLeaveSound (G5→C5 descending) via Web Audio API singleton
  - ConnectionStatus badge component mapping all 5 ConnectionState values to labels and variants
  - MeetingEnded screen with New Meeting and Return Home navigation, store reset before navigation
affects: [03-02-PLAN, RoomPage, useCall hook]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Web Audio API singleton AudioContext with lazy init and suspended-state resume guard
    - Zustand store extension pattern: add fields + setters to existing create() call, update reset()
    - ConnectionState→label/variant mapping via const Record objects for exhaustive coverage
    - Reset store before navigation in MeetingEnded to prevent stale state in new room (Pitfall 5)

key-files:
  created:
    - src/lib/sounds.ts
    - src/lib/sounds.test.ts
    - src/components/ConnectionStatus.tsx
    - src/components/ConnectionStatus.test.tsx
    - src/components/MeetingEnded.tsx
    - src/components/MeetingEnded.test.tsx
  modified:
    - src/store/index.ts
    - src/store/index.test.ts

key-decisions:
  - "Web Audio singleton: AudioContext created once and reused across sound calls to avoid browser limits and overhead"
  - "wasConnected boolean distinguishes call-ended-after-connection from call-failed-to-connect for UX branching in Plan 02"
  - "useCallStore.getState().reset() called synchronously before setLocation() in MeetingEnded to prevent race where new room reads stale callEnded=true"

patterns-established:
  - "Pattern: Web Audio API singleton — lazy init AudioContext, resume() if suspended before playing"
  - "Pattern: ConnectionState record maps — use Record<ConnectionState, T> for exhaustive label and variant mapping"
  - "Pattern: Store reset before navigate — always reset() before setLocation() when clearing call state"

requirements-completed: [CONN-04, UX-02, UX-04]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 3 Plan 01: Building Blocks Summary

**Zustand store extended with call-ended state, Web Audio API join/leave sounds, ConnectionStatus badge, and MeetingEnded navigation screen — all TDD with 21 passing tests**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-11T01:26:40Z
- **Completed:** 2026-03-11T01:28:54Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extended CallStore with `callEnded` and `wasConnected` booleans, setters, and reset — enabling Plan 02's call wiring to track state transitions
- Created `sounds.ts` with singleton AudioContext and ascending/descending two-tone synthesis (523 Hz/784 Hz) with suspended-state resume guard
- Created `ConnectionStatus` badge component mapping all 5 ConnectionState values to human-readable labels and appropriate Badge variants
- Created `MeetingEnded` screen with New Meeting and Return Home navigation, reset called before navigation to prevent stale state

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend store, create sounds utility, and ConnectionStatus component** - `76bd3cc` (feat)
2. **Task 2: Create MeetingEnded component with navigation** - `1496ab6` (feat)

## Files Created/Modified
- `src/store/index.ts` - Added callEnded, wasConnected, setCallEnded, setWasConnected, updated reset()
- `src/store/index.test.ts` - Added 2 new tests for callEnded/wasConnected lifecycle
- `src/lib/sounds.ts` - playJoinSound (C5→G5) and playLeaveSound (G5→C5) via Web Audio API
- `src/lib/sounds.test.ts` - 5 tests: AudioContext creation, reuse, oscillator calls, resume on suspended
- `src/components/ConnectionStatus.tsx` - Badge component with Record-based label/variant mapping
- `src/components/ConnectionStatus.test.tsx` - 5 tests covering all ConnectionState values
- `src/components/MeetingEnded.tsx` - Meeting ended screen with two navigation buttons
- `src/components/MeetingEnded.test.tsx` - 6 tests: heading, buttons, navigation, reset ordering

## Decisions Made
- Web Audio singleton: AudioContext created once (module-level null ref) and reused — avoids per-call allocation and browser AudioContext limits
- `wasConnected` flag stores whether a peer was ever connected during the session, enabling Plan 02's useCall hook to distinguish "graceful end" from "failed to connect"
- `useCallStore.getState().reset()` called synchronously before `setLocation()` in both MeetingEnded handlers — prevents new room component mounting with `callEnded: true` and immediately redirecting again

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all implementations matched plan spec without surprises.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Plan 02 contracts are ready: `callEnded`/`wasConnected` in store, `playJoinSound`/`playLeaveSound` exports, `ConnectionStatus` component, `MeetingEnded` component
- Plan 02 (useCall hook + RoomPage wiring) can now import and integrate these building blocks
- 21 new tests pass, full suite of 52 tests passes with zero regressions

## Self-Check: PASSED

All 7 created/modified files confirmed present on disk. Both task commits (76bd3cc, 1496ab6) confirmed in git log.

---
*Phase: 03-core-call*
*Completed: 2026-03-11*
