---
phase: 03-core-call
verified: 2026-03-11T10:01:00Z
status: human_needed
score: 13/13 automated must-haves verified
human_verification:
  - test: "Open two browser tabs to the same room URL and click Join Meeting in both"
    expected: "Both tabs transition from lobby to CallView within ~15 seconds. Remote video is visible and remote audio is heard. Self-view PiP overlay appears. ConnectionStatus shows 'Connected'."
    why_human: "WebRTC media negotiation and live A/V rendering cannot be verified programmatically"
  - test: "Click the hang-up button (red Phone icon) in one tab"
    expected: "The other tab plays a descending leave sound and shows the MeetingEnded screen with 'New Meeting' and 'Return Home' buttons"
    why_human: "Real-time cross-tab state propagation via ICE disconnect detection requires a live browser"
  - test: "Close one browser tab while a call is active (do not click hang-up)"
    expected: "The remaining tab detects the disconnect within a few seconds via ICE state monitoring and shows the MeetingEnded screen"
    why_human: "Abrupt disconnect via tab close relies on ICE state change events that require a live WebRTC connection"
  - test: "While in a call, toggle microphone and camera using the MediaControls in CallView"
    expected: "The remote peer's video/audio state reflects the toggle"
    why_human: "Track mute propagation over an active MediaConnection requires a live two-browser session"
  - test: "From MeetingEnded, click 'New Meeting'"
    expected: "App navigates to a new room URL (/room/meet-xxxxxx) and shows the lobby — NOT the MeetingEnded screen again"
    why_human: "Navigation + store reset sequencing produces UI state that requires visual inspection"
  - test: "From MeetingEnded, click 'Return Home'"
    expected: "App navigates to the home page (/)"
    why_human: "Navigation target requires visual confirmation"
---

# Phase 3: Core Call Verification Report

**Phase Goal:** Two users on the same room link can see and hear each other in a live 1-on-1 video call with visible connection state and a clean exit experience
**Verified:** 2026-03-11T10:01:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Joiner calls `peer.call(roomId, localStream)` when peer.id !== roomId | VERIFIED | `useCall.ts:106` — `const call = peer.call(roomId, stream)` inside `if (isJoiner)` branch; unit test "joiner: calls peer.call(roomId, stream)" passes |
| 2 | Creator answers incoming call via `peer.on('call')` with `call.answer(localStream)` | VERIFIED | `useCall.ts:74-86` — `peer.on('call')` handler calls `call.answer(stream)` when joined; unit test "creator: answers incoming call with local stream" passes |
| 3 | Remote video and audio appear when `call.on('stream')` fires | VERIFIED | `useCall.ts:37-42` — stream handler sets `remoteStreamRef.current`; `CallView.tsx:27-33` assigns it to `video.srcObject`; remote `<video>` has no `muted` attribute |
| 4 | ConnectionStatus updates to Connected when remote stream arrives | VERIFIED | `useCall.ts:39` — `setConnectionState('connected')` called in stream handler; unit test "stream event: sets connectionState to connected" passes |
| 5 | When call ends, MeetingEnded screen appears | VERIFIED | `RoomPage.tsx:41-43` — `if (callEnded) return <MeetingEnded />`; RoomPage smoke test "renders MeetingEnded when callEnded is true" passes |
| 6 | MeetingEnded has New Meeting and Return Home options | VERIFIED | `MeetingEnded.tsx:26-29` — both buttons rendered; 6 MeetingEnded tests pass including navigation assertions |
| 7 | Join sound plays when remote peer connects | VERIFIED | `useCall.ts:41` — `playJoinSound()` called in stream handler; unit test asserts `playJoinSound` was called |
| 8 | Leave sound plays when peer disconnects | VERIFIED | `useCall.ts:26-27` — `playLeaveSound()` called in `handleRemoteHangUp` when `wasConnected=true`; unit test "close event after connection: plays leave sound" passes |
| 9 | Remote video element is NOT muted — remote audio plays through | VERIFIED | `CallView.tsx:38-43` — `<video>` element has `autoPlay` and `playsInline` only; no `muted` attribute present |
| 10 | ConnectionStatus badge visible in lobby with correct labels for all 5 states | VERIFIED | `ConnectionStatus.tsx:4-10` — `STATE_LABELS` Record covers all 5 values; `RoomPage.tsx:85` renders `<ConnectionStatus state={connectionState} />`; 5 ConnectionStatus tests pass |
| 11 | Store has callEnded, wasConnected, joined with reset clearing all three | VERIFIED | `store/index.ts:29-38` — all three fields present with defaults; `reset()` on line 38 sets all to false |
| 12 | Web Audio join/leave sounds synthesized via singleton AudioContext | VERIFIED | `sounds.ts:1-58` — singleton pattern, lazy init, `ensureResumed()` guard, ascending C5→G5 and descending G5→C5; 5 sounds tests pass |
| 13 | All 64 tests pass with zero regressions | VERIFIED | `npm test -- --run` output: 14 test files, 64 tests, all passed |

**Automated Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store/index.ts` | Extended CallStore with callEnded, wasConnected, joined + setters + reset | VERIFIED | All fields and setters present; reset() clears all three |
| `src/lib/sounds.ts` | playJoinSound and playLeaveSound exports | VERIFIED | Both functions exported; singleton AudioContext; resume guard |
| `src/components/ConnectionStatus.tsx` | Badge component mapping all 5 ConnectionState values | VERIFIED | Record-based mapping for labels and variants; renders shadcn Badge |
| `src/components/MeetingEnded.tsx` | Meeting ended screen with New Meeting and Return Home | VERIFIED | Both buttons present; reset() called before navigation; generateRoomId used |
| `src/hooks/useCall.ts` | useCall hook managing MediaConnection lifecycle | VERIFIED | Both joiner and creator paths; subscribeToCall shared helper; hangUp; ICE monitoring |
| `src/components/CallView.tsx` | Remote video (unmuted), self-view PiP, controls with hang-up | VERIFIED | data-testid="call-view"; remote video no muted; SelfViewOverlay; MediaControls; red Phone button |
| `src/pages/RoomPage.tsx` | State-machine rendering: callEnded → MeetingEnded, connected → CallView, else lobby | VERIFIED | Correct render order: callEnded check first, then connected, then lobby fallback |
| `src/pages/RoomPage.test.tsx` | Smoke tests for all three RoomPage rendering branches | VERIFIED | 4 tests: meeting-ended, call-view, lobby (not joined), lobby (joined/waiting) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useCall.ts` | `src/store/index.ts` | setConnectionState, setCallEnded, setWasConnected | WIRED | All three store calls present: line 39 (setConnectionState), line 40 (setWasConnected), line 44 (setCallEnded via handleRemoteHangUp), line 130 (setConnectionState in hangUp) |
| `src/hooks/useCall.ts` | `src/lib/sounds.ts` | playJoinSound on stream, playLeaveSound on close | WIRED | playJoinSound at line 41 (stream handler); playLeaveSound at line 27 (handleRemoteHangUp) |
| `src/pages/RoomPage.tsx` | `src/components/MeetingEnded.tsx` | conditional render when callEnded is true | WIRED | Lines 41-43: `if (callEnded) { return <MeetingEnded /> }` (two-line form, not single-line) |
| `src/pages/RoomPage.tsx` | `src/components/CallView.tsx` | conditional render when connectionState is connected | WIRED | Lines 45-55: `if (connectionState === 'connected') { return <CallView ... /> }` |
| `src/pages/RoomPage.tsx` | `src/components/ConnectionStatus.tsx` | status badge visible in lobby | WIRED | Line 85: `<ConnectionStatus state={connectionState} />` |
| `src/components/ConnectionStatus.tsx` | `src/types/index.ts` | ConnectionState type import | WIRED | Line 2: `import type { ConnectionState } from '@/types'` |
| `src/components/MeetingEnded.tsx` | `src/lib/room.ts` | generateRoomId for New Meeting | WIRED | Line 2: `import { generateRoomId } from '../lib/room'`; line 16: `setLocation(\`/room/${generateRoomId()}\`)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AV-01 | 03-02-PLAN | User can make a 1-on-1 video and audio call via WebRTC (PeerJS) | VERIFIED (automated) / NEEDS HUMAN (live call) | useCall hook implements full PeerJS MediaConnection lifecycle; joiner/creator paths tested; remote video unmuted; human verification required for live two-browser call |
| CONN-04 | 03-01-PLAN, 03-02-PLAN | User can see connection status (Connecting → Connected → Disconnected) | VERIFIED | ConnectionStatus component renders all 5 states correctly; wired into RoomPage lobby; store transitions tested in useCall tests |
| UX-02 | 03-01-PLAN, 03-02-PLAN | User sees a clear "Meeting Ended" screen when a call ends with options to create new or go home | VERIFIED | MeetingEnded component fully implemented; conditional render in RoomPage confirmed; navigation tests pass |
| UX-04 | 03-01-PLAN, 03-02-PLAN | User hears a sound notification when a peer joins or leaves | VERIFIED (automated) / NEEDS HUMAN (audio output) | playJoinSound/playLeaveSound wired in useCall; Web Audio API implementation substantive; audio output requires human verification |

No orphaned requirements — all four requirement IDs (AV-01, CONN-04, UX-02, UX-04) are claimed by the plans and matched to REQUIREMENTS.md entries. REQUIREMENTS.md traceability table confirms all four map to Phase 3.

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| — | — | — | No anti-patterns found. No TODOs, FIXMEs, placeholder returns, empty handlers, or stub implementations in any phase-3 file. |

### Human Verification Required

The automated checks confirm all code is substantive and correctly wired. The following behaviors require live two-browser testing because they depend on real WebRTC negotiation, live A/V streams, and cross-tab event propagation:

#### 1. Live two-browser video and audio call

**Test:** Open the same room URL in two browser tabs. Click "Join Meeting" in both.
**Expected:** Both tabs show CallView within ~15 seconds. Remote video is visible (not mirrored), remote audio is heard. A brief ascending tone plays on connection. ConnectionStatus shows "Connected" in the lobby before the call view appears.
**Why human:** WebRTC ICE negotiation, TURN relay fallback, and live MediaStream rendering cannot be verified without a real browser WebRTC stack.

#### 2. Remote hang-up via hang-up button

**Test:** While in a call, click the red Phone button in one tab.
**Expected:** The clicking tab exits. The other tab plays a descending leave sound and shows "Meeting Ended" with "New Meeting" and "Return Home" buttons.
**Why human:** The leave sound and MeetingEnded screen appear in response to ICE disconnect events that only fire in a live WebRTC session.

#### 3. Remote hang-up via tab close

**Test:** While in a call, close one browser tab (do not use the hang-up button).
**Expected:** The remaining tab detects the disconnect within a few seconds and shows the MeetingEnded screen.
**Why human:** Abrupt disconnect detection relies on `pc.oniceconnectionstatechange` firing with 'disconnected'/'failed' — this only occurs with a live ICE connection.

#### 4. Mic and camera toggle during a call

**Test:** While in a call, toggle mic and camera using the MediaControls in CallView.
**Expected:** The remote peer's audio/video reflects the toggle (muted mic = silence, disabled camera = black frame or freeze).
**Why human:** Track-level mute propagation over a live MediaConnection requires a real browser session.

#### 5. New Meeting navigation from MeetingEnded

**Test:** From the MeetingEnded screen, click "New Meeting".
**Expected:** App navigates to a new room URL (/room/meet-xxxxxx with a new unique ID) and shows the lobby. The MeetingEnded screen does NOT re-appear (store was reset before navigation).
**Why human:** Navigation + store reset race condition requires visual inspection to confirm no flash of MeetingEnded in the new room.

#### 6. Return Home navigation from MeetingEnded

**Test:** From the MeetingEnded screen, click "Return Home".
**Expected:** App navigates to the home page (/).
**Why human:** Navigation target requires visual confirmation.

---

## Summary

All 13 automated must-haves pass. The codebase correctly implements the full phase-3 feature set:

- **PeerJS call lifecycle:** `useCall` hook handles both creator (peer.on('call') with buffering) and joiner (peer.call()) paths. The split-effect pattern correctly gates call signaling behind the `joined` store flag. ICE state monitoring supplements `call.on('close')` for reliable remote disconnect detection.
- **State-machine rendering:** `RoomPage` checks `callEnded` first (prevents flash), then `connectionState === 'connected'`, then falls through to the lobby. All three branches have smoke test coverage.
- **Remote audio:** The `<video>` element in `CallView` has no `muted` attribute — remote audio will play through.
- **Sound notifications:** `playJoinSound` and `playLeaveSound` are substantive Web Audio API implementations with a singleton context, suspended-state resume guard, and correctly sequenced ascending/descending frequencies.
- **MeetingEnded navigation:** Store `reset()` is called synchronously before `setLocation()` in both handlers — prevents stale `callEnded: true` from triggering MeetingEnded in the new room.
- **Test suite:** 64 tests across 14 files, all passing, zero regressions.

The remaining human verification items are intrinsically untestable without a live two-browser WebRTC session. The implementation architecture strongly supports their success — the primary risk items (joiner fallback via `unavailable-id`, ICE disconnect detection, call buffering) were all implemented and human-verified during the phase execution per the SUMMARY.

---

_Verified: 2026-03-11T10:01:00Z_
_Verifier: Claude (gsd-verifier)_
