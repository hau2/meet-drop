import { useState, useRef, useCallback } from 'react'
import type { RefObject } from 'react'
import type { MediaConnection } from 'peerjs'

export function useScreenShare(
  callRef: RefObject<MediaConnection | null>,
  streamRef: RefObject<MediaStream | null>
) {
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const displayTrackRef = useRef<MediaStreamTrack | null>(null)

  const stopScreenShare = useCallback(async () => {
    // Stop and release the display capture track
    displayTrackRef.current?.stop()
    displayTrackRef.current = null

    // Restore the camera track via replaceTrack
    const pc = callRef.current?.peerConnection
    if (pc) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
      const cameraTrack = streamRef.current?.getVideoTracks()[0]
      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack)
      }
    }

    setIsScreenSharing(false)
  }, [callRef, streamRef])

  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      const displayTrack = displayStream.getVideoTracks()[0]

      const pc = callRef.current?.peerConnection
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(displayTrack)
        }
      }

      displayTrackRef.current = displayTrack
      setIsScreenSharing(true)

      // Handle OS "Stop Sharing" button
      displayTrack.onended = () => stopScreenShare()
    } catch (err) {
      // Silently catch user cancellation
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        return
      }
      throw err
    }
  }, [callRef, stopScreenShare])

  return { isScreenSharing, startScreenShare, stopScreenShare }
}
