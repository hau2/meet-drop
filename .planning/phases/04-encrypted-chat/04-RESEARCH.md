# Phase 4: Encrypted Chat - Research

**Researched:** 2026-03-11
**Domain:** Web Crypto API (ECDH + AES-GCM), PeerJS DataConnection, React chat UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | User can send and receive encrypted text messages via DataChannel (AES-GCM + ECDH key exchange) | Web Crypto API provides native ECDH key generation, SPKI export/import, and AES-GCM encrypt/decrypt. PeerJS `peer.connect()` / `peer.on('connection')` provides the DataChannel transport. Full implementation path is verified. |
</phase_requirements>

---

## Summary

Phase 4 adds encrypted chat to an active 1-on-1 video call. All encryption uses the browser-native **Web Crypto API** (`window.crypto.subtle`) — no third-party crypto library is needed or appropriate. The protocol is: each peer generates an ECDH key pair on connection, exports the public key in SPKI format, exchanges public keys over the PeerJS DataChannel, derives a shared AES-GCM-256 secret, then encrypts every message with a fresh 12-byte random IV. The raw ciphertext (IV prepended to the encrypted bytes) is sent as a base64 string over the DataChannel so it passes through PeerJS's default JSON serialization cleanly.

The DataChannel is opened as a **separate** `DataConnection` on top of the existing `MediaConnection`. The joiner calls `peer.connect(roomId)`, and the creator listens on `peer.on('connection', ...)`. Both sides get a `DataConnection` object; both must listen on `conn.on('open', ...)` before sending. The ECDH handshake is the first exchange once the channel opens — messages sent before key exchange completes must be queued.

The chat UI lives inside `CallView` as a collapsible panel (toggled by a button in the controls bar). Messages are held in `useCallStore` in-memory only, consistent with PRIV-01. No persistence, no localStorage. When the tab closes or the call ends, all history is gone.

**Primary recommendation:** Use `window.crypto.subtle` directly — ECDH P-256 → `deriveKey` → AES-GCM-256. Wire format: base64-encoded `IV (12 bytes) + ciphertext` as a JSON string over PeerJS DataConnection (serialization: 'json' for Safari compatibility). Extract the crypto protocol into a standalone `lib/crypto.ts` module for testability.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `window.crypto.subtle` (Web Crypto API) | Browser-native | ECDH key exchange + AES-GCM encryption/decryption | W3C standard, hardware-accelerated, zero dependencies, available in all modern browsers and jsdom (via Node crypto) |
| `peerjs` | 1.5.5 (already installed) | DataChannel transport for key exchange and encrypted messages | Already used for MediaConnection in Phase 3; DataConnection is the same API |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand `useCallStore` | 5.0.11 (already installed) | In-memory message history and chat open/close state | Matches existing store pattern; no persist middleware = PRIV-01 compliant |
| Lucide React | 0.577.0 (already installed) | Chat panel toggle icon (e.g., `MessageSquare`) | Already used in MediaControls |
| shadcn/ui `ScrollArea`, `Input`, `Button` | Already installed | Chat panel scroll container and message input | Matches existing component library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Crypto API (native) | `tweetnacl`, `libsodium-wrappers` | Third-party libs add bundle weight (~32KB+); no advantage over native since browsers have had SubtleCrypto since 2015; native is auditable with zero supply-chain risk |
| ECDH P-256 | ECDH P-384 | P-384 is marginally stronger but produces larger SPKI exports and is slower; P-256 is the standard for web, supported by all major browsers, and adequate for the threat model here |
| Base64 wire format (JSON serialization) | Raw ArrayBuffer (binary serialization) | PeerJS binary serialization has known Safari issues (#587, #572 on GitHub); JSON serialization is reliable cross-browser; base64 adds ~33% overhead but chat messages are small |
| ECDH direct to AES-GCM | ECDH → HKDF → AES-GCM | HKDF is the correct cryptographic recommendation (prevents bias in shared secret); for this threat model (ephemeral session, no persistence, DTLS already in use), direct derivation is acceptable and simpler; add HKDF only if security requirements escalate |

**Installation:** No new packages needed. Everything is available via browser APIs and already-installed PeerJS.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── crypto.ts          # Pure crypto module: keygen, encrypt, decrypt, exportKey, importKey
├── hooks/
│   ├── useChat.ts         # DataChannel lifecycle + ECDH handshake + send/receive
│   └── useChat.test.ts    # Unit tests with mocked crypto and PeerJS DataConnection
├── components/
│   ├── ChatPanel.tsx      # Collapsible chat UI: message list + input
│   └── ChatPanel.test.tsx # Render tests
├── store/
│   └── index.ts           # Extend CallStore with: messages[], isChatOpen, addMessage, setChatOpen
```

`CallView.tsx` gets a chat toggle button and conditionally renders `<ChatPanel />`.

### Pattern 1: Two-Phase DataChannel Protocol

**What:** The DataChannel carries two message types: `{type: 'key-exchange', key: '<base64-spki>'}` and `{type: 'message', payload: '<base64-iv+ciphertext>'}`. Key exchange happens immediately when the channel opens; message sends are blocked until both sides have exchanged keys and derived the shared secret.

**When to use:** Any time two browser peers need to establish a symmetric key without a server.

**Example:**

```typescript
// Source: MDN SubtleCrypto docs + verified pattern
// lib/crypto.ts

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,         // extractable — needed to exportKey
    ['deriveKey']
  )
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await window.crypto.subtle.exportKey('spki', publicKey)
  // Convert ArrayBuffer → base64 for wire transport
  return btoa(String.fromCharCode(...new Uint8Array(spki)))
}

export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const binary = Uint8Array.from(atob(base64Spki), c => c.charCodeAt(0))
  return window.crypto.subtle.importKey(
    'spki',
    binary.buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,  // non-extractable for imported peer key
    []      // no usages for public key; used implicitly in deriveKey
  )
}

export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  )
  // Wire format: base64(IV[12] + ciphertext)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptMessage(
  sharedKey: CryptoKey,
  base64Payload: string
): Promise<string> {
  const combined = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}
```

### Pattern 2: DataChannel Initialization in useChat Hook

**What:** A dedicated `useChat` hook manages the DataConnection lifecycle, the ECDH handshake state machine, and message send/receive. It returns `{ sendMessage, isReady }`.

**When to use:** Any hook that wraps a stateful connection with async initialization.

**Example:**

```typescript
// Source: PeerJS docs + established project hook patterns
// hooks/useChat.ts

export function useChat(
  peerRef: RefObject<Peer | null>,
  roomId: string
) {
  const connRef = useRef<DataConnection | null>(null)
  const keyPairRef = useRef<CryptoKeyPair | null>(null)
  const sharedKeyRef = useRef<CryptoKey | null>(null)
  const pendingMessages = useRef<string[]>([]) // messages queued before handshake
  const { addMessage, setChatOpen: _ } = useCallStore()

  const setupConnection = useCallback((conn: DataConnection) => {
    connRef.current = conn

    conn.on('open', async () => {
      // Generate keypair and send public key
      const kp = await generateKeyPair()
      keyPairRef.current = kp
      const exportedPub = await exportPublicKey(kp.publicKey)
      conn.send({ type: 'key-exchange', key: exportedPub })
    })

    conn.on('data', async (raw: unknown) => {
      const msg = raw as { type: string; key?: string; payload?: string }

      if (msg.type === 'key-exchange' && msg.key && keyPairRef.current) {
        const peerPub = await importPublicKey(msg.key)
        sharedKeyRef.current = await deriveSharedKey(
          keyPairRef.current.privateKey,
          peerPub
        )
        // Flush any messages that arrived before key exchange
        for (const payload of pendingMessages.current) {
          const text = await decryptMessage(sharedKeyRef.current, payload)
          addMessage({ from: 'remote', text, timestamp: Date.now() })
        }
        pendingMessages.current = []
        return
      }

      if (msg.type === 'message' && msg.payload) {
        if (!sharedKeyRef.current) {
          // Edge case: message arrived before key derived — queue
          pendingMessages.current.push(msg.payload)
          return
        }
        const text = await decryptMessage(sharedKeyRef.current, msg.payload)
        addMessage({ from: 'remote', text, timestamp: Date.now() })
      }
    })

    conn.on('close', () => {
      sharedKeyRef.current = null
      connRef.current = null
    })

    conn.on('error', (err: Error) => {
      console.error('DataConnection error:', err)
    })
  }, [addMessage])

  // ... effects for joiner (peer.connect) and creator (peer.on('connection'))
}
```

### Pattern 3: Creator/Joiner DataChannel Symmetry

**What:** Mirror the existing `useCall` pattern — joiner calls `peer.connect(roomId)`, creator listens on `peer.on('connection', ...)`. CRITICAL: the creator's `peer.on('connection')` listener must be registered inside `useChat`, NOT re-using the one from `usePeer`, because PeerJS fires the event on the `Peer` instance, and `useCall` only handles `call` events.

**When to use:** Any time a second channel needs to be established alongside the MediaConnection.

```typescript
// Joiner side (in useChat useEffect, after peer is open)
const conn = peer.connect(roomId, { serialization: 'json', reliable: true })
setupConnection(conn)

// Creator side (in useChat useEffect)
peer.on('connection', (conn) => {
  setupConnection(conn)
})
```

### Anti-Patterns to Avoid

- **Sending messages before `conn.on('open')` fires:** DataConnection is not immediately ready after `peer.connect()`. Always wait for the `open` event before sending — including the key-exchange message.
- **Reusing the same IV:** AES-GCM security collapses if the same IV is reused with the same key. Always call `crypto.getRandomValues(new Uint8Array(12))` fresh for each message.
- **Storing messages in localStorage or sessionStorage:** Violates PRIV-01. All message state goes in Zustand (in-memory) only.
- **Using `serialization: 'binary'` in PeerJS:** Known Safari bugs. Use `serialization: 'json'` and base64-encode the ciphertext payload.
- **Deriving shared key before receiving peer's public key:** The ECDH `deriveKey` call requires the peer's public key, so the sequence is strictly: generate own key → send own public key → receive peer's public key → derive shared key. Messages cannot be decrypted before step 4.
- **Calling `peer.connect()` before the peer is open:** Check `peer.open === true` before connecting; otherwise listen for the `open` event first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Symmetric encryption | Custom XOR, Caesar, home-grown AES | `window.crypto.subtle.encrypt/decrypt` with AES-GCM | GCM provides authenticated encryption (AEAD) — confidentiality + integrity in one primitive; custom solutions miss authentication and are trivially broken |
| Key derivation | Manual hashing of concatenated keys | `subtle.deriveKey` with ECDH | Web Crypto handles all low-level ECC math and scalar multiplication correctly; doing this manually in JS is error-prone and not constant-time |
| Random IV generation | `Math.random()`, incrementing counter | `crypto.getRandomValues(new Uint8Array(12))` | `Math.random()` is not cryptographically secure; CSPRNG required for IV unpredictability |
| Message serialization | Custom binary protocol | JSON with base64 fields | PeerJS already handles DataChannel framing; JSON is reliable across all browsers including Safari |

**Key insight:** The Web Crypto API was designed exactly for this use case. Anything hand-rolled in userland JavaScript for cryptographic operations is almost certainly worse in both security and correctness.

---

## Common Pitfalls

### Pitfall 1: DataConnection `open` Event Missed on Receiver Side

**What goes wrong:** The creator registers `peer.on('connection', handler)` but the `conn.on('open')` event fires before the handler has a chance to register its own listeners. Result: the creator never sees the channel open and never sends its public key.

**Why it happens:** PeerJS fires the `connection` event when the DataConnection is established, but the `open` event can fire immediately afterward (sometimes synchronously in the same microtask queue). If the creator's handler sets up `conn.on('open')` asynchronously, it can miss it.

**How to avoid:** Set up all `conn.on(...)` listeners synchronously inside the `connection` handler — no `await` before registering. Check if `conn.open === true` after registering listeners as a fallback.

**Warning signs:** The joiner sends its key-exchange message, but the creator's `data` event shows the key before the creator's `open` event fires.

### Pitfall 2: Shared Key Not Ready When First Message Arrives

**What goes wrong:** The remote peer sends a chat message very quickly after key exchange completes on their side. On the local side, `deriveKey` is async and may not have resolved yet, so `sharedKeyRef.current` is null when the `data` event fires for the first message.

**Why it happens:** Async ordering between the two peers' key derivation.

**How to avoid:** Queue incoming encrypted messages in `pendingMessages.current` if `sharedKeyRef.current` is null. Flush the queue immediately after `sharedKeyRef.current` is set.

**Warning signs:** First message silently dropped; chat works for all subsequent messages.

### Pitfall 3: PeerJS Serialization Causes Binary Data Corruption

**What goes wrong:** Sending a raw `ArrayBuffer` over a PeerJS DataConnection with `serialization: 'binary'` silently mangles the data on Safari, because Safari's WebRTC DataChannel has historically had issues with binary blobs in the BinaryPack format PeerJS uses.

**Why it happens:** PeerJS v1.x uses BinaryPack for binary serialization; Safari's DataChannel implementation is stricter.

**How to avoid:** Use `serialization: 'json'` and encode all binary data (IV + ciphertext) as base64 strings. Overhead is ~33% but chat messages are small (typically under 1KB).

**Warning signs:** Messages arrive corrupted (decryption throws a DOMException) or don't arrive at all on Safari.

### Pitfall 4: ECDH Public Key exportKey Requires `extractable: true`

**What goes wrong:** `subtle.exportKey('spki', publicKey)` throws `DOMException: The key is not extractable`.

**Why it happens:** When generating the key pair, `extractable` must be `true` for both keys to allow export. The default is `false`.

**How to avoid:** Always pass `true` as the `extractable` parameter in `generateKey`. The private key does not need to be extractable — set it to `true` at the pair level (applies to both) or manage separately.

**Warning signs:** `DOMException: The key is not extractable` at export time.

### Pitfall 5: jsdom / Vitest SubtleCrypto Incompatibility

**What goes wrong:** Tests that call `window.crypto.subtle.generateKey()` in the jsdom environment throw `TypeError: Cannot read properties of undefined (reading 'generateKey')`.

**Why it happens:** jsdom does not implement SubtleCrypto. The Vitest jsdom environment uses jsdom, which lacks full Web Crypto support.

**How to avoid:** In `src/test/setup.ts`, polyfill or alias to Node's crypto:
```typescript
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}
```
Alternatively, extract all crypto calls into `lib/crypto.ts` and mock the entire module in unit tests — this is the preferred approach for hook tests. Only integration or e2e tests exercise real SubtleCrypto.

**Warning signs:** Tests pass locally on Node 20+ but fail in CI with older Node, or tests pass individually but fail when the setup file runs.

### Pitfall 6: Race Condition — `peer.connect()` Before Peer Is Open

**What goes wrong:** `useChat` calls `peer.connect(roomId)` in an effect that runs when `peerRef.current` is truthy, but the peer hasn't opened yet (`peer.open === false`). The connection attempt silently fails or produces an error.

**Why it happens:** `usePeer` sets `peerRef.current` synchronously when constructing the `Peer` object, but the peer only becomes `open` after the signaling server responds.

**How to avoid:** The `useCall` hook already waits for `peer.open === true` in its effects. `useChat` must do the same. Gate the `peer.connect()` call on `peerId` from the store (which is only set after `peer.on('open')` fires in `usePeer`).

---

## Code Examples

Verified patterns from official sources:

### ECDH Key Pair Generation

```typescript
// Source: MDN SubtleCrypto:generateKey() — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
const keyPair = await window.crypto.subtle.generateKey(
  { name: 'ECDH', namedCurve: 'P-256' },
  true,           // extractable — required for exportKey
  ['deriveKey']
)
```

### SPKI Public Key Export (for Wire Transport)

```typescript
// Source: MDN SubtleCrypto:exportKey() — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/exportKey
const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
const base64Key = btoa(String.fromCharCode(...new Uint8Array(spkiBuffer)))
// Send: { type: 'key-exchange', key: base64Key }
```

### SPKI Public Key Import

```typescript
// Source: MDN SubtleCrypto:importKey() — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
const peerPublicKey = await window.crypto.subtle.importKey(
  'spki',
  binary.buffer,
  { name: 'ECDH', namedCurve: 'P-256' },
  false,  // non-extractable is fine for imported peer key
  []      // no key usages for public keys used in ECDH
)
```

### Shared Key Derivation (ECDH → AES-GCM-256)

```typescript
// Source: MDN SubtleCrypto:deriveKey() — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey
const sharedKey = await window.crypto.subtle.deriveKey(
  { name: 'ECDH', public: peerPublicKey },
  myPrivateKey,
  { name: 'AES-GCM', length: 256 },
  false,              // sharedKey does not need to be extractable
  ['encrypt', 'decrypt']
)
```

### AES-GCM Encrypt with Fresh IV

```typescript
// Source: MDN SubtleCrypto — unique IV per message is mandatory
const iv = window.crypto.getRandomValues(new Uint8Array(12))
const ciphertext = await window.crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  sharedKey,
  new TextEncoder().encode(plaintextMessage)
)

// Wire payload = base64(IV[12] + ciphertext)
const combined = new Uint8Array(12 + ciphertext.byteLength)
combined.set(iv)
combined.set(new Uint8Array(ciphertext), 12)
const wirePayload = btoa(String.fromCharCode(...combined))
// Send: { type: 'message', payload: wirePayload }
```

### AES-GCM Decrypt

```typescript
// Source: MDN SubtleCrypto — IV must match the one used to encrypt
const bytes = Uint8Array.from(atob(wirePayload), c => c.charCodeAt(0))
const iv = bytes.slice(0, 12)
const cipherBytes = bytes.slice(12)
const plainBuffer = await window.crypto.subtle.decrypt(
  { name: 'AES-GCM', iv },
  sharedKey,
  cipherBytes
)
const message = new TextDecoder().decode(plainBuffer)
```

### PeerJS DataConnection Setup (JSON serialization for Safari compatibility)

```typescript
// Source: PeerJS docs — https://peerjs.com/docs/
// Joiner
const conn = peer.connect(roomId, { serialization: 'json', reliable: true })

// Creator
peer.on('connection', (conn) => {
  // Register all listeners synchronously — do NOT await before this
  conn.on('open', () => { /* send key-exchange */ })
  conn.on('data', (data) => { /* handle key-exchange or message */ })
  conn.on('close', () => { /* cleanup */ })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual RSA key exchange with third-party lib | Native ECDH via `window.crypto.subtle` | W3C Web Crypto API widely available since ~2017, now universal | Zero dependencies, hardware acceleration, standardized |
| Sending raw ArrayBuffer over PeerJS binary channel | JSON with base64-encoded payload | Established pattern post-PeerJS Safari issues (reported ~2019, ongoing) | Safari compatibility |
| Persisting keys in IndexedDB across sessions | Ephemeral in-memory keys per session | Architecture requirement (PRIV-01) | Simpler code, guaranteed ephemerality |

**Deprecated/outdated:**
- `crypto-js` library: superseded by native Web Crypto API; do not use
- PeerJS binary serialization for non-trivial payloads: avoid due to Safari DataChannel bugs
- Storing ECDH keys in `CryptoKey` extractable form long-term: not needed here (session only)

---

## Open Questions

1. **ECDH key exchange MITM risk**
   - What we know: Since public keys are exchanged over the PeerJS DataChannel (which uses DTLS/SRTP already), a network eavesdropper cannot see or modify them in transit. However, a malicious PeerJS signaling server could theoretically perform a MITM by substituting public keys.
   - What's unclear: The requirement states "no message content travels unencrypted over any network path" — this is satisfied. The MITM concern is out of scope for this project (no persistent identity, anonymous sessions).
   - Recommendation: Note the limitation in a code comment; do not implement key verification (out of scope for v1).

2. **DataChannel timing for creator who receives connection before joining**
   - What we know: The creator's `peer.on('connection')` event can fire before the creator has clicked "Join Meeting." The chat channel would open but the ECDH handshake would proceed immediately.
   - What's unclear: Whether this is a problem — the chat panel UI is only visible in `CallView` (which only renders when `connectionState === 'connected'`), so even if the channel is open and keys are exchanged, no messages will be sent.
   - Recommendation: Allow ECDH handshake to proceed as soon as the DataChannel opens, regardless of UI state. Gate the chat send button only on `isReady` (shared key derived) AND `connectionState === 'connected'`.

3. **Message size limits**
   - What we know: WebRTC DataChannel has a practical limit of ~16KB per message for reliable transport. AES-GCM ciphertext + base64 overhead will not approach this for typical chat messages.
   - What's unclear: No official PeerJS chunking guarantee for JSON-serialized messages.
   - Recommendation: Do not implement chunking. Enforce a reasonable UI character limit (e.g., 500 characters) on the input to keep messages well under limits.

---

## Validation Architecture

nyquist_validation is enabled (not explicitly disabled in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vite.config.ts` (test.environment: 'jsdom', test.globals: true) |
| Quick run command | `npx vitest run src/lib/crypto.test.ts src/hooks/useChat.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | ECDH key generation and SPKI export | unit | `npx vitest run src/lib/crypto.test.ts` | Wave 0 |
| CHAT-01 | Public key import and shared key derivation | unit | `npx vitest run src/lib/crypto.test.ts` | Wave 0 |
| CHAT-01 | AES-GCM encrypt produces different ciphertext for same plaintext (unique IV) | unit | `npx vitest run src/lib/crypto.test.ts` | Wave 0 |
| CHAT-01 | AES-GCM decrypt roundtrip: encrypt then decrypt returns original text | unit | `npx vitest run src/lib/crypto.test.ts` | Wave 0 |
| CHAT-01 | useChat sends key-exchange message on DataChannel open | unit | `npx vitest run src/hooks/useChat.test.ts` | Wave 0 |
| CHAT-01 | useChat decrypts received message after key exchange completes | unit | `npx vitest run src/hooks/useChat.test.ts` | Wave 0 |
| CHAT-01 | ChatPanel renders message list and input; send calls sendMessage | unit | `npx vitest run src/components/ChatPanel.test.tsx` | Wave 0 |
| CHAT-01 | Messages not in localStorage after send | unit | `npx vitest run src/hooks/useChat.test.ts` | Wave 0 |
| CHAT-01 | No plaintext in wire format (DevTools visible) | manual | — | Manual only — requires two-browser smoke test |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/crypto.test.ts src/hooks/useChat.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/crypto.test.ts` — covers ECDH keygen, export/import, deriveKey, encrypt/decrypt roundtrip, unique IV property
- [ ] `src/hooks/useChat.test.ts` — covers DataChannel lifecycle, key exchange state machine, message send/receive, queue flush
- [ ] `src/components/ChatPanel.test.tsx` — covers render, send button, message list display
- [ ] `src/test/setup.ts` update — add Node crypto polyfill for SubtleCrypto in jsdom:
  ```typescript
  import { webcrypto } from 'node:crypto'
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
  }
  ```

---

## Sources

### Primary (HIGH confidence)

- MDN SubtleCrypto:deriveKey() — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey — ECDH deriveKey patterns, HKDF, AES-GCM parameters
- MDN SubtleCrypto:exportKey() — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/exportKey — SPKI export to ArrayBuffer, base64 conversion
- MDN SubtleCrypto:importKey() — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey — ECDH P-256 SPKI import, EcKeyImportParams
- PeerJS Docs — https://peerjs.com/docs/ — DataConnection API, peer.connect(), peer.on('connection'), conn.send(), conn.on('data')
- PeerJS jsDocs — https://www.jsdocs.io/package/peerjs — DataConnection serialization options (json/binary/binary-utf8/none), send() signature
- Project source: `src/hooks/useCall.ts`, `src/store/index.ts`, `src/pages/RoomPage.tsx` — existing patterns for hook structure, store conventions, creator/joiner symmetry

### Secondary (MEDIUM confidence)

- Dev.to: End-to-End Encrypted Chat with the Web Crypto API — https://dev.to/cardoso/end-to-end-encrypted-chat-with-the-web-crypto-api-3d02 — wire format pattern (IV prepended to ciphertext, base64 encoded), confirmed against MDN
- Vitest GitHub discussion #893 — https://github.com/vitest-dev/vitest/discussions/893 — Node crypto polyfill for SubtleCrypto in jsdom; confirmed working on Node 17+
- Vitest issue #5365 — https://github.com/vitest-dev/vitest/issues/5365 — jsdom SubtleCrypto incompatibility confirmed

### Tertiary (LOW confidence)

- PeerJS GitHub issue #587 — https://github.com/peers/peerjs/issues/587 — Safari binary DataConnection send bug; use JSON serialization as mitigation (single source, older issue, but pattern widely echoed)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Web Crypto API is W3C standard, browser-universal, PeerJS DataConnection is already installed and verified in the project
- Architecture patterns: HIGH — ECDH + AES-GCM protocol verified from MDN official docs; creator/joiner DataChannel pattern mirrors Phase 3 MediaConnection pattern already in codebase
- Pitfalls: HIGH (IV/extractable/open-event) / MEDIUM (Safari serialization) — IV and extractable pitfalls confirmed from MDN; Safari binary serialization is a known historical issue (multiple reports, established workaround)
- Test setup: MEDIUM — Node crypto polyfill pattern confirmed from Vitest discussion; specific behavior with vitest 3.x jsdom not independently verified in fresh environment

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (Web Crypto API is stable; PeerJS 1.x API is stable)
