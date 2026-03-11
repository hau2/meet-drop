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

  const { setConnectionState, setCallEnded, setWasConnected } = useCallStore()

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
        remoteStreamRef.current = null
        const wasConnected = useCallStore.getState().wasConnected
        if (wasConnected) {
          setCallEnded(true)
          playLeaveSound()
        } else {
          setConnectionState('failed')
        }
      })

      call.on('error', (err: Error) => {
        console.error('MediaConnection error:', err)
        setConnectionState('failed')
      })
    },
    [setConnectionState, setCallEnded, setWasConnected]
  )

  useEffect(() => {
    const peer = peerRef.current
    const stream = streamRef.current

    if (!peer || !stream) return

    const isJoiner = peer.id !== roomId

    if (isJoiner) {
      const call = peer.call(roomId, stream)
      subscribeToCall(call)
    } else {
      peer.on('call', (call: MediaConnection) => {
        call.answer(stream)
        subscribeToCall(call)
      })
    }

    return () => {
      callRef.current?.close()
      callRef.current = null
      remoteStreamRef.current = null
    }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const hangUp = useCallback(() => {
    callRef.current?.close()
    callRef.current = null
    remoteStreamRef.current = null
    setConnectionState('disconnected')
    setCallEnded(true)
  }, [setConnectionState, setCallEnded])

  return { remoteStreamRef, hangUp }
}
