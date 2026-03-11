/**
 * Crypto module: ECDH key exchange + AES-GCM-256 encryption
 *
 * Uses browser-native Web Crypto API (window.crypto.subtle).
 * Note: ECDH public keys are exchanged over DTLS-protected PeerJS DataChannel.
 * A malicious signaling server could theoretically perform MITM — out of scope for v1.
 */

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,         // extractable — required for exportKey (SPKI)
    ['deriveKey']
  )
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await window.crypto.subtle.exportKey('spki', publicKey)
  return btoa(String.fromCharCode(...new Uint8Array(spki)))
}

export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const binaryStr = atob(base64Spki)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return window.crypto.subtle.importKey(
    'spki',
    bytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,  // non-extractable for imported peer key
    []      // no usages for public keys; used implicitly in deriveKey
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
    false,              // shared key does not need to be extractable
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
  const binaryStr = atob(base64Payload)
  const combined = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    combined[i] = binaryStr.charCodeAt(i)
  }
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}
