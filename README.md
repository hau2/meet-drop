# MeetDrop

Anonymous peer-to-peer video meetings. No sign-up. No trace.

MeetDrop is a privacy-first video calling app that connects users directly via WebRTC — no central server ever sees your video or audio.

## Features

- **P2P Video Calls** — Direct browser-to-browser connection via WebRTC
- **End-to-End Encrypted Chat** — ECDH key exchange + AES-GCM encryption
- **Screen Sharing** — Share your screen with camera PiP overlay
- **QR Code Invite** — Generate and scan QR codes to join meetings
- **No Account Required** — Ephemeral rooms, nothing stored
- **Dark / Light Theme** — Toggle with one click
- **Network Quality Indicator** — Real-time RTT and packet loss monitoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand 5 (in-memory only) |
| Routing | Wouter |
| P2P | PeerJS (WebRTC) |
| Encryption | Web Crypto API (ECDH + AES-GCM) |
| QR | qrcode.react + html5-qrcode |
| Testing | Vitest + React Testing Library |

## How It Works

```
┌──────────┐     PeerJS Signaling     ┌──────────┐
│  Peer A  │◄────────────────────────►│  Peer B  │
│ (create) │                          │  (join)  │
└────┬─────┘                          └────┬─────┘
     │                                     │
     │     Direct WebRTC Connection        │
     │◄═══════════════════════════════════►│
     │   Video / Audio (MediaConnection)   │
     │   Chat (DataChannel + AES-GCM)      │
     │   Screen Share (2nd MediaConnection)│
     └─────────────────────────────────────┘
```

1. **Create** — Peer A creates a room and gets a unique `meet-XXXXXX` ID
2. **Share** — Peer A shares the link or QR code with Peer B
3. **Connect** — Peer B joins the room; PeerJS brokers the WebRTC handshake
4. **Stream** — Video, audio, and chat flow directly between browsers (no server relay)
5. **End** — Close the tab and everything is gone — no data persists

## Project Structure

```
src/
├── pages/           # HomePage, RoomPage
├── components/      # CallView, ChatPanel, QRInvite, QRScanner, ...
├── hooks/           # usePeer, useMedia, useCall, useChat, useScreenShare, ...
├── store/           # Zustand store (connection state, media, messages)
├── lib/             # room ID gen, crypto (ECDH/AES), sound effects
└── types/           # TypeScript type definitions
```

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/your-username/meet-drop.git
cd meet-drop
npm install
```

### Configure Environment

```bash
cp .env.example .env.development
```

Default `.env.development` runs a local PeerJS signaling server:

```env
VITE_PEERJS_HOST=localhost
VITE_PEERJS_PORT=9000
VITE_PEERJS_PATH=/peerjs
```

For cross-network calls (different WiFi/cellular), add a TURN server:

```env
VITE_TURN_HOST=your-turn-server.com
VITE_TURN_USERNAME=your-username
VITE_TURN_CREDENTIAL=your-credential
```

> Free TURN: sign up at [metered.ca](https://www.metered.ca/stun-turn) (500 GB/month free)

### Run

```bash
npm run dev
```

This starts both the Vite dev server and a local PeerJS signaling server on port 9000.

Open [http://localhost:5173/meet-drop/](http://localhost:5173/meet-drop/) in your browser.

### Build for Production

```bash
npm run build
```

The output in `dist/` is ready to deploy to GitHub Pages or any static host.

### Test

```bash
npm run test
```

### Lint

```bash
npm run lint
```

## Author

**Le Cong Hau** — [leconghau095@gmail.com](mailto:leconghau095@gmail.com)
