---
phase: 2
slug: media-lobby
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 2 — Validation Strategy

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
| 02-01-01 | 01 | 0 | AV-02, AV-03, AV-04 | unit | `npm test -- --run src/hooks/useMedia.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | AV-04 | unit | `npm test -- --run src/components/VideoPreview.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | CONN-03 | unit | `npm test -- --run src/components/CopyLinkButton.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | AV-05 | unit | `npm test -- --run src/components/SelfViewOverlay.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 0 | CONN-02 | unit | `npm test -- --run src/pages/HomePage.test.tsx` | ❌ W0 | ⬜ pending |
| 02-xx-xx | xx | 1 | CONN-01 | unit | `npm test -- --run src/lib/room.test.ts` | ✅ | ⬜ pending |
| 02-xx-xx | xx | 1 | CONN-02 | smoke | `npm test -- --run src/App.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/useMedia.test.ts` — stubs for AV-02, AV-03, AV-04 (mount/unmount lifecycle, toggle behaviors)
- [ ] `src/components/VideoPreview.test.tsx` — stubs for AV-04 srcObject assignment via ref
- [ ] `src/components/CopyLinkButton.test.tsx` — stubs for CONN-03 clipboard call
- [ ] `src/components/SelfViewOverlay.test.tsx` — stubs for AV-05 mirror class presence
- [ ] `src/pages/HomePage.test.tsx` — stubs for CONN-02 manual join input parsing

*Mock setup required: `navigator.mediaDevices.getUserMedia` and `navigator.clipboard.writeText` in jsdom environment.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lobby responsive at 375px and 1280px | UX-01 | Vitest/jsdom cannot render at actual pixel dimensions | Chrome DevTools Device emulation — verify no horizontal scroll at 375px and 1280px widths |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
