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
  const setupIdRef = useRef(0)

  const [isReady, setIsReady] = useState(false)

  const { addMessage } = useCallStore()
  const peerId = useCallStore((state) => state.peerId)
  const connectionState = useCallStore((state) => state.connectionState)

  const setupConnection = useCallback(
    (conn: DataConnection) => {
      // Guard: close any existing connection to prevent duplicate handlers
      if (connRef.current) {
        connRef.current.removeAllListeners()
        connRef.current.close()
      }
      // Increment setup counter — stale async callbacks from previous connections bail out
      const mySetupId = ++setupIdRef.current
      connRef.current = conn

      let openHandled = false
      const handleOpen = async () => {
        // Guard: only run once (both 'open' event and conn.open check could fire)
        if (openHandled) return
        openHandled = true
        // Generate keypair and immediately send public key to peer
        const kp = await generateKeyPair()
        if (setupIdRef.current !== mySetupId) return // stale setup
        keyPairRef.current = kp
        const exportedPub = await exportPublicKey(kp.publicKey)
        if (setupIdRef.current !== mySetupId) return // stale setup
        conn.send({ type: 'key-exchange', key: exportedPub })
      }

      conn.on('open', handleOpen)

      // Pitfall 1: check if already open after registering listener (race condition guard)
      if (conn.open) {
        handleOpen()
      }

      conn.on('data', async (raw: unknown) => {
        if (setupIdRef.current !== mySetupId) return // stale connection
        const msg = raw as DataMessage

        if (msg.type === 'key-exchange' && msg.key && keyPairRef.current) {
          const peerPub = await importPublicKey(msg.key)
          if (setupIdRef.current !== mySetupId) return
          sharedKeyRef.current = await deriveSharedKey(
            keyPairRef.current.privateKey,
            peerPub
          )
          if (setupIdRef.current !== mySetupId) return
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
            if (setupIdRef.current !== mySetupId) return
            addMessage({ from: 'remote', text, timestamp: Date.now() })
          } catch {
            // Decryption failed — stale connection with mismatched key, ignore
          }
        }
      })

      conn.on('close', () => {
        if (setupIdRef.current !== mySetupId) return
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

  // Track whether chat DataConnection has been initialized to prevent duplicates
  const chatInitRef = useRef(false)

  useEffect(() => {
    const peer = peerRef.current
    // Gate on peer.open AND connected call — DataConnection is only created after
    // the video call proves the signaling path works (prevents unreliable early connections)
    if (!peer || !peer.open || !peerId || connectionState !== 'connected') return
    // Prevent duplicate setup if effect re-runs while already initialized
    if (chatInitRef.current) return
    chatInitRef.current = true

    const isCreator = peer.id === roomId

    if (isCreator) {
      // Creator listens for incoming DataConnection from joiner
      const handler = (conn: DataConnection) => {
        setupConnection(conn)
      }
      peer.on('connection', handler)

      return () => {
        chatInitRef.current = false
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
        chatInitRef.current = false
        if (connRef.current) {
          connRef.current.removeAllListeners()
          connRef.current.close()
        }
        connRef.current = null
        sharedKeyRef.current = null
        keyPairRef.current = null
      }
    }
  }, [roomId, peerId, connectionState]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sharedKeyRef.current || !connRef.current || !connRef.current.open) return
      const encrypted = await encryptMessage(sharedKeyRef.current, text)
      connRef.current.send({ type: 'message', payload: encrypted })
      addMessage({ from: 'local', text, timestamp: Date.now() })
    },
    [addMessage]
  )

  return { sendMessage, isReady }
}
