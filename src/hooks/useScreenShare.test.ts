import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useScreenShare } from './useScreenShare'

// Fake display track and stream
function makeFakeDisplayTrack() {
  return {
    kind: 'video',
    stop: vi.fn(),
    onended: null as (() => void) | null,
  }
}

function makeFakeCameraTrack() {
  return {
    kind: 'video',
    stop: vi.fn(),
    onended: null as (() => void) | null,
  }
}

function makeFakeSender(track: unknown) {
  return {
    track,
    replaceTrack: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useScreenShare', () => {
  let fakeDisplayTrack: ReturnType<typeof makeFakeDisplayTrack>
  let fakeCameraTrack: ReturnType<typeof makeFakeCameraTrack>
  let fakeSender: ReturnType<typeof makeFakeSender>
  let fakePeerConnection: { getSenders: ReturnType<typeof vi.fn> }
  let fakeCall: { peerConnection: typeof fakePeerConnection }
  let callRef: { current: typeof fakeCall | null }
  let streamRef: { current: { getVideoTracks: () => typeof fakeCameraTrack[] } | null }

  beforeEach(() => {
    fakeDisplayTrack = makeFakeDisplayTrack()
    fakeCameraTrack = makeFakeCameraTrack()
    fakeSender = makeFakeSender(fakeCameraTrack)
    fakePeerConnection = {
      getSenders: vi.fn().mockReturnValue([fakeSender]),
    }
    fakeCall = { peerConnection: fakePeerConnection }
    callRef = { current: fakeCall }
    streamRef = { current: { getVideoTracks: () => [fakeCameraTrack] } }

    // Mock getDisplayMedia
    const fakeDisplayStream = {
      getVideoTracks: () => [fakeDisplayTrack],
    }
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getDisplayMedia: vi.fn().mockResolvedValue(fakeDisplayStream),
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initially isScreenSharing is false', () => {
    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )
    expect(result.current.isScreenSharing).toBe(false)
  })

  it('startScreenShare calls getDisplayMedia and replaces video sender track', async () => {
    const { useScreenShare } = await import('./useScreenShare')
    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false })
    expect(fakeSender.replaceTrack).toHaveBeenCalledWith(fakeDisplayTrack)
  })

  it('startScreenShare sets isScreenSharing to true', async () => {
    const { useScreenShare } = await import('./useScreenShare')
    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(result.current.isScreenSharing).toBe(true)
  })

  it('startScreenShare attaches onended handler to display track', async () => {
    const { useScreenShare } = await import('./useScreenShare')
    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(fakeDisplayTrack.onended).toBeTypeOf('function')
  })

  it('stopScreenShare stops display track and restores camera track via replaceTrack', async () => {
    const { useScreenShare } = await import('./useScreenShare')
    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    // Reset replaceTrack call count
    fakeSender.replaceTrack.mockClear()

    await act(async () => {
      await result.current.stopScreenShare()
    })

    expect(fakeDisplayTrack.stop).toHaveBeenCalled()
    expect(fakeSender.replaceTrack).toHaveBeenCalledWith(fakeCameraTrack)
  })

  it('stopScreenShare sets isScreenSharing to false', async () => {
    const { useScreenShare } = await import('./useScreenShare')
    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(result.current.isScreenSharing).toBe(true)

    await act(async () => {
      await result.current.stopScreenShare()
    })

    expect(result.current.isScreenSharing).toBe(false)
  })

  it('when displayTrack.onended fires, camera track is restored automatically', async () => {
    const { useScreenShare } = await import('./useScreenShare')
    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    // Capture the onended handler
    const onendedHandler = fakeDisplayTrack.onended as (() => void) | null
    expect(onendedHandler).toBeTypeOf('function')

    // Reset to track the restore call
    fakeSender.replaceTrack.mockClear()

    // Fire the OS stop-sharing button handler
    await act(async () => {
      onendedHandler!()
    })

    expect(fakeSender.replaceTrack).toHaveBeenCalledWith(fakeCameraTrack)
    expect(result.current.isScreenSharing).toBe(false)
  })

  it('startScreenShare silently catches NotAllowedError when user cancels picker', async () => {
    const { useScreenShare } = await import('./useScreenShare')
    const cancelError = new DOMException('Permission denied', 'NotAllowedError')
    ;(navigator.mediaDevices.getDisplayMedia as ReturnType<typeof vi.fn>).mockRejectedValue(cancelError)

    const { result } = renderHook(() =>
      useScreenShare(
        callRef as Parameters<typeof useScreenShare>[0],
        streamRef as Parameters<typeof useScreenShare>[1]
      )
    )

    // Should not throw
    await act(async () => {
      await result.current.startScreenShare()
    })

    // isScreenSharing stays false
    expect(result.current.isScreenSharing).toBe(false)
  })
})
