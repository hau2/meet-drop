import { useEffect, useRef, useState, useCallback } from 'react'
import type { RefObject } from 'react'
import type Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import { useCallStore } from '../store'
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
} from '../lib/crypto'

type DataMessage =
  | { type: 'key-exchange'; key: string }
  | { type: 'message'; payload: string }

export function useChat(
  peerRef: RefObject<Peer | null>,
  roomId: string
): { sendMessage: (text: string) => Promise<void>; isReady: boolean } {
  const connRef = useRef<DataConnection | null>(null)
  const keyPairRef = useRef<CryptoKeyPair | null>(null)
  const sharedKeyRef = useRef<CryptoKey | null>(null)
  const pendingMessages = useRef<string[]>([])

  const [isReady, setIsReady] = useState(false)

  const { addMessage } = useCallStore()
  const peerId = useCallStore((state) => state.peerId)

  const setupConnection = useCallback(
    (conn: DataConnection) => {
      // Guard: close any existing connection to prevent duplicate handlers
      if (connRef.current) {
        connRef.current.removeAllListeners()
        connRef.current.close()
      }
      connRef.current = conn

      const handleOpen = async () => {
        // Generate keypair and immediately send public key to peer
        const kp = await generateKeyPair()
        keyPairRef.current = kp
        const exportedPub = await exportPublicKey(kp.publicKey)
        conn.send({ type: 'key-exchange', key: exportedPub })
      }

      conn.on('open', handleOpen)

      // Pitfall 1: check if already open after registering listener (race condition guard)
      if (conn.open) {
        handleOpen()
      }

      conn.on('data', async (raw: unknown) => {
        const msg = raw as DataMessage

        if (msg.type === 'key-exchange' && msg.key && keyPairRef.current) {
          const peerPub = await importPublicKey(msg.key)
          sharedKeyRef.current = await deriveSharedKey(
            keyPairRef.current.privateKey,
            peerPub
          )
          // Flush messages that arrived before key exchange completed
          for (const payload of pendingMessages.current) {
            const text = await decryptMessage(sharedKeyRef.current, payload)
            addMessage({ from: 'remote', text, timestamp: Date.now() })
          }
          pendingMessages.current = []
          setIsReady(true)
          return
        }

        if (msg.type === 'message' && msg.payload) {
          if (!sharedKeyRef.current) {
            // Edge case: message arrived before shared key derived — queue
            pendingMessages.current.push(msg.payload)
            return
          }
          try {
            const text = await decryptMessage(sharedKeyRef.current, msg.payload)
            addMessage({ from: 'remote', text, timestamp: Date.now() })
          } catch {
            // Decryption failed — stale connection with mismatched key, ignore
          }
        }
      })

      conn.on('close', () => {
        sharedKeyRef.current = null
        connRef.current = null
        keyPairRef.current = null
        pendingMessages.current = []
        setIsReady(false)
      })

      conn.on('error', (err: Error) => {
        console.error('DataConnection error:', err)
      })
    },
    [addMessage]
  )

  useEffect(() => {
    const peer = peerRef.current
    // Gate on peer.open — peerId is only set after peer.on('open') fires (Pitfall 6)
    if (!peer || !peer.open || !peerId) return

    const isCreator = peer.id === roomId

    if (isCreator) {
      // Creator listens for incoming DataConnection from joiner
      const handler = (conn: DataConnection) => {
        setupConnection(conn)
      }
      peer.on('connection', handler)

      return () => {
        peer.off('connection', handler)
        if (connRef.current) {
          connRef.current.removeAllListeners()
          connRef.current.close()
        }
        connRef.current = null
        sharedKeyRef.current = null
        keyPairRef.current = null
      }
    } else {
      // Joiner initiates DataConnection to creator
      const conn = peer.connect(roomId, { serialization: 'json', reliable: true })
      setupConnection(conn)

      return () => {
        if (connRef.current) {
          connRef.current.removeAllListeners()
          connRef.current.close()
        }
        connRef.current = null
        sharedKeyRef.current = null
        keyPairRef.current = null
      }
    }
  }, [roomId, peerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sharedKeyRef.current || !connRef.current) return
      const encrypted = await encryptMessage(sharedKeyRef.current, text)
      connRef.current.send({ type: 'message', payload: encrypted })
      addMessage({ from: 'local', text, timestamp: Date.now() })
    },
    [addMessage]
  )

  return { sendMessage, isReady }
}
