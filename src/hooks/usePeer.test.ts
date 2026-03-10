import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'

// vi.mock is hoisted — must NOT reference module-level variables inside the factory
vi.mock('peerjs', () => {
  const mockInstance = {
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    id: 'test-peer-id',
  }
  const MockPeer = vi.fn(() => mockInstance)
  ;(MockPeer as unknown as { _mockInstance: typeof mockInstance })._mockInstance = mockInstance
  return { default: MockPeer }
})

vi.mock('../store', () => ({
  useCallStore: vi.fn(() => ({
    setConnectionState: vi.fn(),
    setPeerId: vi.fn(),
  })),
}))

// Import after mocks are set up
import { usePeer } from './usePeer'
import Peer from 'peerjs'

function getMockPeer() {
  return (Peer as unknown as { _mockInstance: ReturnType<typeof Peer> })._mockInstance
}

describe('usePeer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const inst = getMockPeer()
    if (inst) {
      inst.on = vi.fn().mockReturnThis()
      inst.destroy = vi.fn()
    }
    ;(Peer as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => getMockPeer())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates exactly one Peer instance under React Strict Mode', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children)

    renderHook(() => usePeer('test-room'), { wrapper })

    // Despite StrictMode running effects twice, guard prevents second Peer creation
    expect(Peer).toHaveBeenCalledTimes(1)
  })

  it('passes iceServers config including TURN to Peer constructor', () => {
    renderHook(() => usePeer('test-room'))

    expect(Peer).toHaveBeenCalledTimes(1)

    const MockPeerFn = Peer as unknown as ReturnType<typeof vi.fn>
    const callArgs = MockPeerFn.mock.calls[0]
    // Second arg is the config object
    const config = callArgs[1]

    expect(config).toBeDefined()
    expect(config.config).toBeDefined()
    expect(Array.isArray(config.config.iceServers)).toBe(true)
    expect(config.config.iceServers.length).toBeGreaterThanOrEqual(2)

    // At least one entry should have a turn: URL
    const hasTurn = config.config.iceServers.some((server: { urls: string | string[] }) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((u: string) => u.startsWith('turn:'))
    })
    expect(hasTurn).toBe(true)
  })

  it('registers beforeunload event listener on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    renderHook(() => usePeer('test-room'))

    const beforeunloadCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload'
    )
    expect(beforeunloadCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('removes beforeunload event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => usePeer('test-room'))
    unmount()

    const beforeunloadCalls = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload'
    )
    expect(beforeunloadCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('calls peer.destroy() on cleanup', () => {
    const mockInst = getMockPeer()
    const { unmount } = renderHook(() => usePeer('test-room'))

    unmount()

    expect(mockInst.destroy).toHaveBeenCalled()
  })
})
