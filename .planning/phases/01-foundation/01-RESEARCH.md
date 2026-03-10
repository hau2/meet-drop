# Phase 1: Foundation - Research

**Researched:** 2026-03-11
**Domain:** React/Vite/TypeScript project scaffold + self-hosted PeerJS signaling + TURN server + zero-persistence architecture
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRIV-01 | All session data is destroyed when the tab closes — zero persistence | sessionStorage (auto-cleared on tab close) is the correct storage primitive. Never use localStorage for any session state. Zero-write strategy: store all runtime state in React memory (Zustand) only. `beforeunload` event destroys PeerJS Peer and stops MediaStream tracks. Verified via MDN and browser storage specs. |
</phase_requirements>

---

## Summary

Phase 1 lays the only foundation that matters: correct architectural decisions that cannot be cheaply retrofitted later. Three infrastructure choices must be locked in before any feature work — the self-hosted PeerJS signaling server, the TURN server credentials, and the React/PeerJS Strict Mode integration pattern. Getting any of these wrong after Phase 3 is expensive: TURN is required to validate that calls work across real networks, self-hosted signaling is required to avoid the documented reliability failures of the free PeerJS cloud, and the Strict Mode guard pattern must be in place before any `Peer` instance is created.

The zero-persistence requirement (PRIV-01) is an architectural constraint, not a feature. The correct implementation is to never write to localStorage, never write to IndexedDB, never set cookies, and use in-memory React state (Zustand) for all session data. sessionStorage may be used if needed since it is tab-scoped and auto-clears. The `beforeunload` handler destroys the PeerJS Peer instance and stops all MediaStream tracks to ensure the remote peer receives a clean disconnect signal.

TURN provider choice is now resolved: Cloudflare TURN (Realtime) provides a 1,000 GB free tier, globally distributed infrastructure, and short-lived credential generation via a REST API. Metered Open Relay is the fallback at 20 GB/month free. PeerJS self-hosting platform is also resolved: Railway is the recommended choice because it has no sleep/cold-start behavior on the Hobby plan ($5/month) and its trial credits cover initial deployment. Render's free tier sleeps after 15 minutes of inactivity — unacceptable for a signaling server where first-connection latency is user-visible.

**Primary recommendation:** Scaffold the Vite + React + TypeScript project, configure Tailwind v4 and wouter, deploy `peerjs-server` on Railway, configure Cloudflare TURN credentials in the PeerJS constructor, and set the `useRef` + Strict Mode guard pattern before writing a single line of feature code.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI framework | Concurrent features, `useRef`+`useEffect` lifecycle maps cleanly to WebRTC stream lifecycle. Strict Mode double-invocation surfaces missing cleanup before it becomes a production bug. |
| Vite | 7.3.1 | Build tool + dev server | Fastest HMR. Native ESM. Static `dist/` deploys to GitHub Pages. Baseline browser target aligns with WebRTC support matrix. |
| TypeScript | 5.x | Type safety | WebRTC APIs (`RTCPeerConnection`, `MediaStream`, `MediaStreamTrack`) have complex generic types. Strict mode catches stale closure bugs in async signaling callbacks. |
| Tailwind CSS | 4.2.1 | Styling | Vite plugin (`@tailwindcss/vite`), zero PostCSS config, native CSS variables for dark/light theming. One `@import "tailwindcss"` line in index.css. |
| PeerJS | 1.5.5 | WebRTC abstraction | Wraps `RTCPeerConnection` + STUN/ICE. `MediaConnection` for video/audio, `DataConnection` for chat. Actively maintained (Jun 2025). |
| wouter | 3.9.0 | Client-side routing | Hash-based routing compatible with GitHub Pages static hosting. 2.2 KB vs React Router's ~19 KB. Covers the two routes needed: `/` and `/room/:id`. |
| Zustand | 5.0.11 | State management | Per-slice subscriptions — only subscribed components re-render on relevant state changes. Critical for video UI where media toggles fire frequently. No boilerplate. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.1.6 | Room ID generation | `customAlphabet` produces the `meet-xxxxxx` format (6 alphanumeric chars). Web Crypto-backed. ESM-only — import only, never `require`. |
| clsx + tailwind-merge | 2.x / 3.5.0 | Conditional CSS classes | Standard `cn()` utility for all conditional Tailwind classes. Required for reusable Button, IconButton components to avoid class conflicts. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@tailwindcss/vite` | Tailwind v4 Vite plugin | Required for v4. Add to `plugins` array in `vite.config.ts`. Do NOT use PostCSS setup. |
| `@vitejs/plugin-react` | React Fast Refresh + JSX | v5.1.4, SWC-based. Enables HMR. |
| Vitest | Latest | Unit testing | Vite-native, reuses Vite config, Jest-compatible API, jsdom environment for DOM tests. |
| `@testing-library/react` | Latest | Component testing | Pairs with Vitest for testing React hooks and components. |
| ESLint + `eslint-plugin-react-hooks` | Latest | Hook linting | Catches missing `useEffect` dependencies — critical when managing PeerJS event subscriptions. |
| `peer` (npm) | Latest | peerjs-server CLI | Self-hosted signaling server. Deploy on Railway. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cloudflare TURN | Metered.ca Open Relay | Metered Open Relay: 20 GB/month free, no account needed for static credentials. Cloudflare: 1,000 GB free tier, short-lived credentials via REST API, better for production. Use Cloudflare. |
| Railway (peerjs-server hosting) | Render, Fly.io | Render free tier sleeps after 15 min inactivity (fatal for signaling). Fly.io has cold starts on inactive machines. Railway Hobby ($5/mo) is always-on with no sleep. |
| wouter | React Router v7 | React Router if you need loaders, nested layouts, or SSR. Overkill for two static routes on GitHub Pages. |
| Zustand | React Context | Context re-renders all consumers; unacceptable for video UI where mic/camera state changes constantly. |

**Installation:**

```bash
# Scaffold
npm create vite@latest meet-drop -- --template react-ts
cd meet-drop

# Runtime dependencies
npm install react react-dom
npm install peerjs wouter zustand nanoid
npm install clsx tailwind-merge

# Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Dev tools
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D eslint eslint-plugin-react-hooks prettier
npm install -D gh-pages
```

---

## Architecture Patterns

### Recommended Project Structure

```
meet-drop/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx          # Room creation entry point
│   │   └── RoomPage.tsx          # Active call shell (Phase 3+)
│   ├── components/               # Pure UI components
│   ├── hooks/
│   │   ├── usePeer.ts            # PeerJS Peer lifecycle (skeleton in Phase 1)
│   │   └── useRoom.ts            # Room ID generation + URL parsing
│   ├── lib/
│   │   └── room.ts               # Room ID generation (nanoid customAlphabet)
│   ├── store/
│   │   └── index.ts              # Zustand store — call state, peer ID
│   ├── types/
│   │   └── index.ts              # ConnectionState, shared types
│   ├── App.tsx                   # Router setup (wouter)
│   ├── main.tsx                  # Vite entry point
│   └── index.css                 # @import "tailwindcss"
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Pattern 1: Vite Config for GitHub Pages + Tailwind v4

**What:** Minimal `vite.config.ts` with `base` set for GitHub Pages sub-path and both plugins registered.
**When to use:** Always — this is the correct baseline config for this project.

```typescript
// Source: Vite docs https://vite.dev/guide/static-deploy#github-pages
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/meet-drop/',      // required for GitHub Pages sub-path deployment
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```css
/* src/index.css — Tailwind v4 entry */
@import "tailwindcss";
```

### Pattern 2: Ref-Stable PeerJS with React Strict Mode Guard

**What:** Store `Peer` in `useRef`. Guard `useEffect` against Strict Mode's double-invocation. Destroy in cleanup.
**When to use:** Always — must be in place before the first `new Peer()` call.

```typescript
// Source: React docs + PeerJS GitHub issue #1157
import { useEffect, useRef } from 'react'
import Peer from 'peerjs'

const ICE_SERVERS = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:turn.cloudflare.com:3478?transport=udp',
      'turn:turn.cloudflare.com:3478?transport=tcp',
      'turns:turn.cloudflare.com:5349?transport=tcp',
    ],
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  },
]

export function usePeer(roomId: string) {
  const peerRef = useRef<Peer | null>(null)

  useEffect(() => {
    if (peerRef.current) return   // Strict Mode guard: skip second invocation

    const peer = new Peer(roomId, {
      host: import.meta.env.VITE_PEERJS_HOST,
      port: Number(import.meta.env.VITE_PEERJS_PORT),
      path: import.meta.env.VITE_PEERJS_PATH,
      secure: true,
      config: { iceServers: ICE_SERVERS },
    })

    peerRef.current = peer

    return () => {
      peer.destroy()
      peerRef.current = null
    }
  }, [roomId])

  return { peerRef }
}
```

### Pattern 3: Zero-Persistence Architecture

**What:** All session data lives in React memory (Zustand). sessionStorage is tab-scoped and auto-clears; localStorage is never used. The `beforeunload` handler is the safety net for cleanup.
**When to use:** Always — this is PRIV-01.

```typescript
// Source: MDN Web Storage API
// Rule: never write to localStorage
// Rule: sessionStorage auto-clears on tab close — acceptable for non-sensitive transient data
// Rule: Zustand store is in-memory only — data lives for the tab lifetime

// beforeunload cleanup pattern
useEffect(() => {
  const cleanup = () => {
    peerRef.current?.destroy()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
  }
  window.addEventListener('beforeunload', cleanup)
  return () => window.removeEventListener('beforeunload', cleanup)
}, [])
```

**Verification method:** Open DevTools → Application tab → Storage. After tab close and reopen, all storage sections should be empty.

### Pattern 4: Hash-Based Routing with wouter

**What:** wouter in hash mode so deep links work on GitHub Pages without server-side redirect config.
**When to use:** GitHub Pages deployment (Phase 1 target).

```typescript
// Source: wouter docs https://github.com/molefrog/wouter
import { HashRouter, Route, Switch } from 'wouter'

export function App() {
  return (
    <HashRouter>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/room/:id" component={RoomPage} />
      </Switch>
    </HashRouter>
  )
}
```

### Pattern 5: Environment Variables for PeerJS Server + TURN

**What:** All server-specific configuration in `.env` files, not hardcoded. Vite exposes `VITE_*` vars to the client bundle.
**When to use:** Always — enables switching between local dev server and production without code changes.

```bash
# .env.development
VITE_PEERJS_HOST=localhost
VITE_PEERJS_PORT=9000
VITE_PEERJS_PATH=/peerjs
VITE_TURN_USERNAME=dev-placeholder
VITE_TURN_CREDENTIAL=dev-placeholder

# .env.production
VITE_PEERJS_HOST=your-peerjs.railway.app
VITE_PEERJS_PORT=443
VITE_PEERJS_PATH=/peerjs
VITE_TURN_USERNAME=<from Cloudflare REST API>
VITE_TURN_CREDENTIAL=<from Cloudflare REST API>
```

### Anti-Patterns to Avoid

- **Storing Peer in useState:** PeerJS objects are mutable event emitters. Storing them in `useState` causes double-initialization in Strict Mode and re-render loops on mutation.
- **Using `0.peerjs.com` free cloud in production:** Documented reliability issues — 20-second connection times, intermittent WSS failures. Self-host from day one.
- **STUN-only ICE config:** Fails for 15-30% of users on symmetric NAT/corporate networks. Configure TURN before any cross-network testing.
- **Writing to localStorage for session state:** Violates PRIV-01. Use Zustand in-memory store or sessionStorage only.
- **`new Peer()` outside useEffect:** Each constructor opens a WebSocket to the signaling server. Multiple instances = ghost connections and memory leaks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TURN server | Custom coturn instance | Cloudflare TURN (1,000 GB free) | coturn requires a VPS, SSL cert, firewall rules, and ongoing ops. Cloudflare TURN is zero-ops, globally distributed. |
| Signaling server | Custom WebSocket signaling | `peerjs-server` npm package | Custom signaling requires implementing SDP exchange, ICE candidate relay, peer ID registry. `peerjs-server` does all this in one package. |
| Room ID generation | `Math.random()` + custom encoding | nanoid `customAlphabet` | `Math.random()` is not cryptographically random. nanoid uses Web Crypto API, is 118 bytes, and produces the exact `meet-xxxxxx` format via `customAlphabet`. |
| CSS class merging | Manual string interpolation | clsx + tailwind-merge | Tailwind class conflicts (e.g., `text-red-500` overriding `text-blue-500`) require intelligent merging that tailwind-merge handles correctly. Manual string concatenation breaks silently. |

**Key insight:** The signaling and TURN infrastructure problems are completely solved by existing services. Every hour spent on custom infrastructure is an hour not spent on the actual product.

---

## Common Pitfalls

### Pitfall 1: React Strict Mode Double-Initializes Peer

**What goes wrong:** `useEffect` runs twice in development (Strict Mode mount → unmount → mount). Without a `useRef` guard, two `Peer` instances are created with the same room ID. The signaling server rejects the second registration with "ID taken." The UI sees no `open` event and hangs.

**Why it happens:** Strict Mode intentionally double-invokes effects to surface missing cleanup. PeerJS `Peer` objects hold external state on the signaling server — they are not idempotent.

**How to avoid:** `if (peerRef.current) return` at the top of the `useEffect`. This is Pattern 2 above. Set this before writing any other PeerJS code.

**Warning signs:**
- "ID taken" errors in the browser console (development only)
- `peer.on('open')` never fires on first load in dev
- Double camera/mic permission prompt in development

### Pitfall 2: PeerJS Free Cloud Server Reliability

**What goes wrong:** `0.peerjs.com` has documented uptime and latency issues. Connection attempts can take 20+ seconds or fail entirely. The free cloud server is a community resource with no SLA.

**Why it happens:** Developers use the PeerJS default constructor (`new Peer(id)` with no host config) and don't realize it targets the free cloud.

**How to avoid:** Always pass explicit `host`, `port`, `path`, and `secure` options. Deploy `peerjs-server` on Railway from the start. Use environment variables to target the local dev server in development and the Railway deployment in production.

**Warning signs:**
- `Peer.on('open')` takes >3 seconds
- Connections succeed sometimes but not consistently on refresh

### Pitfall 3: TURN Not Configured — 15-30% Connection Failure Rate

**What goes wrong:** Calls work on localhost and home WiFi but fail for users behind corporate firewalls, symmetric NAT, or mobile carrier NAT. ICE stays in `checking` then reports `failed`. No TURN relay = no fallback path.

**Why it happens:** PeerJS default config includes Google STUN only. STUN cannot relay traffic through firewalls. 15-30% of WebRTC users require TURN to connect.

**How to avoid:** Pass `config: { iceServers: [...] }` with Cloudflare TURN credentials when constructing `Peer`. Verify by testing from a mobile hotspot to a home WiFi connection — this simulates the symmetric NAT scenario.

**Warning signs:**
- `iceConnectionState` reaches `checking` then `failed`
- User reports "stuck at Connecting" on mobile data

### Pitfall 4: Zustand Store Accidentally Written to localStorage

**What goes wrong:** Zustand's `persist` middleware writes state to localStorage by default. If used anywhere in the codebase, session data survives tab close, violating PRIV-01.

**Why it happens:** Developers copy Zustand examples that include `persist`. The PRIV-01 constraint is not visually enforced.

**How to avoid:** Never use `persist` middleware. All Zustand stores must use bare `create()` with no storage layer. Document this constraint in the store file.

**Warning signs:**
- DevTools Application > localStorage shows non-empty keys
- App state survives tab close and reopen

### Pitfall 5: vite.config.ts Missing `base` for GitHub Pages

**What goes wrong:** The app loads at `https://username.github.io/meet-drop/` but all asset paths are absolute (e.g., `/assets/index.js`) and 404. The page is blank.

**Why it happens:** Vite defaults to `base: '/'`. GitHub Pages serves from a sub-path.

**How to avoid:** Set `base: '/meet-drop/'` in `vite.config.ts` from day one. This affects all asset URLs and must match the GitHub Pages repository path.

---

## Code Examples

### PeerJS Server: Run Locally

```bash
# Source: peerjs-server GitHub README
npm install -g peer
peerjs --port 9000 --key peerjs --path /peerjs
# Server listens at http://localhost:9000/peerjs
```

### PeerJS Server: Railway Deployment

```bash
# package.json start script for Railway
"scripts": {
  "start": "peerjs --port $PORT --key peerjs --path /peerjs"
}
# Railway injects $PORT automatically; set to 443 equivalent via their proxy
```

### Cloudflare TURN: Generate Short-Lived Credentials

```bash
# Source: https://developers.cloudflare.com/realtime/turn/generate-credentials/
# Called from a backend or build step — NOT from the client bundle (API token must stay secret)
curl https://rtc.live.cloudflare.com/v1/turn/keys/$TURN_KEY_ID/credentials/generate-ice-servers \
  --header "Authorization: Bearer $TURN_KEY_API_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"ttl": 86400}'
```

Response:
```json
{
  "iceServers": [
    { "urls": ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] },
    {
      "urls": [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"
      ],
      "username": "<generated>",
      "credential": "<generated>"
    }
  ]
}
```

**Important:** For Phase 1, use static credentials from the Cloudflare dashboard (or Metered Open Relay static credentials) stored in `.env.production`. Dynamic credential generation requires a backend endpoint — defer to a later phase or document as a manual refresh step.

### Metered Open Relay: Static Credentials (Zero-Config Alternative)

```typescript
// Source: https://www.metered.ca/tools/openrelay/
// 20 GB/month free — sufficient for development and low-traffic production
const ICE_SERVERS = [
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
]
```

**Use Open Relay for development, Cloudflare TURN for production.**

### Zustand Store: Zero-Persistence Shape

```typescript
// Source: Zustand docs https://docs.pmnd.rs/zustand/getting-started/introduction
// NEVER use persist middleware — violates PRIV-01
import { create } from 'zustand'

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'

interface CallStore {
  connectionState: ConnectionState
  peerId: string | null
  setConnectionState: (state: ConnectionState) => void
  setPeerId: (id: string | null) => void
  reset: () => void
}

export const useCallStore = create<CallStore>((set) => ({
  connectionState: 'idle',
  peerId: null,
  setConnectionState: (connectionState) => set({ connectionState }),
  setPeerId: (peerId) => set({ peerId }),
  reset: () => set({ connectionState: 'idle', peerId: null }),
}))
// No persist — store lives only in memory for the tab lifetime
```

### Room ID Generation

```typescript
// Source: nanoid docs https://github.com/ai/nanoid
import { customAlphabet } from 'nanoid'

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const generateId = customAlphabet(alphabet, 6)

export function generateRoomId(): string {
  return `meet-${generateId()}`
  // Output: "meet-k3n9pq" — readable, URL-safe, cryptographically random
}
```

### Vitest Setup for jsdom

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'

// vite.config.ts test section
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `0.peerjs.com` free cloud for signaling | Self-hosted `peerjs-server` on Railway/Render | Always the right answer; now free tier options make it free | Zero reliability issues; full control |
| Tailwind CSS v3 with PostCSS config | Tailwind CSS v4 with `@tailwindcss/vite` plugin | v4 GA late 2024 | Zero config, native CSS variables, 5x faster builds |
| React Router for all SPAs | wouter for lightweight static sites | 2022+ for simple apps | 2.2 KB vs 19 KB; hash routing built-in |
| No TURN server (test only) | Cloudflare TURN 1,000 GB free tier | Cloudflare launched Realtime 2024 | Production-grade TURN at zero cost for most projects |
| `Math.random()` for IDs | nanoid `customAlphabet` | Always the right answer | Cryptographically random, no collisions |

**Deprecated/outdated:**
- `simple-peer`: Archived by maintainer (Feross), no security fixes. Use PeerJS instead.
- `react-howler`: Not updated for React 18+. Use `use-sound` (Howler.js wrapper with hooks API).
- Tailwind CSS v3 `tailwind.config.js`: In v4, content detection is automatic. No config file needed for greenfield.
- PeerJS default constructor (no host config): Targets `0.peerjs.com` cloud. Always pass explicit host options.

---

## Open Questions

1. **Cloudflare TURN credential rotation in a static SPA**
   - What we know: The Cloudflare TURN API requires a backend service to generate short-lived credentials (the API token cannot be exposed to the client).
   - What's unclear: For a fully static site with no backend, credentials must be hardcoded in `.env.production` (exposing them) or fetched from a serverless edge function.
   - Recommendation: For Phase 1, use static credentials from the Cloudflare dashboard and document that they should be regenerated manually every 24 hours or use a Cloudflare Worker as a lightweight credential endpoint. Decision can be deferred to Phase 3 when actual cross-network testing begins.

2. **Railway vs. Render for peerjs-server**
   - What we know: Railway Hobby ($5/month, no sleep, always-on) is clearly better for signaling. Render free tier sleeps after 15 minutes.
   - What's unclear: Whether Railway's $5/month trial credit period is sufficient for the full development cycle before needing a paid plan.
   - Recommendation: Use Railway. The $5/month cost is negligible for a production signaling server. If cost is a hard constraint, document the Render workaround (UptimeRobot ping every 5 minutes) as an acceptable dev-only alternative.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest) |
| Config file | `vite.config.ts` — `test` section with `environment: 'jsdom'` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRIV-01 | `generateRoomId()` returns `meet-xxxxxx` format | unit | `npm test -- --run src/lib/room.test.ts` | Wave 0 |
| PRIV-01 | Zustand store has no persist middleware (no-op test asserting localStorage is empty after store write) | unit | `npm test -- --run src/store/index.test.ts` | Wave 0 |
| SC-1 | App loads and renders HomePage at `#/` | smoke | `npm test -- --run src/App.test.tsx` | Wave 0 |
| SC-1 | Navigation to `#/room/meet-abc123` renders RoomPage | smoke | `npm test -- --run src/App.test.tsx` | Wave 0 |
| SC-5 | `usePeer` `useRef` guard prevents double-init in Strict Mode | unit | `npm test -- --run src/hooks/usePeer.test.ts` | Wave 0 |

**Note:** ICE connection (SC-4) and tab-close storage clearing (SC-2, SC-3) cannot be automated via Vitest — they require manual DevTools verification as described in the success criteria.

### Sampling Rate

- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/room.test.ts` — covers `generateRoomId()` format, uniqueness, and entropy
- [ ] `src/store/index.test.ts` — asserts Zustand store writes do not appear in localStorage
- [ ] `src/App.test.tsx` — routing smoke test for `/` and `/room/:id`
- [ ] `src/hooks/usePeer.test.ts` — Strict Mode guard test (mock PeerJS constructor, verify single call)
- [ ] `src/test/setup.ts` — jsdom + jest-dom setup file

---

## Infrastructure Decisions (Resolved)

### TURN Provider: Cloudflare TURN (Recommended)

**Decision:** Use Cloudflare TURN (Realtime) for production.

| Attribute | Value |
|-----------|-------|
| Free tier | 1,000 GB/month outbound |
| Cost above free tier | $0.05/GB |
| Credential type | Short-lived (TTL configurable) via REST API |
| Global distribution | Yes — Cloudflare edge network |
| Credential generation | `POST https://rtc.live.cloudflare.com/v1/turn/keys/$ID/credentials/generate-ice-servers` |
| Phase 1 approach | Static credentials from Cloudflare dashboard stored in `.env.production` |

**Fallback:** Metered Open Relay (20 GB/month free, static credentials `openrelayproject`/`openrelayproject`) for development and low-traffic scenarios.

### PeerJS Signaling Platform: Railway

**Decision:** Deploy `peerjs-server` on Railway.

| Attribute | Value |
|-----------|-------|
| Sleep/cold-start | None (Hobby plan always-on) |
| Cost | $5/month (Hobby); trial credits cover initial deployment |
| Deploy method | GitHub repo → Railway auto-deploy on push |
| Start command | `peerjs --port $PORT --key peerjs --path /peerjs` |
| Client config | `host: 'your-app.railway.app', port: 443, path: '/peerjs', secure: true` |

**Rejected:** Render free tier (sleeps after 15 min inactivity — fatal for signaling latency).

---

## Sources

### Primary (HIGH confidence)

- [PeerJS Official Docs](https://peerjs.com/docs/) — Peer constructor options, host/port/path config, ICE servers config
- [peerjs-server GitHub](https://github.com/peers/peerjs-server) — deployment commands, configuration options, Docker image
- [Cloudflare Realtime TURN docs](https://developers.cloudflare.com/realtime/turn/) — pricing, free tier (1,000 GB), credential API
- [Cloudflare TURN generate-credentials](https://developers.cloudflare.com/realtime/turn/generate-credentials/) — iceServers response format, TTL parameter
- [Cloudflare TURN FAQ](https://developers.cloudflare.com/realtime/turn/faq/) — pricing confirmed: 1,000 GB free, $0.05/GB after
- [MDN: Window.sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) — tab-scoped, auto-clears on tab close
- [MDN: beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) — cleanup pattern
- [Vitest Getting Started](https://vitest.dev/guide/) — jsdom environment, vite.config.ts integration
- [Vite Static Deploy: GitHub Pages](https://vite.dev/guide/static-deploy#github-pages) — `base` config requirement

### Secondary (MEDIUM confidence)

- [Metered Open Relay Project](https://www.metered.ca/tools/openrelay/) — 20 GB/month free, static credentials confirmed
- [Metered TURN Pricing](https://www.metered.ca/pricing) — 500 MB free on standard plan (Open Relay is the generous free tier)
- [Railway Node.js Deployment](https://railway.com/deploy/nodejs) — always-on, no sleep, $5/month Hobby
- [Render free tier sleep behavior](https://community.render.com/t/do-web-services-on-a-free-tier-go-to-sleep-after-some-time-inactive/3303) — confirmed 15-minute sleep timeout
- [Tailwind CSS v4 blog](https://tailwindcss.com/blog/tailwindcss-v4) — Vite plugin, zero config confirmed
- [React 19.2 blog](https://react.dev/blog/2025/10/01/react-19-2) — v19.2.4 current
- [Vite 7 announcement](https://vite.dev/blog/announcing-vite7) — v7.3.1 current, Node 20+ required

### Tertiary (LOW confidence)

- [Render alternatives guide — Northflank](https://northflank.com/blog/render-alternatives) — general platform comparison, not PeerJS-specific
- [Railway vs Fly.io — Ritza](https://ritza.co/articles/gen-articles/cloud-hosting-providers/fly-io-vs-railway/) — cold start behavior described but not benchmarked for PeerJS specifically

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All package versions confirmed via npm/official release notes
- Architecture: HIGH — Patterns from MDN official docs, React docs, PeerJS docs
- Pitfalls: HIGH — Cross-referenced with PITFALLS.md from project research (which cites webrtcHacks, MDN, PeerJS GitHub issues)
- Infrastructure decisions: HIGH for Cloudflare (official docs confirmed) / MEDIUM for Railway (pricing/behavior from community sources)

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (90 days — stable infrastructure, check Railway pricing if plan changes)
