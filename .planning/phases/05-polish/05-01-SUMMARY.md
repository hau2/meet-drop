---
phase: 05-polish
plan: "01"
subsystem: ui-theme-selfview
tags: [theme, dark-mode, drag-drop, self-view, sessionStorage, pointer-events]
dependency_graph:
  requires: []
  provides: [useTheme, ThemeToggle, SelfViewOverlay-draggable]
  affects: [src/App.tsx, src/main.tsx, src/components/SelfViewOverlay.tsx]
tech_stack:
  added: [lucide-react/Sun, lucide-react/Moon]
  patterns: [useRef-for-event-guards, MouseEvent-dispatch-for-pointer-tests, lastPointerRef-fallback, synchronous-DOM-init-before-React-mount]
key_files:
  created:
    - src/hooks/useTheme.ts
    - src/hooks/useTheme.test.ts
    - src/components/ThemeToggle.tsx
  modified:
    - src/main.tsx
    - src/App.tsx
    - src/components/SelfViewOverlay.tsx
    - src/components/SelfViewOverlay.test.tsx
decisions:
  - "useLayoutEffect syncs isDark state from DOM classList on mount — avoids hydration mismatch"
  - "isDraggingRef (not state) used as drag guard in pointer handlers — prevents stale closure where pointerMove/Up see old isDragging=false before re-render"
  - "lastPointerRef tracks position in pointerMove for reliable snap — jsdom MouseEvent-based dispatch provides clientX/Y; real pointer events also work"
  - "SelfViewOverlay uses top-20 instead of top-4 for tr/tl corners — avoids z-index overlap with ThemeToggle fixed at top-4 right-4"
  - "Test dispatch uses new MouseEvent('pointerX', {clientX, clientY}) not fireEvent.pointerDown — jsdom PointerEvent does not support clientX/Y init"
metrics:
  duration_minutes: 7
  completed_date: "2026-03-11"
  tasks_completed: 2
  files_changed: 7
---

# Phase 5 Plan 01: Dark/Light Theme Toggle and Draggable Self-View Summary

**One-liner:** Dark theme default with sessionStorage persistence via useTheme hook; SelfViewOverlay with pointer-event drag-to-corner snap using ref-based drag guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useTheme hook, ThemeToggle, theme init | bb1db8b | src/hooks/useTheme.ts, useTheme.test.ts, ThemeToggle.tsx, main.tsx, App.tsx |
| 2 | Draggable corner-snap SelfViewOverlay | dc9a196 | SelfViewOverlay.tsx, SelfViewOverlay.test.tsx |

## What Was Built

### Task 1: Theme System

- `src/main.tsx`: Synchronous `sessionStorage.getItem('theme')` check BEFORE `createRoot()` — adds/removes `dark` class on `document.documentElement` to prevent flash of wrong theme
- `src/hooks/useTheme.ts`: Hook returning `{ isDark, toggleTheme }`. Uses `useLayoutEffect` to sync with DOM on mount, toggles classList and sessionStorage atomically
- `src/components/ThemeToggle.tsx`: Ghost icon button showing Moon (dark) or Sun (light) from lucide-react, calls `toggleTheme()` on click
- `src/App.tsx`: ThemeToggle mounted as `fixed top-4 right-4 z-50` outside Router so it's visible on all pages

### Task 2: Draggable SelfViewOverlay

- `src/components/SelfViewOverlay.tsx`: Corner-snap drag with `onPointerDown/Move/Up` handlers
  - `isDraggingRef` (useRef) used as drag guard — avoids stale closure bug where state update from pointerDown isn't visible in pointerMove handler before re-render
  - `lastPointerRef` tracks last pointer position in pointerMove for reliable snap calculation in pointerUp
  - Corner snap: compares pointer position to parent container midpoints to determine nearest corner (tl/tr/bl/br)
  - `top-20` used for tr/tl corners to avoid overlapping the ThemeToggle button
  - `data-testid="self-view-overlay"` added for reliable test selection

## Test Results

```
src/hooks/useTheme.test.ts          4 passed
src/components/SelfViewOverlay.test.tsx  5 passed (including 3 new drag/snap tests)
Total new tests: 9 passed
```

Pre-existing failures in `useChat.test.ts` (9 tests) and `usePeer.test.ts` (1 test) are unrelated to this plan and were present before any changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] jsdom PointerEvent does not support clientX/Y via fireEvent**
- **Found during:** Task 2 (TDD GREEN phase)
- **Issue:** `fireEvent.pointerDown/Move/Up` from `@testing-library/react` dispatches pointer events but jsdom's PointerEvent implementation does not accept `clientX`/`clientY` in the event init, so handlers received `undefined` for coordinates
- **Fix:** Updated tests to use `new MouseEvent('pointer{type}', { clientX, clientY, bubbles: true })` dispatched via `el.dispatchEvent()` — jsdom MouseEvent supports coordinate init and React pointer event handlers receive it correctly
- **Files modified:** src/components/SelfViewOverlay.test.tsx
- **Commit:** dc9a196

**2. [Rule 1 - Bug] Stale isDragging state in pointer event handlers**
- **Found during:** Task 2 (TDD GREEN phase)
- **Issue:** `handlePointerMove` guarded by `if (!isDragging) return` (React state) — the state update from `setIsDragging(true)` in pointerDown had not re-rendered before pointerMove fired, so the guard always saw `false` and rejected the move
- **Fix:** Added `isDraggingRef` (useRef) updated synchronously alongside `setIsDragging` state — handlers use the ref for the guard condition, state used only for cursor class rendering
- **Files modified:** src/components/SelfViewOverlay.tsx
- **Commit:** dc9a196

## Self-Check: PASSED
