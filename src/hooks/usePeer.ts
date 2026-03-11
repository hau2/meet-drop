import { useEffect, useRef } from 'react'
import Peer from 'peerjs'
import { useCallStore } from '../store'

const ICE_SERVERS = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  },
]

export function usePeer(roomId: string) {
  const peerRef = useRef<Peer | null>(null)
  const { setConnectionState, setPeerId } = useCallStore()

  useEffect(() => {
    // Strict Mode guard — prevents double-initialization in React 18+ dev mode
    if (peerRef.current) return

    const peerOptions: ConstructorParameters<typeof Peer>[1] = {
      config: { iceServers: ICE_SERVERS },
    }

    // Use custom signaling server if configured, otherwise fall back to PeerJS cloud
    if (import.meta.env.VITE_PEERJS_HOST) {
      peerOptions.host = import.meta.env.VITE_PEERJS_HOST
      peerOptions.port = Number(import.meta.env.VITE_PEERJS_PORT)
      peerOptions.path = import.meta.env.VITE_PEERJS_PATH
      peerOptions.secure = import.meta.env.PROD
    }

    function initPeer(id?: string) {
      const peer = id ? new Peer(id, peerOptions) : new Peer(peerOptions as import('peerjs').PeerOptions)

      peer.on('open', (peerId) => {
        setPeerId(peerId)
        setConnectionState('connecting')
      })

      peer.on('error', (err) => {
        // If roomId is taken, we're the joiner — reconnect with a random ID
        if (err.type === 'unavailable-id') {
          peer.destroy()
          initPeer() // random ID
          return
        }
        console.error('PeerJS error:', err)
        setConnectionState('failed')
      })

      peer.on('disconnected', () => setConnectionState('disconnected'))

      peerRef.current = peer
    }

    // Try to register as the room creator (peerId = roomId).
    // If that ID is taken, the error handler reconnects with a random ID (joiner).
    initPeer(roomId)

    return () => {
      peerRef.current?.destroy()
      peerRef.current = null
      setConnectionState('idle')
      setPeerId(null)
    }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Separate effect for beforeunload cleanup — fires on tab close
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const cleanup = () => {
      peerRef.current?.destroy()
      peerRef.current = null
    }
    cleanupRef.current = cleanup
    window.addEventListener('beforeunload', cleanup)
    return () => {
      window.removeEventListener('beforeunload', cleanup)
    }
  }, [])

  return { peerRef }
}
