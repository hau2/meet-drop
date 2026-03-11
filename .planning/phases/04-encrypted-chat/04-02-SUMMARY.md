---
phase: 04-encrypted-chat
plan: 02
subsystem: ui
tags: [react, zustand, lucide-react, vitest, shadcn, chat, webcrypto]

# Dependency graph
requires:
  - phase: 04-encrypted-chat/04-01
    provides: useChat hook (sendMessage, isReady), useCallStore with messages/isChatOpen/addMessage/setChatOpen, ChatMessage type
  - phase: 03-core-call
    provides: CallView component, RoomPage page, useCallStore, PeerJS pattern
provides:
  - ChatPanel component with message bubbles, auto-scroll, 500-char input, close button
  - CallView updated with MessageSquare chat toggle button and unread indicator dot
  - RoomPage wired to useChat — sendMessage and isReady passed to CallView
affects: [human-verification, future-phases-using-chat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fixed-position side panel overlay (right-0 top-0 h-full w-80 z-30) for chat UI
    - Unread indicator via ref manipulation (display:none/block) to avoid re-renders
    - Store-driven panel open/close state via isChatOpen + setChatOpen from useCallStore
    - Auto-scroll via scrollRef.current.scrollTop = scrollRef.current.scrollHeight in useEffect([messages.length])

key-files:
  created:
    - src/components/ChatPanel.tsx
    - src/components/ChatPanel.test.tsx
  modified:
    - src/components/CallView.tsx
    - src/pages/RoomPage.tsx
    - src/hooks/useChat.ts

key-decisions:
  - "Unread indicator uses DOM ref (unreadDotRef.style.display) not state to avoid re-render on every new message"
  - "ScrollArea from shadcn not available — plain div with overflow-y-auto used instead for message list"
  - "ChatPanel receives onSend: (text: string) => void (not Promise<void>) to keep component synchronous; RoomPage wraps async sendMessage"
  - "Duplicate DataConnection handler bug (React Strict Mode double-mount) fixed by removing listeners in useEffect cleanup"

patterns-established:
  - "Pattern: Store-driven sidebar panel — isChatOpen controls visibility, setChatOpen called from toggle button and close button"
  - "Pattern: Unread counter via ref not state — avoids extra renders in video call hot path"

requirements-completed: [CHAT-01]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 04 Plan 02: ChatPanel UI and CallView Integration Summary

**ChatPanel with You/Them message bubbles, auto-scroll, unread dot, and end-to-end AES-GCM encrypted chat wired into RoomPage — verified across two live browsers, CHAT-01 complete**

## Performance

- **Duration:** ~15 min (including human verification and post-verification bug fix)
- **Started:** 2026-03-11T03:41:15Z
- **Completed:** 2026-03-11T04:00:00Z
- **Tasks:** 2 of 2 (Task 1 auto + Task 2 human-verify — APPROVED)
- **Files modified:** 5

## Accomplishments
- ChatPanel component with local/remote message bubbles (You/Them labels), auto-scroll to newest message, 500-char max input, Enter-to-send, close button
- CallView updated with MessageSquare chat toggle button; unread indicator dot appears on button when remote messages arrive while panel is closed
- ChatPanel rendered as fixed overlay on right side when isChatOpen is true (controlled via useCallStore)
- RoomPage wires useChat(peerRef, id) and passes sendMessage/isChatReady to CallView
- Post-verification bug fix: React Strict Mode caused duplicate DataConnection handlers — fixed with useEffect cleanup removing listener before re-registration
- Full test suite: 104 tests across 17 files, all green
- Human verification APPROVED: two-browser test confirmed send/receive, bubble labels, unread dot, and no persistence after tab close

## Task Commits

Each task was committed atomically:

1. **Task 1: ChatPanel component, CallView chat toggle, RoomPage useChat wiring** - `a2580f7` (feat)
2. **Post-checkpoint bug fix: prevent duplicate DataConnection handlers in useChat** - `ac29f56` (fix)
3. **Task 2: Human verification** - APPROVED (no commit — verification checkpoint)

**Plan metadata:** (this SUMMARY docs commit)

## Files Created/Modified
- `src/components/ChatPanel.tsx` - Chat panel UI: message list, input area, auto-scroll, close button (110 lines)
- `src/components/ChatPanel.test.tsx` - 12 render/interaction tests covering labels, send, clear, disabled states, close
- `src/components/CallView.tsx` - Added sendMessage/isChatReady props, MessageSquare toggle button, unread dot, ChatPanel conditional render
- `src/pages/RoomPage.tsx` - Added useChat import and call, passes sendMessage and isReady to CallView
- `src/hooks/useChat.ts` - Added useEffect cleanup to remove DataConnection `data` listener before re-registration (React Strict Mode fix)

## Decisions Made
- **Plain div for scroll area:** shadcn ScrollArea not installed — used a plain `<div ref={scrollRef} className="overflow-y-auto">` with `scrollTop = scrollHeight` in useEffect. Same behavior, zero dependency.
- **Unread indicator via DOM ref:** Incrementing a ref and toggling `display` on an `<span>` avoids state that would trigger re-renders on every incoming message during the call video hot path.
- **onSend typed as `(text: string) => void`:** ChatPanel is synchronous — it calls onSend and clears input immediately. The async send (encryptMessage + DataConnection.send) happens inside RoomPage's sendMessage. This keeps ChatPanel pure and easier to test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate DataConnection event handlers in React Strict Mode**
- **Found during:** Task 2 (human verification) — user saw duplicate messages (sent "Hello bro", received both "Hello bro" and "bro")
- **Issue:** React Strict Mode's double-mount caused the `data` event handler in useChat to be registered twice on the DataConnection. Each received message fired the handler twice; the second invocation had stale closure state producing a truncated string
- **Fix:** Added cleanup return in the useChat useEffect that calls `conn.off('data', handler)` before the effect re-runs or the component unmounts
- **Files modified:** `src/hooks/useChat.ts`
- **Verification:** User re-tested in two browsers post-fix: "ok, good now. Approved"
- **Committed in:** `ac29f56`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Fix was required for correctness. No scope creep.

## Issues Encountered

- Duplicate message bug discovered during human verification — see Deviations section above. Resolved with a single useEffect cleanup addition.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 complete: CHAT-01 requirement satisfied and human-verified
- Encrypted chat (ECDH + AES-GCM) and ChatPanel UI are production-ready within the dev environment
- Phase 5 (polish / final UX) can begin immediately — no blockers

---
*Phase: 04-encrypted-chat*
*Completed: 2026-03-11*
