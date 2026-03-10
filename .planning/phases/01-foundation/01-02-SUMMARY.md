---
phase: 01-foundation
plan: "02"
subsystem: peerjs-lifecycle
tags: [peerjs, webrtc, hooks, turn, iceservers, testing, strict-mode, beforeunload]
dependency_graph:
  requires: [01-01]
  provides: [usePeer-hook, peer-lifecycle, turn-config, env-vars-dev-prod]
  affects: [all-webrtc-phases, phase-2-signaling, phase-3-media]
tech_stack:
  added: []
  patterns:
    - peerjs Peer stored in useRef to prevent re-renders
    - React Strict Mode guard via peerRef.current check before new Peer()
    - dual useEffect pattern — one for Peer lifecycle, one for beforeunload
    - Metered Open Relay TURN for dev (zero-config, 20 GB/month free)
    - env vars pattern VITE_PEERJS_* and VITE_TURN_* for host/port/path/credentials
key_files:
  created:
    - src/hooks/usePeer.ts
    - src/hooks/usePeer.test.ts
    - .env.development
    - .env.production
    - .env.example
  modified:
    - src/pages/RoomPage.tsx
    - src/pages/HomePage.tsx
decisions:
  - "Metered Open Relay used for dev TURN (openrelayproject credentials) — zero setup, no account required"
  - "dual useEffect for Peer lifecycle vs beforeunload — keeps concerns separated and avoids stale closure issues"
  - ".env.production force-committed with placeholder values only — gitignored to prevent real secret commits"
  - "cleanupRef added to hold beforeunload handler reference — ensures same function instance is removed on unmount"
metrics:
  duration: "2 minutes"
  completed: "2026-03-11"
  tasks_completed: 1
  files_created: 5
  files_modified: 2
---

# Phase 1 Plan 02: PeerJS Lifecycle Hook Summary

**One-liner:** usePeer hook with React Strict Mode guard (peerRef.current check), Cloudflare STUN + Metered Open Relay TURN ICE servers, beforeunload cleanup, and full Vitest test suite.

## What Was Built

The complete PeerJS lifecycle infrastructure:

- **usePeer hook** — creates exactly one `Peer` instance even under React 18 Strict Mode via `if (peerRef.current) return` guard. Stores peer in `useRef` (not `useState`) to prevent re-renders.
- **ICE server configuration** — STUN (`stun.cloudflare.com:3478`) + TURN (`openrelay.metered.ca` via env vars) wired through Peer constructor `config.iceServers`
- **Dual effect pattern** — first effect manages Peer lifecycle (create/destroy on roomId change), second effect manages `beforeunload` handler (destroy on tab close)
- **Environment variables** — `.env.development` (localhost:9000 + Metered Open Relay), `.env.production` (Railway/Cloudflare placeholders), `.env.example` (documented template)
- **RoomPage updated** — calls `usePeer(id)`, displays `connectionState` and `peerId` from Zustand store
- **HomePage updated** — calls `useCallStore().reset()` on mount for PRIV-01 defense in depth
- **5 new tests** — Strict Mode guard, TURN config, beforeunload registration, beforeunload removal, peer.destroy() cleanup

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (TDD-RED) | Failing tests for usePeer hook | 16b70a8 | src/hooks/usePeer.test.ts |
| 1 (TDD-GREEN) | usePeer implementation + env files + page updates | f0cdf94 | src/hooks/usePeer.ts, .env.*, RoomPage.tsx, HomePage.tsx |
| 2 | Human verification checkpoint | PENDING | - |

## Decisions Made

### Metered Open Relay for Dev TURN
Using `openrelayproject` credentials for dev avoids any account setup. Metered's free tier provides 20 GB/month which is more than sufficient for development. Production will use Cloudflare TURN (better reliability, lower latency globally).

### Dual useEffect Pattern
Separated Peer lifecycle from beforeunload registration intentionally:
- Peer lifecycle effect depends on `[roomId]` — recreates Peer if room changes
- beforeunload effect depends on `[]` — registers once, uses `peerRef` via closure so it always destroys the current Peer instance

### .env.production Force-Committed
The `.gitignore` excludes `.env.production` by default to prevent real credentials from being committed. Since the file only contains placeholder strings (`REPLACE_WITH_*`), it was force-committed with `-f` to ensure the file template is tracked in git for developer reference.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock factory hoisting caused ReferenceError**
- **Found during:** TDD GREEN phase (test run)
- **Issue:** `vi.mock('peerjs', () => ({ default: MockPeer }))` referenced `MockPeer` variable declared at module level — Vitest hoists `vi.mock` to the top of the file, causing `Cannot access 'MockPeer' before initialization`
- **Fix:** Moved mock instance creation inside the factory function itself; used type casting to expose `_mockInstance` on the constructor for test access
- **Files modified:** src/hooks/usePeer.test.ts
- **Commit:** f0cdf94 (incorporated into GREEN commit)

## Verification Results

| Check | Result |
|-------|--------|
| `npm test -- --run` (12 tests) | PASS |
| `npx tsc --noEmit` | PASS (0 errors) |
| usePeer creates exactly 1 Peer under Strict Mode | PASS (verified by test) |
| TURN iceServers in Peer config | PASS (verified by test) |
| beforeunload listener registered/removed | PASS (verified by test) |
| peer.destroy() called on cleanup | PASS (verified by test) |
| .env.development exists with Metered Open Relay | PASS |
| .env.production exists with placeholders | PASS |
| Browser verification (RoomPage, clean storage) | PENDING (Task 2 checkpoint) |

## Self-Check: PASSED

All 5 created files verified present. Task commits 16b70a8 (RED) and f0cdf94 (GREEN) confirmed in git log.
