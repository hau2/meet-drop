import { useEffect, useRef, useCallback } from 'react'
import type { RefObject } from 'react'
import type Peer from 'peerjs'
import type { MediaConnection } from 'peerjs'
import { useCallStore } from '../store'
import { playJoinSound, playLeaveSound } from '../lib/sounds'

export function useCall(
  peerRef: RefObject<Peer | null>,
  streamRef: RefObject<MediaStream | null>,
  roomId: string
) {
  const callRef = useRef<MediaConnection | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const endedRef = useRef(false)
  const pendingCallRef = useRef<MediaConnection | null>(null)

  const { setConnectionState, setCallEnded, setWasConnected, peerId, joined } = useCallStore()

  const handleRemoteHangUp = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    remoteStreamRef.current = null
    const wasConnected = useCallStore.getState().wasConnected
    if (wasConnected) {
      setCallEnded(true)
      playLeaveSound()
    } else {
      setConnectionState('failed')
    }
  }, [setCallEnded, setConnectionState])

  const subscribeToCall = useCallback(
    (call: MediaConnection) => {
      callRef.current = call

      call.on('stream', (remoteStream: MediaStream) => {
        remoteStreamRef.current = remoteStream
        setConnectionState('connected')
        setWasConnected(true)
        playJoinSound()
      })

      call.on('close', () => {
        handleRemoteHangUp()
      })

      call.on('error', (err: Error) => {
        console.error('MediaConnection error:', err)
        setConnectionState('failed')
      })

      const pc = call.peerConnection
      if (pc) {
        pc.oniceconnectionstatechange = () => {
          // Only end on 'failed' — 'disconnected' is transient and can recover
          if (pc.iceConnectionState === 'failed') {
            handleRemoteHangUp()
          }
        }
      }
    },
    [setConnectionState, setWasConnected, handleRemoteHangUp]
  )

  // Always listen for incoming calls (creator), regardless of `joined`.
  // Buffer the call if user hasn't clicked Join yet.
  useEffect(() => {
    const peer = peerRef.current
    if (!peer || !peer.open) return

    const isCreator = peer.id === roomId
    if (!isCreator) return

    const handler = (call: MediaConnection) => {
      const stream = streamRef.current
      const { joined: isJoined } = useCallStore.getState()

      if (isJoined && stream) {
        call.answer(stream)
        subscribeToCall(call)
      } else {
        // Buffer until user clicks Join
        pendingCallRef.current = call
      }
    }

    peer.on('call', handler)

    return () => {
      peer.off('call', handler)
    }
  }, [roomId, peerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // When user clicks Join: answer pending call (creator) or initiate call (joiner)
  useEffect(() => {
    const peer = peerRef.current
    const stream = streamRef.current

    if (!peer || !stream || !peer.open || !joined) return

    endedRef.current = false
    const isJoiner = peer.id !== roomId

    if (isJoiner) {
      // Joiner initiates the call
      const call = peer.call(roomId, stream)
      subscribeToCall(call)
    } else if (pendingCallRef.current) {
      // Creator answers a buffered call
      const call = pendingCallRef.current
      pendingCallRef.current = null
      call.answer(stream)
      subscribeToCall(call)
    }
    // If creator with no pending call: the peer.on('call') listener
    // (registered above) will handle future incoming calls directly.

    return () => {
      callRef.current?.close()
      callRef.current = null
      remoteStreamRef.current = null
    }
  }, [roomId, peerId, joined]) // eslint-disable-line react-hooks/exhaustive-deps

  const hangUp = useCallback(() => {
    callRef.current?.close()
    callRef.current = null
    remoteStreamRef.current = null
    setConnectionState('disconnected')
    setCallEnded(true)
    peerRef.current?.destroy()
  }, [setConnectionState, setCallEnded, peerRef])

  return { callRef, remoteStreamRef, hangUp }
}
