# Requirements: MeetDrop

**Defined:** 2026-03-11
**Core Value:** Anonymous, ephemeral video meetings with zero server-side data

## v1 Requirements

### Connection & Rooms

- [x] **CONN-01**: User can create a meeting room with a unique readable ID (`meet-xxxxxx`)
- [x] **CONN-02**: User can join a meeting via Room ID or full link
- [x] **CONN-03**: User can copy the meeting link to clipboard with one click
- [x] **CONN-04**: User can see connection status (Connecting → Connected → Disconnected)

### Video & Audio

- [x] **AV-01**: User can make a 1-on-1 video and audio call via WebRTC (PeerJS)
- [x] **AV-02**: User can toggle microphone on/off during a call
- [x] **AV-03**: User can toggle camera on/off during a call
- [x] **AV-04**: User can preview camera and mic in a lobby screen before joining
- [x] **AV-05**: User can see their own video as a small picture-in-picture overlay
- [ ] **AV-06**: User can share their screen, replacing the camera track for the remote peer
- [ ] **AV-07**: User can view remote video in fullscreen mode
- [ ] **AV-08**: User can drag and reposition their self-view overlay

### Chat & Privacy

- [ ] **CHAT-01**: User can send and receive encrypted text messages via DataChannel (AES-GCM + ECDH key exchange)
- [x] **PRIV-01**: All session data is destroyed when the tab closes — zero persistence

### UX & Polish

- [x] **UX-01**: App layout is responsive and works on desktop and mobile browsers
- [x] **UX-02**: User sees a clear "Meeting Ended" screen when a call ends with options to create new or go home
- [ ] **UX-03**: App uses dark theme by default with a toggle to switch to light theme
- [x] **UX-04**: User hears a sound notification when a peer joins or leaves
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
| CONN-01 | Phase 2 | Complete |
| CONN-02 | Phase 2 | Complete |
| CONN-03 | Phase 2 | Complete |
| CONN-04 | Phase 3 | Complete |
| AV-01 | Phase 3 | Complete |
| AV-02 | Phase 2 | Complete |
| AV-03 | Phase 2 | Complete |
| AV-04 | Phase 2 | Complete |
| AV-05 | Phase 2 | Complete |
| AV-06 | Phase 5 | Pending |
| AV-07 | Phase 5 | Pending |
| AV-08 | Phase 5 | Pending |
| CHAT-01 | Phase 4 | Pending |
| PRIV-01 | Phase 1 | Complete |
| UX-01 | Phase 2 | Complete |
| UX-02 | Phase 3 | Complete |
| UX-03 | Phase 5 | Pending |
| UX-04 | Phase 3 | Complete |
| UX-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after roadmap creation*
