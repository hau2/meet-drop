---
phase: 4
slug: encrypted-chat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vite.config.ts` (test.environment: 'jsdom', test.globals: true) |
| **Quick run command** | `npx vitest run src/lib/crypto.test.ts src/hooks/useChat.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/crypto.test.ts src/hooks/useChat.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CHAT-01 | unit | `npx vitest run src/lib/crypto.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CHAT-01 | unit | `npx vitest run src/lib/crypto.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CHAT-01 | unit | `npx vitest run src/lib/crypto.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | CHAT-01 | unit | `npx vitest run src/lib/crypto.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | CHAT-01 | unit | `npx vitest run src/hooks/useChat.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | CHAT-01 | unit | `npx vitest run src/hooks/useChat.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | CHAT-01 | unit | `npx vitest run src/components/ChatPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | CHAT-01 | unit | `npx vitest run src/hooks/useChat.test.ts` | ❌ W0 | ⬜ pending |
| 04-manual-01 | — | — | CHAT-01 | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/setup.ts` update — add Node crypto polyfill for SubtleCrypto in jsdom
- [ ] `src/lib/crypto.test.ts` — stubs for ECDH keygen, export/import, deriveKey, encrypt/decrypt roundtrip, unique IV
- [ ] `src/hooks/useChat.test.ts` — stubs for DataChannel lifecycle, key exchange, message send/receive
- [ ] `src/components/ChatPanel.test.tsx` — stubs for render, send button, message list

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No plaintext in wire format | CHAT-01 | Requires two-browser smoke test with DevTools Network tab | Open two browsers, join same room, send message, verify Network tab shows no plaintext in DataChannel frames |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
