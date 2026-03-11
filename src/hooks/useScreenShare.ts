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
    const pc = (callRef.current as any)?.peerConnection as RTCPeerConnection | undefined
    if (pc) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || !s.track)
      const cameraTrack = streamRef.current?.getVideoTracks()[0]
      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack)
      }
    }

    setIsScreenSharing(false)
  }, [callRef, streamRef])

  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      console.error('Screen sharing is not supported in this browser')
      return
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      const displayTrack = displayStream.getVideoTracks()[0]

      // Access peerConnection — use `as any` to bypass PeerJS type narrowing
      const pc = (callRef.current as any)?.peerConnection as RTCPeerConnection | undefined
      if (!pc) {
        console.error('No peer connection available for screen share')
        displayTrack.stop()
        return
      }

      // Find video sender — also match senders with null track (camera off)
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || !s.track)
      if (!sender) {
        console.error('No video sender found for screen share')
        displayTrack.stop()
        return
      }

      await sender.replaceTrack(displayTrack)

      displayTrackRef.current = displayTrack
      setIsScreenSharing(true)

      // Handle OS "Stop Sharing" button
      displayTrack.onended = () => stopScreenShare()
    } catch (err) {
      // Silently catch user cancellation
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        return
      }
      console.error('Screen share error:', err)
    }
  }, [callRef, stopScreenShare])

  return { isScreenSharing, startScreenShare, stopScreenShare }
}
