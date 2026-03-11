---
phase: 5
slug: polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + Testing Library React 16.x |
| **Config file** | `vite.config.ts` — `test.environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | AV-06 | unit | `npx vitest run src/hooks/useScreenShare.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | AV-06 | unit | `npx vitest run src/hooks/useScreenShare.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | AV-07 | unit | `npx vitest run src/components/CallView.test.tsx` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | AV-07 | unit | `npx vitest run src/components/CallView.test.tsx` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | AV-08 | unit | `npx vitest run src/components/SelfViewOverlay.test.tsx` | ✅ extend | ⬜ pending |
| 05-02-02 | 02 | 1 | UX-03 | unit | `npx vitest run src/hooks/useTheme.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | UX-03 | unit | `npx vitest run src/hooks/useTheme.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-04 | 02 | 1 | UX-05 | unit | `npx vitest run src/hooks/useNetworkQuality.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-05 | 02 | 1 | UX-05 | unit | `npx vitest run src/components/NetworkQualityBadge.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/useScreenShare.test.ts` — stubs for AV-06 (screen share start/stop, OS stop button)
- [ ] `src/components/CallView.test.tsx` — stubs for AV-07 (fullscreen toggle, state sync)
- [ ] `src/hooks/useTheme.test.ts` — stubs for UX-03 (default dark, toggle, sessionStorage)
- [ ] `src/hooks/useNetworkQuality.test.ts` — stubs for UX-05 (quality computation)
- [ ] `src/components/NetworkQualityBadge.test.tsx` — stubs for UX-05 (badge rendering)

**jsdom mocking notes:**
- `requestFullscreen` not in jsdom — mock: `vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockResolvedValue(undefined)`
- `getDisplayMedia` not in jsdom — mock on `navigator.mediaDevices`
- `RTCPeerConnection.getStats()` not in jsdom — mock fabricated `RTCStatsReport`
- `sessionStorage` IS available in jsdom — no mock needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OS "Stop Sharing" button restores camera | AV-06 | Requires real OS screen-share dialog | 1. Start screen share 2. Click OS stop button 3. Verify camera restores |
| Drag self-view overlay across corners | AV-08 | Requires real pointer events in browser | 1. Start call 2. Drag self-view to each corner 3. Verify it snaps |
| Network quality badge updates live | UX-05 | Requires real WebRTC connection | 1. Start call 2. Observe badge 3. Throttle network, verify badge changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
