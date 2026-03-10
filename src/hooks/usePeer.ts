import { useEffect, useRef, useCallback } from 'react'
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

    const peer = new Peer(roomId, {
      host: import.meta.env.VITE_PEERJS_HOST,
      port: Number(import.meta.env.VITE_PEERJS_PORT),
      path: import.meta.env.VITE_PEERJS_PATH,
      secure: import.meta.env.PROD,
      config: { iceServers: ICE_SERVERS },
    })

    peer.on('open', (id) => {
      setPeerId(id)
      setConnectionState('connecting')
    })

    peer.on('error', (err) => {
      console.error('PeerJS error:', err)
      setConnectionState('failed')
    })

    peer.on('disconnected', () => setConnectionState('disconnected'))

    peerRef.current = peer

    return () => {
      peer.destroy()
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
