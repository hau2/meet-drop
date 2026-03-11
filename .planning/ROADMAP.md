# Roadmap: MeetDrop

## Overview

MeetDrop delivers an anonymous, ephemeral 1-on-1 video meeting app with zero server-side state. The five phases follow the dependency graph imposed by WebRTC itself: infrastructure and architectural guarantees must be correct before media, media must be stable before peer connections, peer connections must be stable before encrypted chat, and polish can only be evaluated against a working call. Each phase ends with a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffold, routing, self-hosted PeerJS signaling, TURN server config, and zero-persistence architecture guarantee (completed 2026-03-10)
- [x] **Phase 2: Media + Lobby** - Camera/mic acquisition, pre-join lobby, device toggles, self-preview, and meeting link sharing (completed 2026-03-11)
- [x] **Phase 3: Core Call** - Live 1-on-1 video/audio via PeerJS, connection status, clean disconnect screen, and join/leave sounds (completed 2026-03-11)
- [ ] **Phase 4: Encrypted Chat** - End-to-end encrypted text chat over DataChannel using ECDH key exchange and AES-GCM
- [ ] **Phase 5: Polish** - Screen sharing, fullscreen, draggable self-view, light theme toggle, and network quality indicator

## Phase Details

### Phase 1: Foundation
**Goal**: The project scaffold is in place with correct architectural patterns and production-ready infrastructure — the foundation that makes all subsequent phases reliable
**Depends on**: Nothing (first phase)
**Requirements**: PRIV-01
**Success Criteria** (what must be TRUE):
  1. The app loads in the browser from the Vite dev server and navigates between the home and room routes without errors
  2. Closing or refreshing the tab leaves no trace in localStorage, sessionStorage, IndexedDB, or any cookie — verified via DevTools
  3. The self-hosted PeerJS signaling server accepts connections (not the free `0.peerjs.com` cloud)
  4. TURN server credentials are configured and the app can establish an ICE connection on a network that blocks direct peer-to-peer (e.g., mobile hotspot)
  5. React Strict Mode is enabled and PeerJS `Peer` instances are not double-initialized (verified by checking that only one peer ID is registered per session)
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Scaffold Vite project, routing, types, store, room ID generation, and test infrastructure
- [x] 01-02-PLAN.md — PeerJS usePeer hook with Strict Mode guard, TURN config, env vars, and browser verification

### Phase 2: Media + Lobby
**Goal**: Users can preview their camera and mic before joining, share a meeting link, and control their media tracks — everything needed before a peer connection exists
**Depends on**: Phase 1
**Requirements**: CONN-01, CONN-02, CONN-03, AV-02, AV-03, AV-04, AV-05, UX-01
**Success Criteria** (what must be TRUE):
  1. User opens the app, sees a lobby with their camera preview and can toggle camera and mic on/off before joining
  2. User creates a room and copies the meeting link to clipboard with one button click — the link includes a readable `meet-xxxxxx` room ID
  3. A second user opens the copied link and lands directly in the lobby for that room ID, ready to join (no manual ID entry needed)
  4. User can also join by entering a Room ID manually
  5. The lobby layout is usable on both a desktop browser (1280px+) and a mobile browser (375px) without horizontal scrolling or clipped controls
  6. User's own video appears as a picture-in-picture overlay with a mirrored self-view
**Plans:** 2/2 plans complete
Plans:
- [x] 02-01-PLAN.md — useMedia hook, VideoPreview component, store extension, and media types (TDD)
- [x] 02-02-PLAN.md — HomePage join input, CopyLinkButton, MediaControls, SelfViewOverlay, RoomPage lobby layout, and human verification

### Phase 3: Core Call
**Goal**: Two users on the same room link can see and hear each other in a live 1-on-1 video call with visible connection state and a clean exit experience
**Depends on**: Phase 2
**Requirements**: AV-01, CONN-04, UX-02, UX-04
**Success Criteria** (what must be TRUE):
  1. Two users on the same room URL establish a live video and audio call — remote video appears and remote audio is heard within 15 seconds of the second user joining
  2. The connection status label updates visibly: "Connecting" during ICE negotiation, "Connected" once media flows, "Disconnected" if the connection drops
  3. When either user ends the call or closes the tab, the other user sees a "Meeting Ended" screen with options to create a new room or return home — no silent black screen
  4. A sound notification plays when the remote peer joins the call and a different sound plays when they leave
**Plans:** 2/2 plans complete
Plans:
- [ ] 03-01-PLAN.md — Store extension, sounds utility, ConnectionStatus badge, and MeetingEnded screen
- [ ] 03-02-PLAN.md — useCall hook, CallView component, RoomPage integration, and human verification

### Phase 4: Encrypted Chat
**Goal**: Users in an active call can exchange text messages that are end-to-end encrypted — no message content travels unencrypted over any network path
**Depends on**: Phase 3
**Requirements**: CHAT-01
**Success Criteria** (what must be TRUE):
  1. User can open a chat panel during a call, type a message, and the remote peer receives and displays it
  2. Messages are encrypted with AES-GCM using a key derived via ECDH key exchange — the raw message text is never visible in a network capture (DevTools Network tab shows no plaintext)
  3. Each message uses a unique random IV — sending the same text twice produces different ciphertext
  4. When the tab closes, all chat history is gone — no messages persist in storage
**Plans**: TBD

### Phase 5: Polish
**Goal**: The call experience is complete with screen sharing, fullscreen viewing, a draggable self-view, light theme option, and a network quality indicator
**Depends on**: Phase 3
**Requirements**: AV-06, AV-07, AV-08, UX-03, UX-05
**Success Criteria** (what must be TRUE):
  1. User can share their screen; the remote peer sees the screen content in place of the camera feed; when the user stops sharing (including via the OS "Stop Sharing" button), the camera feed is automatically restored
  2. User can enter fullscreen mode for the remote video with a single click and exit fullscreen with Escape or a toggle button
  3. User can drag their self-view overlay to any corner of the call window and it stays there for the session
  4. App renders in dark theme by default; user can toggle to light theme; the preference persists for the session
  5. A network quality badge (Good / Fair / Poor) is visible during the call and updates in real time based on RTCPeerConnection stats

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete    | 2026-03-11 |
| 2. Media + Lobby | 2/2 | Complete    | 2026-03-11 |
| 3. Core Call | 2/2 | Complete    | 2026-03-11 |
| 4. Encrypted Chat | 0/TBD | Not started | - |
| 5. Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-11*
*Requirements coverage: 19/19 v1 requirements mapped*
