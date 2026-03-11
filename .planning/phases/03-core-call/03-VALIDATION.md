---
phase: 3
slug: core-call
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vite.config.ts` — `test` section with `environment: 'jsdom'`, `globals: true` |
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
| 3-01-01 | 01 | 0 | AV-01 | unit | `npm test -- --run src/hooks/useCall.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | CONN-04 | unit | `npm test -- --run src/components/ConnectionStatus.test.tsx` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | UX-02 | unit | `npm test -- --run src/components/MeetingEnded.test.tsx` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 0 | UX-02 | smoke | `npm test -- --run src/pages/RoomPage.test.tsx` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 0 | UX-04 | unit | `npm test -- --run src/lib/sounds.test.ts` | ❌ W0 | ⬜ pending |
| 3-xx-xx | xx | x | AV-01 | unit | `npm test -- --run src/hooks/useCall.test.ts` | ❌ W0 | ⬜ pending |
| 3-xx-xx | xx | x | CONN-04 | unit | `npm test -- --run src/components/ConnectionStatus.test.tsx` | ❌ W0 | ⬜ pending |
| 3-xx-xx | xx | x | UX-02 | unit | `npm test -- --run src/components/MeetingEnded.test.tsx` | ❌ W0 | ⬜ pending |
| 3-xx-xx | xx | x | UX-04 | unit | `npm test -- --run src/lib/sounds.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/useCall.test.ts` — stubs for AV-01 caller/answerer paths, stream event, close event
- [ ] `src/components/ConnectionStatus.test.tsx` — stubs for CONN-04 badge labels
- [ ] `src/components/MeetingEnded.test.tsx` — stubs for UX-02 render, navigation
- [ ] `src/pages/RoomPage.test.tsx` — stubs for UX-02 conditional MeetingEnded render
- [ ] `src/lib/sounds.test.ts` — stubs for UX-04 AudioContext/oscillator creation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Two-browser e2e: remote video appears within 15s | AV-01 | WebRTC ICE negotiation requires real browsers | Open two tabs on same room URL, verify video within 15s |
| Closing one tab shows "Meeting Ended" on other | UX-02 | Tab close event + PeerJS close event requires real browsers | Open two tabs, close one, observe other |
| Join and leave sounds play audibly | UX-04 | Audio output requires human verification | Listen during manual test session |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
