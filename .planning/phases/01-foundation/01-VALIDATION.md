---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) |
| **Config file** | `vite.config.ts` — `test` section with `environment: 'jsdom'` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | PRIV-01 | unit | `npm test -- --run src/lib/room.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | PRIV-01 | unit | `npm test -- --run src/store/index.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | SC-1 | smoke | `npm test -- --run src/App.test.tsx` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 0 | SC-5 | unit | `npm test -- --run src/hooks/usePeer.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/setup.ts` — jsdom + jest-dom setup file
- [ ] `src/lib/room.test.ts` — covers `generateRoomId()` format, uniqueness, and entropy
- [ ] `src/store/index.test.ts` — asserts Zustand store writes do not appear in localStorage
- [ ] `src/App.test.tsx` — routing smoke test for `/` and `/room/:id`
- [ ] `src/hooks/usePeer.test.ts` — Strict Mode guard test (mock PeerJS constructor, verify single call)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ICE connection via TURN on restricted network | SC-4 | Requires real network with blocked P2P (mobile hotspot) | Connect from mobile hotspot, verify ICE candidate pair uses relay |
| Tab close leaves no storage trace | SC-2 | Requires real browser tab close event | Open DevTools > Application, close tab, reopen, verify empty localStorage/sessionStorage/IndexedDB/cookies |
| PeerJS signaling server accepts connections | SC-3 | Requires deployed Railway server | Open browser console, verify Peer connects without error to self-hosted server |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
