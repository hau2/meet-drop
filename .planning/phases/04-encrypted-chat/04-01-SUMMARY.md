---
phase: 04-encrypted-chat
plan: 01
subsystem: crypto
tags: [webcrypto, ecdh, aes-gcm, peerjs, datachannel, zustand, vitest]

# Dependency graph
requires:
  - phase: 03-core-call
    provides: useCall hook, PeerJS peer/connection pattern, useCallStore with peerId
provides:
  - ECDH P-256 keygen, SPKI export/import, AES-GCM-256 encrypt/decrypt via lib/crypto.ts
  - useChat hook managing DataConnection lifecycle, ECDH handshake, encrypted send/receive
  - ChatMessage type in types/index.ts
  - useCallStore extended with messages[], isChatOpen, addMessage, setChatOpen
affects: [04-02-chat-ui, future-phases-using-chat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ECDH handshake over PeerJS DataConnection (key-exchange → derive → flush pending)
    - Pitfall 1 guard: check conn.open after registering open listener
    - Pitfall 6 guard: gate on peerId from store, not peerRef.current, to avoid race condition
    - Uint8Array (not ArrayBuffer) for Node webcrypto polyfill compatibility in jsdom tests
    - vi.clearAllMocks() + re-set mockResolvedValue in beforeEach for stable crypto mocks

key-files:
  created:
    - src/lib/crypto.ts
    - src/lib/crypto.test.ts
    - src/hooks/useChat.ts
    - src/hooks/useChat.test.ts
  modified:
    - src/types/index.ts
    - src/store/index.ts
    - src/store/index.test.ts
    - src/test/setup.ts

key-decisions:
  - "Uint8Array passed directly to subtle.importKey (not .buffer) — avoids jsdom/Node realm mismatch where Uint8Array.from().buffer is a jsdom-realm ArrayBuffer rejected by Node webcrypto"
  - "Node webcrypto polyfill in setup.ts added BEFORE jest-dom import to ensure globalThis.crypto is set before any test code runs"
  - "vi.clearAllMocks() clears mockResolvedValue implementations — must re-set crypto mock return values in beforeEach after clearAllMocks"
  - "useChat effect depends on peerId from store (Pitfall 6) — ensures peer.open is true before connecting"

patterns-established:
  - "Pattern: captureHandlers() helper captures event listeners registered via .on() for synchronous handler testing"
  - "Pattern: crypto functions use loop-based Uint8Array construction (not Uint8Array.from) for jsdom compatibility"

requirements-completed: [CHAT-01]

# Metrics
duration: 4min
completed: 2026-03-11
---

# Phase 04 Plan 01: Encrypted Chat Foundation Summary

**ECDH P-256 key exchange over PeerJS DataChannel with AES-GCM-256 message encryption — crypto module, useChat hook, store extension, 28 new tests all green**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T03:33:42Z
- **Completed:** 2026-03-11T03:38:40Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Crypto library (`src/lib/crypto.ts`) with 6 exports: ECDH keygen, SPKI export/import, AES-GCM-256 encrypt/decrypt — exercises real SubtleCrypto via Node webcrypto polyfill in 9 tests
- useChat hook manages full DataChannel lifecycle: joiner/creator symmetry, ECDH handshake, encrypted send/receive, pending message queue flush after key derivation
- Store extended with `messages[]`, `isChatOpen`, `addMessage`, `setChatOpen` — PRIV-01 compliant (no localStorage)
- `ChatMessage` type added to types/index.ts
- Full suite: 92 tests pass across 16 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Crypto module, types, store extension, and test setup** - `8963428` (feat)
2. **Task 2: useChat hook with DataChannel lifecycle and ECDH handshake** - `783b1e9` (feat)

_Note: TDD tasks had RED (failing tests first) then GREEN (implementation) within each commit_

## Files Created/Modified
- `src/lib/crypto.ts` - ECDH keygen, SPKI export/import, AES-GCM-256 encrypt/decrypt (6 exports)
- `src/lib/crypto.test.ts` - 9 tests exercising real SubtleCrypto via Node polyfill
- `src/hooks/useChat.ts` - DataChannel lifecycle, ECDH handshake, encrypted send/receive, pending queue
- `src/hooks/useChat.test.ts` - 11 unit tests with mocked crypto and PeerJS DataConnection
- `src/types/index.ts` - Added ChatMessage interface
- `src/store/index.ts` - Extended CallStore with messages, isChatOpen, addMessage, setChatOpen, updated reset()
- `src/store/index.test.ts` - Added 8 new tests for chat state fields
- `src/test/setup.ts` - Added Node webcrypto polyfill before jest-dom import

## Decisions Made
- **Uint8Array instead of ArrayBuffer for importKey:** In the jsdom/Vitest environment, `Uint8Array.from(atob(...)).buffer` is a jsdom-realm ArrayBuffer that Node's webcrypto rejects. Passing a `Uint8Array` directly (built with a loop) works because Node crypto accepts Uint8Array. This is the correct cross-environment pattern.
- **Polyfill placement:** Node webcrypto polyfill must come BEFORE `@testing-library/jest-dom` import in setup.ts to ensure `globalThis.crypto` is set during module initialization.
- **Mock re-set pattern:** `vi.clearAllMocks()` clears `mockResolvedValue` implementations. Crypto mock return values must be re-set in `beforeEach` after clearing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ArrayBuffer realm mismatch for importPublicKey in jsdom tests**
- **Found during:** Task 1 (Crypto module)
- **Issue:** `subtle.importKey('spki', binaryUint8.buffer, ...)` failed with `ERR_INVALID_ARG_TYPE` — `new ArrayBuffer()` in jsdom realm is rejected by Node webcrypto polyfill
- **Fix:** Changed to pass `Uint8Array` directly (built with a `for` loop) instead of its `.buffer` property; also applied same fix to `decryptMessage`. Changed `importPublicKey` to build the buffer with `new ArrayBuffer()` + loop, then passed the `Uint8Array` view directly.
- **Files modified:** src/lib/crypto.ts
- **Verification:** All 9 crypto tests pass including the previously failing importPublicKey roundtrip test
- **Committed in:** 8963428 (Task 1 commit)

**2. [Rule 1 - Bug] Re-set crypto mock return values after vi.clearAllMocks() in test beforeEach**
- **Found during:** Task 2 (useChat hook tests)
- **Issue:** `vi.clearAllMocks()` in beforeEach cleared the `mockResolvedValue` implementations set in `vi.mock()` factory, causing `generateKeyPair()` to return `undefined` and crashing the hook
- **Fix:** Added explicit `vi.mocked(fn).mockResolvedValue(...)` calls in beforeEach after `vi.clearAllMocks()`
- **Files modified:** src/hooks/useChat.test.ts
- **Verification:** All 11 useChat tests pass
- **Committed in:** 783b1e9 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs)
**Impact on plan:** Both auto-fixes necessary for test correctness — no scope creep, implementation logic unchanged.

## Issues Encountered
- jsdom/Node webcrypto realm isolation causes ArrayBuffer instanceof check failures — resolved by using Uint8Array directly

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Crypto module and useChat hook ready for Plan 02 (ChatPanel UI)
- `useChat(peerRef, roomId)` returns `{ sendMessage, isReady }` — integrate into RoomPage/CallView
- Store has `messages[]`, `isChatOpen`, `addMessage`, `setChatOpen` ready for ChatPanel to consume

---
*Phase: 04-encrypted-chat*
*Completed: 2026-03-11*
