# Stack Research

**Domain:** Browser-based anonymous P2P WebRTC video meeting app
**Researched:** 2026-03-11
**Confidence:** HIGH (core stack confirmed via npm/official releases; supporting libs MEDIUM-HIGH)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.4 | UI framework | React 19 adds concurrent features and `use()` hook — stable as of Dec 2024, React 19.2.4 current. `useRef` + `useEffect` pattern maps naturally to WebRTC stream lifecycle management. |
| Vite | 7.3.1 | Build tool + dev server | Fastest HMR in class. Native ESM. Vite 7 targets `baseline-widely-available` by default (Chrome 107, Firefox 104, Safari 16), which aligns with WebRTC support matrix. Static output is a single `dist/` directory — deploy anywhere. |
| TypeScript | 5.x (bundled with Vite) | Type safety | WebRTC APIs (`RTCPeerConnection`, `MediaStream`, `RTCDataChannel`) have complex types. TypeScript strict mode catches misuse of stream refs and async signaling flows at compile time. |
| Tailwind CSS | 4.2.1 | Utility-first CSS | v4 ships a first-party Vite plugin (`@tailwindcss/vite`). Zero config: one `@import "tailwindcss"` line, automatic content detection. Full builds 5x faster than v3. Native CSS variables for dark/light theme — no JS config required. |
| PeerJS | 1.5.5 | WebRTC abstraction + signaling | Wraps `RTCPeerConnection` and handles STUN/TURN negotiation via the free PeerJS cloud server. 1-on-1 MediaConnection API is a near-exact fit for this use case. `DataConnection` supports the encrypted chat channel. Current version 1.5.5 (Jun 2025) is actively maintained. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| wouter | 3.9.0 | Client-side routing | Hash-based routing (`#/room/meet-xxxxxx`) compatible with GitHub Pages without server config. 2.2 KB gzipped vs React Router's ~19 KB. Covers the two routes this app needs: `/` (home) and `/room/:id`. |
| Zustand | 5.0.11 | Client state management | Manages call state (connecting/connected/disconnected), media track toggles, peer ID, and chat messages. React Context causes unnecessary re-renders on every state change — Zustand subscribes components to only the slice they need. No boilerplate. |
| nanoid | 5.1.6 | Room ID generation | Generates cryptographically random room IDs. Use `customAlphabet` to produce the `meet-xxxxxx` format (6 alphanumeric chars). 118 bytes. Web Crypto-backed. No alternatives needed. |
| clsx + tailwind-merge | 2.x / 3.5.0 | Conditional CSS class utility | Standard `cn()` utility pattern for all conditional Tailwind classes. `clsx` builds the class array; `tailwind-merge` resolves Tailwind conflicts when overriding defaults. Required for reusable components (Button, IconButton, etc.) |
| use-sound | 4.x | Audio notifications (join/leave) | React hook built on Howler.js. ~1 KB gzipped wrapper, loads ~10 KB Howler async. `const [play] = useSound('/sounds/join.mp3')` — minimal API for a notification-only use case. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@tailwindcss/vite` | Tailwind v4 Vite plugin | Required for Tailwind v4 — replaces the PostCSS approach. Add to `vite.config.ts` plugins array. |
| `@vitejs/plugin-react` | React Fast Refresh + JSX transform | v5.1.4. Enables HMR during development. SWC-based (no Babel dependency). |
| ESLint + `eslint-plugin-react-hooks` | Lint hooks rules | Catches missing `useEffect` dependencies — critical when managing stream refs and PeerJS event subscriptions. |
| Prettier | Code formatting | No configuration choices during development. |
| `gh-pages` npm package | GitHub Pages deploy | Automates `dist/` push to `gh-pages` branch via `npm run deploy`. |

---

## Installation

```bash
# Scaffold project
npm create vite@latest meet-drop -- --template react-ts
cd meet-drop

# Core runtime dependencies
npm install peerjs wouter zustand nanoid

# Supporting
npm install clsx tailwind-merge use-sound

# Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Dev tools
npm install -D eslint eslint-plugin-react-hooks prettier gh-pages
```

**vite.config.ts minimum setup:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/meet-drop/', // required for GitHub Pages sub-path
  plugins: [react(), tailwindcss()],
})
```

**src/index.css (Tailwind v4):**
```css
@import "tailwindcss";
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| PeerJS 1.5.5 | Raw `RTCPeerConnection` + custom signaling | If you need TURN server control, SFU architecture, or >2 participants. For 1-on-1 with free signaling, PeerJS wins on DX. |
| PeerJS cloud server | Self-hosted `peerjs-server` | If the free cloud server becomes a reliability concern or you need to guarantee uptime SLA. Self-host is trivial (Docker image available) but adds infra. |
| wouter | React Router v7 | If you need loaders, nested layouts, SSR, or framework mode. Overkill for two routes on a static site. |
| Zustand | React Context + useReducer | Viable for very simple state. Context re-renders all consumers on every update; unacceptable for video UI where mic/camera toggle state changes constantly. |
| Tailwind CSS v4 | Tailwind CSS v3 | v3 if you need `@apply` heavily in existing stylesheets or have a v3 migration constraint. For greenfield in 2026, v4 is the right choice. |
| use-sound | Raw `HTMLAudioElement` | If you need zero dependencies and only one sound file. use-sound is worth it for React ergonomics and Howler's format fallback handling. |
| nanoid | `crypto.randomUUID()` | `crypto.randomUUID()` is now native in all modern browsers. Use it if you want zero deps. nanoid's `customAlphabet` is the only reason to prefer it — lets you produce the `meet-xxxxxx` readable format. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| simple-peer | Unmaintained (last commit 2022+, Feross archived the repo). No active security fixes. | PeerJS (actively maintained, wraps WebRTC the same way) |
| Socket.IO for signaling | Requires a Node.js server — violates the zero-backend constraint. PeerJS cloud handles signaling with no server code. | PeerJS cloud server |
| Redux Toolkit | 80% boilerplate for a 5-state app. RTK is excellent for large apps; wrong tool at this scale. | Zustand |
| Tailwind CSS v3 | PostCSS config overhead, slower builds, no native CSS variables for theming. v4 is GA and stable. | Tailwind CSS v4 |
| `react-howler` | Stale React wrapper (not updated for React 18+). use-sound is maintained and has better hook API. | use-sound |
| `BrowserRouter` (React Router) | GitHub Pages returns 404 on deep-link refresh — BrowserRouter requires server-side redirect configuration which GitHub Pages doesn't support. | wouter with hash mode OR `HashRouter` |
| Virtual backgrounds (TensorFlow.js BodyPix) | 2+ MB bundle weight for a feature that doesn't match the anonymous/ephemeral brand. Explicitly out of scope per PROJECT.md. | Screen sharing via `getDisplayMedia()` as the alternative self-expression tool |

---

## Stack Patterns by Variant

**If deploying to Vercel or a VPS (future migration):**
- Switch wouter from hash mode to standard history mode
- Set `base: '/'` in vite.config.ts
- No other changes needed — Vercel rewrites `/*` to `index.html` by default

**If self-hosting signaling (future):**
- Deploy `peerjs-server` Docker image (maintained by peers org)
- Change `new Peer()` constructor to point at self-hosted host/port/path
- No PeerJS client code changes

**If adding TURN servers (NAT traversal for restrictive networks):**
- Pass `config: { iceServers: [...] }` to `new Peer()` constructor
- Use a free TURN provider (Metered, Twilio for low volume) or self-host coturn
- STUN-only (PeerJS default) fails for ~15% of users on symmetric NATs

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| peerjs@1.5.5 | React 19, Vite 7, TypeScript 5 | No React dependency — pure browser WebRTC wrapper. Compatible with any framework. |
| tailwindcss@4.2.1 | Vite 7 via `@tailwindcss/vite` plugin | Do NOT use PostCSS setup with v4 in Vite projects. Use the Vite plugin only. |
| wouter@3.9.0 | React 19 | v3.x API. Uses React 18+ hooks internally. |
| zustand@5.0.11 | React 19 | v5 uses React 18+ `useSyncExternalStore` internally. Fully compatible with React 19. |
| use-sound@4.x | React 19 | Built on Howler.js 2.x. Check peer deps on install — may need `--legacy-peer-deps` if listed against React 18 specifically. |
| nanoid@5.x | ESM-only | nanoid v5 is ESM-only. Vite handles ESM natively. Do NOT use `require('nanoid')` — import only. |

---

## Web Crypto API Note (no library needed)

AES-GCM encryption for DataChannel chat uses the native `window.crypto.subtle` API — no npm package required. Available in all browsers that support WebRTC (Chrome 37+, Firefox 34+, Safari 11+, Edge 12+). Key pattern:

```typescript
// Generate per-session key (exchange via PeerJS DataConnection)
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
)
// IV must be unique per message — generate with crypto.getRandomValues()
const iv = crypto.getRandomValues(new Uint8Array(12))
```

This is zero-dependency end-to-end encryption. No library needed, no bundle weight added.

---

## Sources

- [PeerJS GitHub Releases](https://github.com/peers/peerjs/releases) — v1.5.5 confirmed, released Jun 7 2025
- [Vite 7 announcement](https://vite.dev/blog/announcing-vite7) — v7.3.1 current, Node 20+ required
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4) — v4.2.1 current, Vite plugin confirmed
- [React 19.2 blog](https://react.dev/blog/2025/10/01/react-19-2) — v19.2.4 current
- [wouter npm](https://www.npmjs.com/package/wouter) — v3.9.0, published ~2 months ago (MEDIUM confidence, npm page only)
- [Zustand npm](https://www.npmjs.com/package/zustand) — v5.0.11, published ~1 month ago (MEDIUM confidence, npm page only)
- [nanoid npm](https://www.npmjs.com/package/nanoid) — v5.1.6, ESM-only confirmed (MEDIUM confidence)
- [tailwind-merge npm](https://www.npmjs.com/package/tailwind-merge) — v3.5.0 (MEDIUM confidence)
- [MDN Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — AES-GCM browser support confirmed (HIGH confidence)
- [MDN WebRTC DataChannels](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels) — DTLS transport encryption confirmed (HIGH confidence)
- [use-sound announcement](https://www.joshwcomeau.com/react/announcing-use-sound-react-hook/) — Howler.js wrapper approach confirmed (MEDIUM confidence)

---
*Stack research for: MeetDrop — anonymous P2P WebRTC video meeting (React/Vite/PeerJS)*
*Researched: 2026-03-11*
