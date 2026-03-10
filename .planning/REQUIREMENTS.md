# Requirements: MeetDrop

**Defined:** 2026-03-11
**Core Value:** Anonymous, ephemeral video meetings with zero server-side data

## v1 Requirements

### Connection & Rooms

- [ ] **CONN-01**: User can create a meeting room with a unique readable ID (`meet-xxxxxx`)
- [ ] **CONN-02**: User can join a meeting via Room ID or full link
- [ ] **CONN-03**: User can copy the meeting link to clipboard with one click
- [ ] **CONN-04**: User can see connection status (Connecting → Connected → Disconnected)

### Video & Audio

- [ ] **AV-01**: User can make a 1-on-1 video and audio call via WebRTC (PeerJS)
- [ ] **AV-02**: User can toggle microphone on/off during a call
- [ ] **AV-03**: User can toggle camera on/off during a call
- [ ] **AV-04**: User can preview camera and mic in a lobby screen before joining
- [ ] **AV-05**: User can see their own video as a small picture-in-picture overlay
- [ ] **AV-06**: User can share their screen, replacing the camera track for the remote peer
- [ ] **AV-07**: User can view remote video in fullscreen mode
- [ ] **AV-08**: User can drag and reposition their self-view overlay

### Chat & Privacy

- [ ] **CHAT-01**: User can send and receive encrypted text messages via DataChannel (AES-GCM + ECDH key exchange)
- [ ] **PRIV-01**: All session data is destroyed when the tab closes — zero persistence

### UX & Polish

- [ ] **UX-01**: App layout is responsive and works on desktop and mobile browsers
- [ ] **UX-02**: User sees a clear "Meeting Ended" screen when a call ends with options to create new or go home
- [ ] **UX-03**: App uses dark theme by default with a toggle to switch to light theme
- [ ] **UX-04**: User hears a sound notification when a peer joins or leaves
- [ ] **UX-05**: User can see a network quality indicator (Good/Fair/Poor) during a call

## v2 Requirements

### Future Enhancements

- **FUTURE-01**: Virtual backgrounds via TensorFlow.js BodyPix
- **FUTURE-02**: File sharing over DataChannel
- **FUTURE-03**: Custom room ID slugs (user-chosen names)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / database / authentication | Core philosophy is zero server-side state |
| Call recording | Contradicts the "no trace" ephemeral promise |
| Multi-party calls (3+) | Mesh WebRTC for 3+ requires SFU server, breaks no-backend constraint |
| User accounts / persistent rooms | Contradicts zero-server-state philosophy |
| Chat history / message persistence | Contradicts ephemerality |
| Waiting room / lobby approval | Requires stateful signaling server; 1-on-1 inherently limits joiners |
| Noise cancellation SDK | Browser built-in echoCancellation/noiseSuppression constraints suffice |
| Mobile native app | Web-first only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONN-01 | — | Pending |
| CONN-02 | — | Pending |
| CONN-03 | — | Pending |
| CONN-04 | — | Pending |
| AV-01 | — | Pending |
| AV-02 | — | Pending |
| AV-03 | — | Pending |
| AV-04 | — | Pending |
| AV-05 | — | Pending |
| AV-06 | — | Pending |
| AV-07 | — | Pending |
| AV-08 | — | Pending |
| CHAT-01 | — | Pending |
| PRIV-01 | — | Pending |
| UX-01 | — | Pending |
| UX-02 | — | Pending |
| UX-03 | — | Pending |
| UX-04 | — | Pending |
| UX-05 | — | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19 ⚠️

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after initial definition*
