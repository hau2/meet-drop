import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { usePeer } from './usePeer'

// Mock peerjs module
const mockPeerInstance = {
  on: vi.fn(),
  destroy: vi.fn(),
  id: 'test-peer-id',
}

const MockPeer = vi.fn(() => mockPeerInstance)

vi.mock('peerjs', () => ({
  default: MockPeer,
}))

// Mock the store
vi.mock('../store', () => ({
  useCallStore: vi.fn(() => ({
    setConnectionState: vi.fn(),
    setPeerId: vi.fn(),
  })),
}))

describe('usePeer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPeerInstance.on.mockImplementation(() => mockPeerInstance)
    mockPeerInstance.destroy.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates exactly one Peer instance under React Strict Mode', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children)

    renderHook(() => usePeer('test-room'), { wrapper })

    // Despite StrictMode running effects twice, guard prevents second Peer creation
    expect(MockPeer).toHaveBeenCalledTimes(1)
  })

  it('passes iceServers config including TURN to Peer constructor', () => {
    renderHook(() => usePeer('test-room'))

    expect(MockPeer).toHaveBeenCalledTimes(1)

    const callArgs = MockPeer.mock.calls[0]
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
    const { unmount } = renderHook(() => usePeer('test-room'))

    unmount()

    expect(mockPeerInstance.destroy).toHaveBeenCalled()
  })
})
