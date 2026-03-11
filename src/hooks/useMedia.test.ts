import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMedia } from './useMedia'
import { useCallStore } from '../store'

// Mock tracks and stream
const mockAudioTrack = { kind: 'audio', enabled: true, stop: vi.fn() }
const mockVideoTrack = { kind: 'video', enabled: true, stop: vi.fn() }
const mockStream = {
  getTracks: () => [mockAudioTrack, mockVideoTrack],
  getAudioTracks: () => [mockAudioTrack],
  getVideoTracks: () => [mockVideoTrack],
}

const mockGetUserMedia = vi.fn()

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  mockAudioTrack.enabled = true
  mockVideoTrack.enabled = true
  mockGetUserMedia.mockResolvedValue(mockStream)
  // Reset store
  useCallStore.getState().reset()
})

describe('useMedia', () => {
  it('Test 1: calls getUserMedia on mount with video+audio constraints', async () => {
    const { result } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetUserMedia).toHaveBeenCalledTimes(1)
    const constraints = mockGetUserMedia.mock.calls[0][0]
    expect(constraints.video).toBeDefined()
    expect(constraints.audio).toBeDefined()
  })

  it('Test 2: stops all tracks on unmount', async () => {
    const { result, unmount } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    unmount()

    expect(mockAudioTrack.stop).toHaveBeenCalled()
    expect(mockVideoTrack.stop).toHaveBeenCalled()
  })

  it('Test 3: sets cancelled flag and stops orphaned stream if unmount before getUserMedia resolves', async () => {
    let resolveStream!: (stream: typeof mockStream) => void
    const slowPromise = new Promise<typeof mockStream>((resolve) => {
      resolveStream = resolve
    })
    mockGetUserMedia.mockReturnValue(slowPromise)

    const { unmount } = renderHook(() => useMedia())

    // Unmount before promise resolves
    unmount()

    // Now resolve with a stream that has its own stop mocks
    const orphanStop = vi.fn()
    const orphanStream = {
      getTracks: () => [{ stop: orphanStop }, { stop: orphanStop }],
      getAudioTracks: () => [{ enabled: true, stop: orphanStop }],
      getVideoTracks: () => [{ enabled: true, stop: orphanStop }],
    }
    resolveStream(orphanStream as unknown as typeof mockStream)

    // Wait for the promise to settle and cleanup to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    // Orphaned stream tracks should be stopped
    expect(orphanStop).toHaveBeenCalled()
  })

  it('Test 4: toggleMic sets audioTrack.enabled to false and store isMicOn to false', async () => {
    const { result } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(useCallStore.getState().isMicOn).toBe(true)

    act(() => {
      result.current.toggleMic()
    })

    expect(mockAudioTrack.enabled).toBe(false)
    expect(useCallStore.getState().isMicOn).toBe(false)
  })

  it('Test 5: toggleMic sets audioTrack.enabled back to true and store isMicOn to true', async () => {
    const { result } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.toggleMic()
    })
    expect(mockAudioTrack.enabled).toBe(false)
    expect(useCallStore.getState().isMicOn).toBe(false)

    act(() => {
      result.current.toggleMic()
    })
    expect(mockAudioTrack.enabled).toBe(true)
    expect(useCallStore.getState().isMicOn).toBe(true)
  })

  it('Test 6: toggleCamera sets videoTrack.enabled to false and store isCameraOn to false', async () => {
    const { result } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(useCallStore.getState().isCameraOn).toBe(true)

    act(() => {
      result.current.toggleCamera()
    })

    expect(mockVideoTrack.enabled).toBe(false)
    expect(useCallStore.getState().isCameraOn).toBe(false)
  })

  it('Test 7: getUserMedia NotAllowedError sets error to not-allowed', async () => {
    const err = new DOMException('Permission denied', 'NotAllowedError')
    mockGetUserMedia.mockRejectedValue(err)

    const { result } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('not-allowed')
  })

  it('Test 8: getUserMedia NotFoundError sets error to not-found', async () => {
    const err = new DOMException('No device found', 'NotFoundError')
    mockGetUserMedia.mockRejectedValue(err)

    const { result } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('not-found')
  })

  it('Test 9: Store reset() clears isMicOn and isCameraOn back to true', async () => {
    const { result } = renderHook(() => useMedia())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Toggle both off
    act(() => {
      result.current.toggleMic()
      result.current.toggleCamera()
    })

    expect(useCallStore.getState().isMicOn).toBe(false)
    expect(useCallStore.getState().isCameraOn).toBe(false)

    // Reset store
    act(() => {
      useCallStore.getState().reset()
    })

    expect(useCallStore.getState().isMicOn).toBe(true)
    expect(useCallStore.getState().isCameraOn).toBe(true)
  })
})
