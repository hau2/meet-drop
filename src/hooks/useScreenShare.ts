import { useState, useRef, useCallback } from 'react'
import type { RefObject } from 'react'
import type Peer from 'peerjs'
import type { MediaConnection } from 'peerjs'

export function useScreenShare(
  peerRef: RefObject<Peer | null>,
  callRef: RefObject<MediaConnection | null>,
) {
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const screenCallRef = useRef<MediaConnection | null>(null)
  const displayTrackRef = useRef<MediaStreamTrack | null>(null)

  const stopScreenShare = useCallback(() => {
    displayTrackRef.current?.stop()
    displayTrackRef.current = null
    screenCallRef.current?.close()
    screenCallRef.current = null
    setIsScreenSharing(false)
  }, [])

  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      console.error('Screen sharing is not supported in this browser')
      return
    }

    const peer = peerRef.current
    const mainCall = callRef.current
    if (!peer || !mainCall) {
      console.error('No peer or call available for screen share')
      return
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      const displayTrack = displayStream.getVideoTracks()[0]
      const remotePeerId = mainCall.peer

      // Open a second call for the screen share — camera stays on the main call
      const screenCall = peer.call(remotePeerId, displayStream, {
        metadata: { type: 'screenshare' },
      })

      screenCallRef.current = screenCall
      displayTrackRef.current = displayTrack
      setIsScreenSharing(true)

      // Handle OS "Stop Sharing" button
      displayTrack.onended = () => stopScreenShare()

      screenCall.on('close', () => {
        // Remote hung up the screen share call
        if (displayTrackRef.current) stopScreenShare()
      })
    } catch (err) {
      // Silently catch user cancellation
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        return
      }
      console.error('Screen share error:', err)
    }
  }, [peerRef, callRef, stopScreenShare])

  return { isScreenSharing, startScreenShare, stopScreenShare }
}
