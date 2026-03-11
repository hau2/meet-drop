import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCallStore } from '../store'

// Mock peerjs — must be hoisted
vi.mock('peerjs', () => {
  const mockCall = {
    on: vi.fn().mockReturnThis(),
    answer: vi.fn(),
    close: vi.fn(),
    peer: 'remote-peer',
  }

  const mockInstance = {
    id: 'test-peer-id',
    open: true,
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    call: vi.fn(() => mockCall),
    destroy: vi.fn(),
    _mockCall: mockCall,
  }

  const MockPeer = vi.fn(() => mockInstance)
  ;(MockPeer as unknown as { _mockInstance: typeof mockInstance })._mockInstance = mockInstance

  return { default: MockPeer }
})

// Mock sounds
vi.mock('../lib/sounds', () => ({
  playJoinSound: vi.fn().mockResolvedValue(undefined),
  playLeaveSound: vi.fn().mockResolvedValue(undefined),
}))

import { useCall } from './useCall'
import Peer from 'peerjs'
import { playJoinSound, playLeaveSound } from '../lib/sounds'
import { useRef } from 'react'

function getMockPeer() {
  return (Peer as unknown as { _mockInstance: ReturnType<typeof Peer> & { _mockCall: ReturnType<ReturnType<typeof Peer>['call']> } })._mockInstance
}

function getMockCall() {
  return getMockPeer()._mockCall
}

// Helper to capture event handlers registered on an object via .on()
function captureHandlers(mockOnFn: ReturnType<typeof vi.fn>) {
  const handlers: Record<string, (...args: unknown[]) => void> = {}
  mockOnFn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    handlers[event] = handler
    return { on: mockOnFn }
  })
  return handlers
}

describe('useCall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCallStore.getState().reset()
    // Set peerId and joined so useCall effect triggers (it depends on both)
    useCallStore.setState({ peerId: 'test-peer-id', joined: true })

    const inst = getMockPeer()
    const mockCall = getMockCall()

    // Re-wire mocks after clearAllMocks
    inst.on = vi.fn().mockReturnThis()
    inst.off = vi.fn().mockReturnThis()
    inst.open = true
    inst.call = vi.fn(() => mockCall)
    mockCall.on = vi.fn().mockReturnThis()
    mockCall.answer = vi.fn()
    mockCall.close = vi.fn()
    ;(Peer as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => inst)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('joiner: calls peer.call(roomId, stream) when peer.id !== roomId', () => {
    const inst = getMockPeer()
    inst.id = 'joiner-peer-id' // different from roomId

    const mockStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    renderHook(() => useCall(peerRef, streamRef, 'room-creator-id'))

    expect(inst.call).toHaveBeenCalledWith('room-creator-id', mockStream)
  })

  it('joiner: subscribes to call events after peer.call()', () => {
    const inst = getMockPeer()
    inst.id = 'joiner-peer-id'
    const mockCall = getMockCall()
    const callHandlers = captureHandlers(mockCall.on)

    const mockStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    renderHook(() => useCall(peerRef, streamRef, 'room-creator-id'))

    // stream, close, and error handlers should be registered
    expect(callHandlers['stream']).toBeDefined()
    expect(callHandlers['close']).toBeDefined()
    expect(callHandlers['error']).toBeDefined()
  })

  it('creator: registers peer.on("call") handler when peer.id === roomId', () => {
    const inst = getMockPeer()
    inst.id = 'room-abc123'  // same as roomId
    const peerHandlers = captureHandlers(inst.on)

    const mockStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    renderHook(() => useCall(peerRef, streamRef, 'room-abc123'))

    expect(peerHandlers['call']).toBeDefined()
    expect(inst.call).not.toHaveBeenCalled()
  })

  it('creator: answers incoming call with local stream', () => {
    const inst = getMockPeer()
    inst.id = 'room-abc123'
    const mockCall = getMockCall()
    let peerCallHandler: ((call: typeof mockCall) => void) | undefined

    inst.on = vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'call') peerCallHandler = handler as (call: typeof mockCall) => void
      return inst
    })

    const mockStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    renderHook(() => useCall(peerRef, streamRef, 'room-abc123'))

    // Simulate incoming call
    act(() => {
      peerCallHandler!(mockCall)
    })

    expect(mockCall.answer).toHaveBeenCalledWith(mockStream)
  })

  it('stream event: sets connectionState to connected, wasConnected to true, plays join sound', async () => {
    const inst = getMockPeer()
    inst.id = 'joiner-peer-id'
    const mockCall = getMockCall()
    let streamHandler: ((stream: MediaStream) => void) | undefined

    mockCall.on = vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'stream') streamHandler = handler as (stream: MediaStream) => void
      return mockCall
    })

    const mockStream = {} as MediaStream
    const remoteStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    renderHook(() => useCall(peerRef, streamRef, 'room-abc123'))

    await act(async () => {
      streamHandler!(remoteStream)
    })

    const state = useCallStore.getState()
    expect(state.connectionState).toBe('connected')
    expect(state.wasConnected).toBe(true)
    expect(playJoinSound).toHaveBeenCalled()
  })

  it('close event after connection: sets callEnded true, plays leave sound', async () => {
    const inst = getMockPeer()
    inst.id = 'joiner-peer-id'
    const mockCall = getMockCall()
    let streamHandler: ((stream: MediaStream) => void) | undefined
    let closeHandler: (() => void) | undefined

    mockCall.on = vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'stream') streamHandler = handler as (stream: MediaStream) => void
      if (event === 'close') closeHandler = handler as () => void
      return mockCall
    })

    const mockStream = {} as MediaStream
    const remoteStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    renderHook(() => useCall(peerRef, streamRef, 'room-abc123'))

    // First connect
    await act(async () => {
      streamHandler!(remoteStream)
    })

    // Then close
    await act(async () => {
      closeHandler!()
    })

    const state = useCallStore.getState()
    expect(state.callEnded).toBe(true)
    expect(playLeaveSound).toHaveBeenCalled()
  })

  it('close event before stream (wasConnected=false): sets connectionState to failed, does NOT set callEnded', async () => {
    const inst = getMockPeer()
    inst.id = 'joiner-peer-id'
    const mockCall = getMockCall()
    let closeHandler: (() => void) | undefined

    mockCall.on = vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'close') closeHandler = handler as () => void
      return mockCall
    })

    const mockStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    renderHook(() => useCall(peerRef, streamRef, 'room-abc123'))

    // Close without ever getting stream
    await act(async () => {
      closeHandler!()
    })

    const state = useCallStore.getState()
    expect(state.connectionState).toBe('failed')
    expect(state.callEnded).toBe(false)
    expect(playLeaveSound).not.toHaveBeenCalled()
  })

  it('hangUp: closes call, sets connectionState to disconnected, sets callEnded to true', async () => {
    const inst = getMockPeer()
    inst.id = 'joiner-peer-id'
    const mockCall = getMockCall()
    mockCall.on = vi.fn().mockReturnThis()

    const mockStream = {} as MediaStream
    const peerRef = { current: inst } as ReturnType<typeof useRef<Peer | null>>
    const streamRef = { current: mockStream } as ReturnType<typeof useRef<MediaStream | null>>

    const { result } = renderHook(() => useCall(peerRef, streamRef, 'room-abc123'))

    act(() => {
      result.current.hangUp()
    })

    expect(mockCall.close).toHaveBeenCalled()
    const state = useCallStore.getState()
    expect(state.connectionState).toBe('disconnected')
    expect(state.callEnded).toBe(true)
  })
})
