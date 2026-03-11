import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScreenShare } from './useScreenShare'

// Fake display track and stream
function makeFakeDisplayTrack() {
  return {
    kind: 'video',
    stop: vi.fn(),
    onended: null as (() => void) | null,
  }
}

describe('useScreenShare', () => {
  let fakeDisplayTrack: ReturnType<typeof makeFakeDisplayTrack>
  let fakeScreenCall: { close: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; peer: string }
  let fakePeer: { call: ReturnType<typeof vi.fn> }
  let fakeCall: { peer: string }
  let peerRef: { current: typeof fakePeer | null }
  let callRef: { current: typeof fakeCall | null }

  beforeEach(() => {
    fakeDisplayTrack = makeFakeDisplayTrack()
    fakeScreenCall = {
      close: vi.fn(),
      on: vi.fn(),
      peer: 'remote-peer-id',
    }
    fakePeer = {
      call: vi.fn().mockReturnValue(fakeScreenCall),
    }
    fakeCall = { peer: 'remote-peer-id' }
    peerRef = { current: fakePeer }
    callRef = { current: fakeCall }

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
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )
    expect(result.current.isScreenSharing).toBe(false)
  })

  it('startScreenShare calls getDisplayMedia and opens a second peer call', async () => {
    const { result } = renderHook(() =>
      useScreenShare(
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false })
    expect(fakePeer.call).toHaveBeenCalledWith(
      'remote-peer-id',
      expect.anything(),
      { metadata: { type: 'screenshare' } }
    )
  })

  it('startScreenShare sets isScreenSharing to true', async () => {
    const { result } = renderHook(() =>
      useScreenShare(
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(result.current.isScreenSharing).toBe(true)
  })

  it('startScreenShare attaches onended handler to display track', async () => {
    const { result } = renderHook(() =>
      useScreenShare(
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(fakeDisplayTrack.onended).toBeTypeOf('function')
  })

  it('stopScreenShare stops display track and closes the screen call', async () => {
    const { result } = renderHook(() =>
      useScreenShare(
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    await act(async () => {
      result.current.stopScreenShare()
    })

    expect(fakeDisplayTrack.stop).toHaveBeenCalled()
    expect(fakeScreenCall.close).toHaveBeenCalled()
  })

  it('stopScreenShare sets isScreenSharing to false', async () => {
    const { result } = renderHook(() =>
      useScreenShare(
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(result.current.isScreenSharing).toBe(true)

    await act(async () => {
      result.current.stopScreenShare()
    })

    expect(result.current.isScreenSharing).toBe(false)
  })

  it('when displayTrack.onended fires, screen call is closed automatically', async () => {
    const { result } = renderHook(() =>
      useScreenShare(
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    const onendedHandler = fakeDisplayTrack.onended as (() => void) | null
    expect(onendedHandler).toBeTypeOf('function')

    await act(async () => {
      onendedHandler!()
    })

    expect(fakeScreenCall.close).toHaveBeenCalled()
    expect(result.current.isScreenSharing).toBe(false)
  })

  it('startScreenShare silently catches NotAllowedError when user cancels picker', async () => {
    const cancelError = new DOMException('Permission denied', 'NotAllowedError')
    ;(navigator.mediaDevices.getDisplayMedia as ReturnType<typeof vi.fn>).mockRejectedValue(cancelError)

    const { result } = renderHook(() =>
      useScreenShare(
        peerRef as Parameters<typeof useScreenShare>[0],
        callRef as Parameters<typeof useScreenShare>[1],
      )
    )

    await act(async () => {
      await result.current.startScreenShare()
    })

    expect(result.current.isScreenSharing).toBe(false)
  })
})
