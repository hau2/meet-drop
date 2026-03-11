import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCallStore } from '../store'

// Mock crypto module — unit tests should not exercise real crypto
vi.mock('../lib/crypto', () => ({
  generateKeyPair: vi.fn().mockResolvedValue({
    publicKey: { type: 'public' },
    privateKey: { type: 'private' },
  }),
  exportPublicKey: vi.fn().mockResolvedValue('mock-base64-public-key'),
  importPublicKey: vi.fn().mockResolvedValue({ type: 'public' }),
  deriveSharedKey: vi.fn().mockResolvedValue({ type: 'secret' }),
  encryptMessage: vi.fn().mockResolvedValue('mock-base64-ciphertext'),
  decryptMessage: vi.fn().mockResolvedValue('decrypted text'),
}))

// Mock peerjs
vi.mock('peerjs', () => {
  const mockConn = {
    on: vi.fn().mockReturnThis(),
    send: vi.fn(),
    close: vi.fn(),
    removeAllListeners: vi.fn(),
    open: false,
  }

  const mockInstance = {
    id: 'test-peer-id',
    open: true,
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    connect: vi.fn(() => mockConn),
    _mockConn: mockConn,
  }

  const MockPeer = vi.fn(() => mockInstance)
  ;(MockPeer as unknown as { _mockInstance: typeof mockInstance })._mockInstance = mockInstance

  return { default: MockPeer }
})

import { useChat } from './useChat'
import Peer from 'peerjs'
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
} from '../lib/crypto'
import { useRef } from 'react'

function getMockPeer() {
  return (Peer as unknown as { _mockInstance: ReturnType<typeof Peer> & { _mockConn: ReturnType<ReturnType<typeof Peer>['connect']> } })._mockInstance
}

function getMockConn() {
  return getMockPeer()._mockConn
}

// Helper to capture event handlers registered on an object via .on()
function captureHandlers(mockOnFn: ReturnType<typeof vi.fn>) {
  const handlers: Record<string, (...args: unknown[]) => void> = {}
  mockOnFn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    handlers[event] = handler
    return { on: mockOnFn, send: vi.fn(), close: vi.fn(), removeAllListeners: vi.fn(), open: false }
  })
  return handlers
}

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCallStore.getState().reset()
    useCallStore.setState({ peerId: 'test-peer-id' })

    // Re-set crypto mock return values after clearAllMocks clears them
    vi.mocked(generateKeyPair).mockResolvedValue({
      publicKey: { type: 'public' } as CryptoKey,
      privateKey: { type: 'private' } as CryptoKey,
    })
    vi.mocked(exportPublicKey).mockResolvedValue('mock-base64-public-key')
    vi.mocked(importPublicKey).mockResolvedValue({ type: 'public' } as CryptoKey)
    vi.mocked(deriveSharedKey).mockResolvedValue({ type: 'secret' } as CryptoKey)
    vi.mocked(encryptMessage).mockResolvedValue('mock-base64-ciphertext')
    vi.mocked(decryptMessage).mockResolvedValue('decrypted text')

    const inst = getMockPeer()
    const mockConn = getMockConn()

    // Re-wire mocks after clearAllMocks
    inst.on = vi.fn().mockReturnThis()
    inst.off = vi.fn().mockReturnThis()
    inst.open = true
    inst.id = 'test-peer-id'
    inst.connect = vi.fn(() => mockConn)

    mockConn.on = vi.fn().mockReturnThis()
    mockConn.send = vi.fn()
    mockConn.close = vi.fn()
    mockConn.removeAllListeners = vi.fn()
    mockConn.open = false

    ;(Peer as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => inst)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('joiner side (peer.id !== roomId)', () => {
    it('calls peer.connect(roomId) with json serialization when peer.id !== roomId', () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id' // different from roomId
      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>

      renderHook(() => useChat(peerRef, 'room-creator-id'))

      expect(inst.connect).toHaveBeenCalledWith('room-creator-id', {
        serialization: 'json',
        reliable: true,
      })
    })

    it('on open event: calls generateKeyPair, exportPublicKey, and sends key-exchange message', async () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const mockConn = getMockConn()
      const connHandlers = captureHandlers(mockConn.on)

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      renderHook(() => useChat(peerRef, 'room-creator-id'))

      // Simulate open event
      await act(async () => {
        await connHandlers['open']?.()
      })

      expect(generateKeyPair).toHaveBeenCalled()
      expect(exportPublicKey).toHaveBeenCalled()
      expect(mockConn.send).toHaveBeenCalledWith({
        type: 'key-exchange',
        key: 'mock-base64-public-key',
      })
    })

    it('on key-exchange data: calls importPublicKey and deriveSharedKey, sets isReady to true', async () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const mockConn = getMockConn()
      const connHandlers = captureHandlers(mockConn.on)

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      const { result } = renderHook(() => useChat(peerRef, 'room-creator-id'))

      // Trigger open first (to generate keypair)
      await act(async () => {
        await connHandlers['open']?.()
      })

      // Then receive key-exchange from peer
      await act(async () => {
        await connHandlers['data']?.({ type: 'key-exchange', key: 'peer-base64-public-key' })
      })

      expect(importPublicKey).toHaveBeenCalledWith('peer-base64-public-key')
      expect(deriveSharedKey).toHaveBeenCalled()
      expect(result.current.isReady).toBe(true)
    })

    it('sendMessage: encrypts text and sends over connection, adds to store as local message', async () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const mockConn = getMockConn()
      const connHandlers = captureHandlers(mockConn.on)

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      const { result } = renderHook(() => useChat(peerRef, 'room-creator-id'))

      // Complete handshake
      await act(async () => {
        await connHandlers['open']?.()
      })
      await act(async () => {
        await connHandlers['data']?.({ type: 'key-exchange', key: 'peer-base64-public-key' })
      })

      // Send a message
      await act(async () => {
        await result.current.sendMessage('hello world')
      })

      expect(encryptMessage).toHaveBeenCalledWith(expect.anything(), 'hello world')
      expect(mockConn.send).toHaveBeenCalledWith({
        type: 'message',
        payload: 'mock-base64-ciphertext',
      })

      const messages = useCallStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('local')
      expect(messages[0].text).toBe('hello world')
    })

    it('received message: decrypts and adds to store as remote message', async () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const mockConn = getMockConn()
      const connHandlers = captureHandlers(mockConn.on)

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      renderHook(() => useChat(peerRef, 'room-creator-id'))

      // Complete handshake
      await act(async () => {
        await connHandlers['open']?.()
      })
      await act(async () => {
        await connHandlers['data']?.({ type: 'key-exchange', key: 'peer-base64-public-key' })
      })

      // Receive a message
      await act(async () => {
        await connHandlers['data']?.({ type: 'message', payload: 'encrypted-payload' })
      })

      expect(decryptMessage).toHaveBeenCalledWith(expect.anything(), 'encrypted-payload')
      const messages = useCallStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('remote')
      expect(messages[0].text).toBe('decrypted text')
    })

    it('message received before key exchange is queued, then flushed after exchange', async () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const mockConn = getMockConn()
      const connHandlers = captureHandlers(mockConn.on)

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      renderHook(() => useChat(peerRef, 'room-creator-id'))

      // Open the connection (generates keypair, sends own key)
      await act(async () => {
        await connHandlers['open']?.()
      })

      // Receive a message BEFORE key exchange completes (sharedKey not ready yet)
      await act(async () => {
        await connHandlers['data']?.({ type: 'message', payload: 'early-payload' })
      })

      // Should NOT be in store yet
      expect(useCallStore.getState().messages).toHaveLength(0)
      expect(decryptMessage).not.toHaveBeenCalled()

      // Now complete key exchange — should flush the queued message
      await act(async () => {
        await connHandlers['data']?.({ type: 'key-exchange', key: 'peer-base64-public-key' })
      })

      expect(decryptMessage).toHaveBeenCalledWith(expect.anything(), 'early-payload')
      const messages = useCallStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('remote')
    })
  })

  describe('creator side (peer.id === roomId)', () => {
    it('registers peer.on("connection") handler when peer.id === roomId', () => {
      const inst = getMockPeer()
      inst.id = 'room-creator-id'
      const peerHandlers = captureHandlers(inst.on)

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      renderHook(() => useChat(peerRef, 'room-creator-id'))

      expect(peerHandlers['connection']).toBeDefined()
      expect(inst.connect).not.toHaveBeenCalled()
    })

    it('creator: on connection event, registers conn listeners synchronously', async () => {
      const inst = getMockPeer()
      inst.id = 'room-creator-id'
      let connectionHandler: ((conn: typeof mockConn) => void) | undefined
      const mockConn = {
        on: vi.fn().mockReturnThis(),
        send: vi.fn(),
        close: vi.fn(),
        removeAllListeners: vi.fn(),
        open: false,
      }

      inst.on = vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'connection') connectionHandler = handler as (conn: typeof mockConn) => void
        return inst
      })

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      renderHook(() => useChat(peerRef, 'room-creator-id'))

      // Simulate incoming connection
      act(() => {
        connectionHandler!(mockConn)
      })

      // Listeners should be registered synchronously
      expect(mockConn.on).toHaveBeenCalledWith('open', expect.any(Function))
      expect(mockConn.on).toHaveBeenCalledWith('data', expect.any(Function))
      expect(mockConn.on).toHaveBeenCalledWith('close', expect.any(Function))
      expect(mockConn.on).toHaveBeenCalledWith('error', expect.any(Function))
    })
  })

  describe('cleanup', () => {
    it('unmount closes the DataConnection', async () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const mockConn = getMockConn()
      mockConn.on = vi.fn().mockReturnThis()

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      const { unmount } = renderHook(() => useChat(peerRef, 'room-creator-id'))

      unmount()

      expect(mockConn.close).toHaveBeenCalled()
    })
  })

  describe('isReady', () => {
    it('isReady is false initially', () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      const { result } = renderHook(() => useChat(peerRef, 'room-creator-id'))

      expect(result.current.isReady).toBe(false)
    })

    it('sendMessage is a no-op when isReady is false (no shared key)', async () => {
      const inst = getMockPeer()
      inst.id = 'joiner-peer-id'
      const mockConn = getMockConn()
      mockConn.on = vi.fn().mockReturnThis()

      const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
      const { result } = renderHook(() => useChat(peerRef, 'room-creator-id'))

      await act(async () => {
        await result.current.sendMessage('should not send')
      })

      expect(encryptMessage).not.toHaveBeenCalled()
      expect(mockConn.send).not.toHaveBeenCalled()
    })
  })
})
