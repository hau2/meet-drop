# MeetDrop — Claude Code Build Prompt

## Project Overview

Build **MeetDrop**, a 1-on-1 anonymous video meeting web app. The tagline is **"Meet. Then it drops."**

Core philosophy: **No backend. No database. No trace.** Everything runs in the browser using WebRTC peer-to-peer connections via PeerJS. When the tab closes, everything disappears.

---

## Tech Stack

- **Frontend**: React (Vite)
- **Styling**: Tailwind CSS
- **WebRTC**: PeerJS (`peerjs` npm package) — uses PeerJS free cloud server for signaling only
- **Encryption**: Web Crypto API (AES-GCM for data channel messages)
- **Hosting**: Static site (GitHub Pages / Vercel / Netlify)
- **No backend, no database, no authentication**

---

## App Architecture

```
[Browser A] ←— WebRTC MediaStream + DataChannel —→ [Browser B]
        ↑                                              ↑
        └──── PeerJS Cloud (signaling only, 1 time) ───┘
```

- PeerJS Cloud is used **only** for the initial handshake (signaling)
- After connection is established, all data flows directly peer-to-peer
- No media or chat data ever touches any server

---

## Screens & User Flow

### Screen 1: Landing Page (`/`)

**Layout:**
- App name "MeetDrop" with tagline "Meet. Then it drops."
- Brief description: anonymous, encrypted, no server, no trace
- Two action buttons:
  1. **"Create Meeting"** → generates a room, navigates to lobby
  2. **"Join Meeting"** → input field for Room ID or full link, then navigates to lobby

**Behavior:**
- When "Create Meeting" is clicked:
  - Create a new `Peer()` instance
  - The PeerJS-assigned peer ID becomes the Room ID
  - Navigate to `/lobby#ROOM_ID` with `role=host`
- When "Join Meeting" is clicked:
  - Parse Room ID from input (support both raw ID and full URL)
  - Navigate to `/lobby#ROOM_ID` with `role=guest`

---

### Screen 2: Lobby / Preview (`/lobby#ROOM_ID`)

**Layout:**
- Camera preview (local video feed) in a card
- Toggle buttons: Mic ON/OFF, Camera ON/OFF
- Display the shareable meeting link with a **Copy Link** button (host only)
- **"Join Meeting"** button to confirm entry

**Behavior:**
- Request `getUserMedia({ video: true, audio: true })` on mount
- Show local video stream as preview
- Mic/Camera toggles enable/disable tracks in the local stream
- Host sees the meeting link to share
- Clicking "Join Meeting" navigates to the meeting room

---

### Screen 3: Meeting Room (`/meeting#ROOM_ID`)

**Layout:**
- **Main area**: Remote peer's video (large, centered)
- **Self view**: Local video (small, bottom-right corner, draggable)
- **Control bar** (bottom center):
  - 🎤 Toggle Mic
  - 📷 Toggle Camera
  - 🖥️ Share Screen
  - 📞 Leave Meeting (red button)
- **Connection status indicator**: Connecting... → Connected → Disconnected

**Behavior — Connection Flow:**

```
Host:
1. new Peer() → get peer ID (this is Room ID)
2. peer.on('call', answer) → receive incoming call
3. peer.on('connection', handle) → receive data channel

Guest:
1. new Peer() → get own peer ID
2. peer.call(ROOM_ID, localStream) → send call to host
3. peer.connect(ROOM_ID) → open data channel to host
```

**Video/Audio:**
- On successful call: attach remote stream to main video element
- Mic toggle: `localStream.getAudioTracks()[0].enabled = true/false`
- Camera toggle: `localStream.getVideoTracks()[0].enabled = true/false`
- When remote peer toggles camera off: show avatar/placeholder instead of black video

**Screen Sharing:**
- Click "Share Screen" → `navigator.mediaDevices.getDisplayMedia({ video: true })`
- Replace the video track in the existing peer connection:
  ```js
  const screenTrack = screenStream.getVideoTracks()[0];
  const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
  sender.replaceTrack(screenTrack);
  ```
- When screen share ends (user clicks browser's "Stop sharing" or toggle):
  - `screenTrack.onended` fires
  - Replace back with camera track
  - Update UI state
- During screen share: shared screen becomes main view, both camera feeds become small thumbnails

**Disconnection:**
- `peer.on('close')` or `connection.on('close')` → show "Peer has left the meeting"
- Offer buttons: "Create New Meeting" or "Back to Home"
- `window.onbeforeunload` → clean up peer connections

---

### Screen 4: Meeting Ended

**Layout:**
- Message: "Meeting ended. No data was saved."
- Two buttons: "Create New Meeting" | "Back to Home"

---

## Features Checklist

### Must Have (MVP)
- [ ] Create meeting room with unique link
- [ ] Join meeting via link or Room ID
- [ ] 1-on-1 video call (WebRTC via PeerJS)
- [ ] 1-on-1 audio call
- [ ] Toggle mic on/off
- [ ] Toggle camera on/off
- [ ] Screen sharing with track replacement
- [ ] Lobby/preview screen before joining
- [ ] Copy meeting link button
- [ ] Connection status indicator
- [ ] Responsive design (desktop + mobile)
- [ ] Clean disconnection handling

### Nice to Have (Post-MVP)
- [ ] Text chat via DataChannel (encrypted with Web Crypto API)
- [ ] Self-view drag and reposition
- [ ] Dark/light theme toggle
- [ ] Sound effects (join/leave notifications)
- [ ] Network quality indicator
- [ ] Fullscreen mode for remote video
- [ ] Virtual background (using TensorFlow.js BodyPix — heavy, optional)

---

## File Structure

```
meetdrop/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css                  # Tailwind imports
    ├── hooks/
    │   ├── usePeer.js             # PeerJS connection logic
    │   ├── useMediaStream.js      # getUserMedia, track toggles
    │   └── useScreenShare.js      # getDisplayMedia, track replacement
    ├── pages/
    │   ├── Landing.jsx            # Home page with Create/Join
    │   ├── Lobby.jsx              # Preview camera, copy link
    │   ├── Meeting.jsx            # Main meeting room
    │   └── MeetingEnded.jsx       # Post-meeting screen
    ├── components/
    │   ├── VideoPlayer.jsx        # Reusable video element
    │   ├── ControlBar.jsx         # Mic, Camera, Screen, Leave buttons
    │   ├── CopyLinkButton.jsx     # Copy to clipboard
    │   └── ConnectionStatus.jsx   # Connection state display
    └── utils/
        ├── generateRoomId.js      # Short readable ID generator
        └── crypto.js              # Web Crypto API helpers (optional, for chat)
```

---

## Key Implementation Details

### PeerJS Setup
```js
import Peer from 'peerjs';

// Host creates peer with custom readable ID
const peer = new Peer(generateRoomId(), {
  debug: 2, // 0: none, 1: errors, 2: warnings, 3: all
});

// Guest creates peer with random ID, then connects to host
const peer = new Peer(); // random ID
const call = peer.call(roomId, localStream);
const conn = peer.connect(roomId);
```

### Room ID Format
Generate short, readable, URL-safe IDs. Example: `meet-xk7f9p`

```js
function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'meet-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
```

### Screen Share Track Replacement
```js
async function startScreenShare(peerConnection, localStream) {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const screenTrack = screenStream.getVideoTracks()[0];

  // Find video sender and replace track
  const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
  await sender.replaceTrack(screenTrack);

  // When user stops sharing via browser UI
  screenTrack.onended = async () => {
    const cameraTrack = localStream.getVideoTracks()[0];
    await sender.replaceTrack(cameraTrack);
  };

  return screenStream;
}
```

### Accessing RTCPeerConnection from PeerJS
PeerJS wraps WebRTC. To access the underlying `RTCPeerConnection` for `getSenders()`:
```js
const call = peer.call(remotePeerId, localStream);
call.on('stream', (remoteStream) => {
  // call.peerConnection gives access to RTCPeerConnection
  const rtcConn = call.peerConnection;
  const senders = rtcConn.getSenders();
});
```

### Media Stream Management
```js
// Get user media
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720, facingMode: 'user' },
  audio: { echoCancellation: true, noiseSuppression: true }
});

// Toggle mic
stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;

// Toggle camera
stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
```

---

## UI/UX Design Guidelines

- **Color scheme**: Dark theme by default (dark gray/navy background, white text, accent color for buttons)
- **Accent color**: Teal/cyan (`#06B6D4`) for primary actions
- **Red** (`#EF4444`) for "Leave Meeting" button
- **Fonts**: Inter or system font stack
- **Border radius**: Rounded (`rounded-xl` to `rounded-2xl`) for modern feel
- **Animations**: Subtle fade-in for screens, pulse for connecting state
- **Video containers**: Rounded corners, subtle shadow/border
- **Control bar**: Semi-transparent dark background, pill-shaped, centered at bottom
- **Mobile**: Control bar at bottom, videos stack vertically
- **Privacy messaging**: Subtle footer text "No data is stored. Ever." on landing page

---

## Edge Cases to Handle

1. **Camera/mic permission denied** → Show friendly message, allow joining with camera/mic off
2. **Peer not found** → "Meeting not found or host hasn't joined yet. Try again."
3. **Connection lost mid-meeting** → Show reconnecting state, then "Connection lost" after timeout
4. **Browser doesn't support WebRTC** → Show "Your browser doesn't support video calls. Try Chrome or Firefox."
5. **Mobile browser** → Ensure `getUserMedia` works, handle orientation changes
6. **Screen share not supported** → Hide the screen share button
7. **Both peers leave** → Clean up all streams and peer connections
8. **Tab visibility change** → Don't disconnect, keep streams alive (browsers may throttle)

---

## Build & Deploy Commands

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
npx vercel --prod

# Deploy to GitHub Pages
npm run build && npx gh-pages -d dist
```

---

## Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "peerjs": "^1.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4",
    "vite": "^5",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## Summary

Build a complete, functional 1-on-1 video meeting app called MeetDrop. It should be a single static web app with no backend. Use PeerJS for WebRTC signaling, implement all 4 screens (Landing → Lobby → Meeting → Ended), support video/audio calls with mic/camera toggles and screen sharing. Focus on clean UI with dark theme, responsive design, and robust error handling. The entire app should work by simply opening the URL — no accounts, no downloads, no data stored anywhere.