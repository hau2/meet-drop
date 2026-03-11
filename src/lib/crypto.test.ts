import { describe, it, expect } from 'vitest'
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
} from './crypto'

describe('generateKeyPair', () => {
  it('returns a CryptoKeyPair with publicKey and privateKey', async () => {
    const kp = await generateKeyPair()
    expect(kp.publicKey).toBeDefined()
    expect(kp.privateKey).toBeDefined()
  })

  it('publicKey is extractable', async () => {
    const kp = await generateKeyPair()
    expect(kp.publicKey.extractable).toBe(true)
  })
})

describe('exportPublicKey', () => {
  it('returns a non-empty base64 string', async () => {
    const kp = await generateKeyPair()
    const exported = await exportPublicKey(kp.publicKey)
    expect(typeof exported).toBe('string')
    expect(exported.length).toBeGreaterThan(0)
  })
})

describe('importPublicKey', () => {
  it('importPublicKey(exportPublicKey(key)) imports without throwing', async () => {
    const kp = await generateKeyPair()
    const exported = await exportPublicKey(kp.publicKey)
    await expect(importPublicKey(exported)).resolves.toBeDefined()
  })
})

describe('deriveSharedKey', () => {
  it('derives the same shared key for both peers (encrypt with A, decrypt with B)', async () => {
    const kpA = await generateKeyPair()
    const kpB = await generateKeyPair()

    const sharedKeyA = await deriveSharedKey(kpA.privateKey, kpB.publicKey)
    const sharedKeyB = await deriveSharedKey(kpB.privateKey, kpA.publicKey)

    // Verify same key by cross-encrypting/decrypting
    const plaintext = 'hello shared key'
    const ciphertext = await encryptMessage(sharedKeyA, plaintext)
    const decrypted = await decryptMessage(sharedKeyB, ciphertext)
    expect(decrypted).toBe(plaintext)
  })
})

describe('encryptMessage', () => {
  it('returns a non-empty base64 string', async () => {
    const kp = await generateKeyPair()
    const sharedKey = await deriveSharedKey(kp.privateKey, kp.publicKey)
    const result = await encryptMessage(sharedKey, 'hello')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('encrypting the same plaintext twice produces different ciphertext (unique IV)', async () => {
    const kp = await generateKeyPair()
    const sharedKey = await deriveSharedKey(kp.privateKey, kp.publicKey)
    const c1 = await encryptMessage(sharedKey, 'hello')
    const c2 = await encryptMessage(sharedKey, 'hello')
    expect(c1).not.toBe(c2)
  })
})

describe('decryptMessage', () => {
  it('roundtrip: decryptMessage(key, encryptMessage(key, text)) returns original text', async () => {
    const kp = await generateKeyPair()
    const sharedKey = await deriveSharedKey(kp.privateKey, kp.publicKey)
    const plaintext = 'hello world'
    const ciphertext = await encryptMessage(sharedKey, plaintext)
    const decrypted = await decryptMessage(sharedKey, ciphertext)
    expect(decrypted).toBe(plaintext)
  })

  it('decryptMessage with wrong key throws DOMException', async () => {
    const kpA = await generateKeyPair()
    const kpB = await generateKeyPair()
    const kpC = await generateKeyPair()

    const sharedKeyA = await deriveSharedKey(kpA.privateKey, kpB.publicKey)
    const sharedKeyWrong = await deriveSharedKey(kpC.privateKey, kpA.publicKey)

    const ciphertext = await encryptMessage(sharedKeyA, 'secret')
    await expect(decryptMessage(sharedKeyWrong, ciphertext)).rejects.toThrow()
  })
})
