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
  - Join Meeting button gating call signaling until user opts in
  - Reliable remote disconnect detection via ICE connection state monitoring
affects: [04-encryption, 05-deployment]

# Tech tracking
tech-stack:
  added:
    - peer@1.0.2 (local PeerJS signaling server for dev)
    - concurrently@9.2.1 (npm run dev starts Vite + peer server in parallel)
  patterns:
    - useCall hook: subscribeToCall() shared by both joiner and creator paths to avoid duplication
    - wasConnected flag read via useCallStore.getState() inside close handler to avoid stale closure
    - State machine rendering in RoomPage: callEnded first, then connectionState, then lobby fallback
    - Remote video element has no muted attribute — audio plays through (critical for call UX)
    - Split-effect pattern in useCall: always-on peer.on('call') listener + joined-gated outgoing/answer effect
    - Call buffering: pendingCallRef stores incoming calls before user clicks Join
    - ICE state monitoring: pc.oniceconnectionstatechange for reliable remote disconnect detection
    - joined flag in store gates call signaling — users must explicitly click Join before WebRTC negotiation

key-files:
  created:
    - src/hooks/useCall.ts
    - src/hooks/useCall.test.ts
    - src/components/CallView.tsx
    - src/pages/RoomPage.test.tsx
  modified:
    - src/pages/RoomPage.tsx
    - src/hooks/usePeer.ts
    - src/store/index.ts
    - package.json

key-decisions:
  - "subscribeToCall() shared helper handles both joiner (peer.call) and creator (call.answer) paths to avoid duplicate event registration code"
  - "wasConnected read via useCallStore.getState() inside close handler — avoids stale closure bug if state changes between render and event fire"
  - "RoomPage renders callEnded check first — prevents brief flash of connected state before meeting-ended renders"
  - "Remote video element has no muted attribute — remote audio MUST play through for valid call UX"
  - "usePeer joiner fallback: creator registers with peerId=roomId; unavailable-id error signals joiner role — reconnects with random ID"
  - "ICE connection state monitoring added alongside call.on('close') for reliable remote hang-up detection across NAT scenarios"
  - "joined boolean in store gates all call signaling — prevents auto-connecting before user clicks Join Meeting"
  - "peer.destroy() called in hangUp to release signaling server resources and prevent ghost connections"
  - "npm run dev starts both Vite and local PeerJS server concurrently for zero-config local development"

patterns-established:
  - "Pattern: Store.getState() in async event handlers to read latest state without stale closures"
  - "Pattern: State machine rendering — exhaustive conditional render based on store state (callEnded→MeetingEnded, connected→CallView, else lobby)"
  - "Pattern: subscribeToCall shared helper — pass MediaConnection object to a shared subscription function from both joiner and creator paths"
  - "Pattern: Split useCall effects — effect 1 always registers peer.on('call') listener; effect 2 fires only when joined=true"
  - "Pattern: Call buffer — pendingCallRef holds incoming MediaConnection until joined=true, then answered immediately"
  - "Pattern: Dual disconnect detection — call.on('close') + pc.oniceconnectionstatechange both guarded by endedRef for idempotency"

requirements-completed: [AV-01, CONN-04, UX-02, UX-04]

# Metrics
duration: ~45min (including verification and post-verification bug fixes)
completed: 2026-03-11
---

# Phase 3 Plan 02: Core Call Summary

**PeerJS 1-on-1 video call with join-gated signaling, ICE disconnect detection, and state-machine RoomPage (lobby / call / meeting ended) — human-verified working across two browsers**

## Performance

- **Duration:** ~45 min (including post-verification bug fix iteration)
- **Started:** 2026-03-11T01:31:39Z
- **Completed:** 2026-03-11T09:55:00Z
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 8

## Accomplishments
- Two-browser 1-on-1 video call works: creator registers as roomId, joiner detects conflict via unavailable-id error and reconnects with random ID
- Join Meeting button gates all WebRTC signaling — peer buffered until user explicitly opts in, answering call on Join click
- Remote disconnect detected reliably via dual mechanism: call.on('close') + ICE connection state change monitoring
- Full test suite: 64 tests passing across 14 files, zero regressions
- Human-verified: remote video/audio, ConnectionStatus transitions, Meeting Ended screen, join/leave sounds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCall hook and CallView component** - `221daf8` (feat)
2. **Task 2: Integrate useCall into RoomPage with smoke tests** - `1cd1872` (feat)
3. **Task 3: Human verification** - Approved (no code commit — verification only)
4. **Post-verification bug fixes** - `79023fa` (fix)

**Plan metadata:** (docs commit — this step)

## Files Created/Modified
- `src/hooks/useCall.ts` - PeerJS MediaConnection lifecycle hook; split-effect pattern; ICE monitoring; hangUp with peer.destroy()
- `src/hooks/useCall.test.ts` - 8 unit tests covering joiner/creator paths, stream/close/hangUp events; joined flag dependency
- `src/components/CallView.tsx` - Full-screen remote video (no muted), self-view PiP, MediaControls + red hang-up button
- `src/hooks/usePeer.ts` - Added unavailable-id fallback (joiner detection) + conditional PeerJS server config
- `src/pages/RoomPage.tsx` - State machine: callEnded -> MeetingEnded, connected -> CallView, else lobby; Join Meeting button
- `src/pages/RoomPage.test.tsx` - 4 smoke tests: meeting-ended, call-view, lobby (not joined), lobby (joined/waiting)
- `src/store/index.ts` - Added joined boolean + setJoined action; reset() clears joined
- `package.json` - Added peer + concurrently devDeps; npm run dev starts Vite + PeerJS server concurrently

## Decisions Made
- Creator/joiner role determined dynamically via unavailable-id PeerJS error — no explicit role negotiation needed
- joined store flag chosen over local state so useCall effect can react to it without prop drilling
- peer.destroy() in hangUp releases signaling server socket — without this, ghost connections lingered
- ICE state monitoring added after observing that call.on('close') fires late or not at all on abrupt disconnect
- subscribeToCall() shared helper: both joiner and creator code paths call this same function to avoid duplicated event handler registration
- useCallStore.getState() inside close handler: reads current wasConnected at event fire time to prevent stale closure bug

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] usePeer joiner fallback via unavailable-id error**
- **Found during:** Task 3 (human verification — call never connected in second tab)
- **Issue:** Both tabs tried to register with roomId; second tab received an error with no fallback — remained unconnected
- **Fix:** Added initPeer() helper; on unavailable-id error, destroys current peer and calls initPeer() without ID (random ID = joiner)
- **Files modified:** src/hooks/usePeer.ts
- **Verification:** Two-browser call connected successfully
- **Committed in:** 79023fa

**2. [Rule 2 - Missing Critical] Conditional PeerJS server config for environment flexibility**
- **Found during:** Task 3 (verification setup — needed to run local peer server without env vars)
- **Issue:** usePeer always required VITE_PEERJS_HOST; no local dev fallback
- **Fix:** Wrapped host/port/path/secure assignment in if (VITE_PEERJS_HOST) block; falls back to PeerJS cloud or local peer server
- **Files modified:** src/hooks/usePeer.ts
- **Verification:** Local npm run dev works without env vars; production can set VITE_PEERJS_HOST
- **Committed in:** 79023fa

**3. [Rule 1 - Bug] Remote hang-up detection via ICE connection state monitoring**
- **Found during:** Task 3 (verification — tab close did not reliably trigger Meeting Ended on other tab)
- **Issue:** call.on('close') fires inconsistently on abrupt disconnect; remote peer closing tab left the other tab stuck in connected state
- **Fix:** Added pc.oniceconnectionstatechange handler calling handleRemoteHangUp when state is 'disconnected' or 'failed'; endedRef guards against double-fire
- **Files modified:** src/hooks/useCall.ts
- **Verification:** Tab close triggers Meeting Ended on other tab within a few seconds
- **Committed in:** 79023fa

**4. [Rule 2 - Missing Critical] Join button gating — split call setup into two effects**
- **Found during:** Task 3 (verification — call auto-connected before user was ready; creator missed incoming call if it arrived before joining)
- **Issue:** Single useEffect meant call signaling started immediately on peer open; creator's peer.on('call') handler registered after potential call arrival
- **Fix:** Split into two effects: (a) always-on peer.on('call') with buffering into pendingCallRef, (b) joined-gated effect that initiates outgoing call or answers buffered call
- **Files modified:** src/hooks/useCall.ts
- **Verification:** Call only establishes after both parties click Join Meeting
- **Committed in:** 79023fa

**5. [Rule 2 - Missing Critical] Store joined flag**
- **Found during:** Task 3 (verification — needed join-gate state accessible to useCall across hook boundary)
- **Issue:** No state to gate call signaling; local state would not be reactive across hooks
- **Fix:** Added joined boolean + setJoined to CallStore; reset() clears it; useCall reads it from store
- **Files modified:** src/store/index.ts
- **Verification:** RoomPage smoke tests assert lobby renders "Join Meeting" button when joined=false
- **Committed in:** 79023fa

**6. [Rule 2 - Missing Critical] RoomPage Join Meeting button**
- **Found during:** Task 3 (verification — lobby showed always-disabled "Waiting for peer..." with no user action possible)
- **Issue:** Users had no explicit join action; call would auto-start without opt-in
- **Fix:** Button shows "Join Meeting" (enabled) when joined=false; after click shows "Waiting for peer..." or "Connection failed" (disabled)
- **Files modified:** src/pages/RoomPage.tsx, src/pages/RoomPage.test.tsx
- **Verification:** RoomPage tests assert both states; human verified UX flow
- **Committed in:** 79023fa

**7. [Rule 3 - Blocking] Dev setup: peer + concurrently for local signaling server**
- **Found during:** Task 3 (verification setup — needed PeerJS signaling server locally; cloud had reliability issues)
- **Issue:** No local signaling server; 0.peerjs.com cloud had documented reliability issues
- **Fix:** Added peer@1.0.2 and concurrently@9.2.1 devDeps; updated npm run dev to start both Vite and peerjs --port 9000 --path /peerjs concurrently
- **Files modified:** package.json, package-lock.json
- **Verification:** npm run dev starts both servers; two-browser call connects via local signaling
- **Committed in:** 79023fa

---

**Total deviations:** 7 auto-fixed (3 bugs, 3 missing critical, 1 blocking)
**Impact on plan:** All fixes necessary for real-world call reliability. Join gating was a UX requirement surfaced during verification. ICE monitoring and joiner fallback are correctness requirements for WebRTC. No scope creep.

## Issues Encountered

- PeerJS call.on('close') is unreliable on abrupt disconnect (tab close, network drop) — addressed by dual detection with ICE state monitoring
- Creator/joiner role collision required unavailable-id error handling pattern rather than pre-assignment

## User Setup Required

None — local development works with npm run dev (no env vars required). For production, set VITE_PEERJS_HOST to self-hosted PeerJS server.

## Next Phase Readiness
- Complete 1-on-1 video call working end-to-end: lobby -> join -> call -> meeting ended — human-verified
- Phase 4 (E2E encryption) can wrap DataChannel for key exchange before media negotiation
- Phase 5 (deployment) needs VITE_PEERJS_HOST configured for self-hosted PeerJS on Railway/Render/Fly.io
- All 64 tests pass

## Self-Check: PASSED

Files confirmed present:
- src/hooks/useCall.ts: FOUND
- src/hooks/useCall.test.ts: FOUND
- src/components/CallView.tsx: FOUND
- src/hooks/usePeer.ts: FOUND (modified)
- src/pages/RoomPage.tsx: FOUND (modified)
- src/pages/RoomPage.test.tsx: FOUND (modified)
- src/store/index.ts: FOUND (modified)
- package.json: FOUND (modified)

Commits confirmed:
- 221daf8: feat(03-02): create useCall hook and CallView component
- 1cd1872: feat(03-02): integrate useCall and state-driven rendering into RoomPage with smoke tests
- 79023fa: fix(03-02): apply post-verification bug fixes for reliable two-browser call

---
*Phase: 03-core-call*
*Completed: 2026-03-11*
