import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetworkQuality } from './useNetworkQuality'
import type { NetworkQuality } from './useNetworkQuality'

// Helper to build a fake RTCStatsReport (Map-like) with candidate-pair and outbound-rtp entries
function makeStatsReport({
  rtt = 0,
  nackCount = 0,
  packetsSent = 1000,
}: {
  rtt?: number
  nackCount?: number
  packetsSent?: number
}) {
  const entries = new Map<string, Record<string, unknown>>()
  entries.set('candidate-pair-1', {
    type: 'candidate-pair',
    state: 'succeeded',
    currentRoundTripTime: rtt,
  })
  entries.set('outbound-rtp-1', {
    type: 'outbound-rtp',
    kind: 'video',
    nackCount,
    packetsSent,
  })
  return entries
}

describe('useNetworkQuality', () => {
  let callRef: { current: { peerConnection: { getStats: ReturnType<typeof vi.fn> } } | null }
  let getStatsMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    getStatsMock = vi.fn()
    callRef = {
      current: {
        peerConnection: {
          getStats: getStatsMock,
        },
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns null when active=false', () => {
    const { result } = renderHook(() =>
      useNetworkQuality(
        callRef as Parameters<typeof useNetworkQuality>[0],
        false
      )
    )
    expect(result.current).toBeNull()
  })

  it('returns null initially when active=true and no stats collected yet', () => {
    getStatsMock.mockResolvedValue(makeStatsReport({ rtt: 0.05, nackCount: 0, packetsSent: 100 }))
    const { result } = renderHook(() =>
      useNetworkQuality(
        callRef as Parameters<typeof useNetworkQuality>[0],
        true
      )
    )
    // Before first interval fires, quality should be null
    expect(result.current).toBeNull()
  })

  it('returns "good" when packet loss < 2% and RTT < 150ms', async () => {
    // First call: baseline stats
    getStatsMock
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.05, nackCount: 0, packetsSent: 100 }))
      // Second call: good stats (delta nack=0, delta packets=100, rtt=0.05)
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.05, nackCount: 0, packetsSent: 200 }))

    const { result } = renderHook(() =>
      useNetworkQuality(
        callRef as Parameters<typeof useNetworkQuality>[0],
        true
      )
    )

    // First interval tick
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    // Second interval tick (now has previous stats to compute delta)
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(result.current).toBe('good')
  })

  it('returns "fair" when packet loss < 8% and RTT < 400ms', async () => {
    // First call: baseline
    getStatsMock
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.2, nackCount: 0, packetsSent: 100 }))
      // Second call: fair stats (3% loss, 200ms RTT)
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.2, nackCount: 3, packetsSent: 200 }))

    const { result } = renderHook(() =>
      useNetworkQuality(
        callRef as Parameters<typeof useNetworkQuality>[0],
        true
      )
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(result.current).toBe('fair')
  })

  it('returns "poor" when packet loss >= 8%', async () => {
    // First call: baseline
    getStatsMock
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.05, nackCount: 0, packetsSent: 100 }))
      // Second call: poor stats (10% loss)
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.05, nackCount: 10, packetsSent: 200 }))

    const { result } = renderHook(() =>
      useNetworkQuality(
        callRef as Parameters<typeof useNetworkQuality>[0],
        true
      )
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(result.current).toBe('poor')
  })

  it('returns "poor" when RTT >= 400ms', async () => {
    // First call: baseline
    getStatsMock
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.5, nackCount: 0, packetsSent: 100 }))
      // Second call: high RTT
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.5, nackCount: 0, packetsSent: 200 }))

    const { result } = renderHook(() =>
      useNetworkQuality(
        callRef as Parameters<typeof useNetworkQuality>[0],
        true
      )
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(result.current).toBe('poor')
  })

  it('resets quality to null when active becomes false', async () => {
    getStatsMock
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.05, nackCount: 0, packetsSent: 100 }))
      .mockResolvedValueOnce(makeStatsReport({ rtt: 0.05, nackCount: 0, packetsSent: 200 }))

    let active = true
    const { result, rerender } = renderHook(() =>
      useNetworkQuality(
        callRef as Parameters<typeof useNetworkQuality>[0],
        active
      )
    )

    // Get to good quality
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    expect(result.current).toBe('good')

    // Deactivate
    active = false
    rerender()

    expect(result.current).toBeNull()
  })
})
