import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Phone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MediaControls } from './MediaControls'
import { SelfViewOverlay } from './SelfViewOverlay'
import { ChatPanel } from './ChatPanel'
import { useCallStore } from '../store'

interface CallViewProps {
  remoteStreamRef: RefObject<MediaStream | null>
  localStreamRef: RefObject<MediaStream | null>
  onHangUp: () => void
  toggleMic: () => void
  toggleCamera: () => void
  sendMessage: (text: string) => Promise<void>
  isChatReady: boolean
}

export function CallView({
  remoteStreamRef,
  localStreamRef,
  onHangUp,
  toggleMic,
  toggleCamera,
  sendMessage,
  isChatReady,
}: CallViewProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const prevMessagesLengthRef = useRef(0)
  const unreadCountRef = useRef(0)
  const unreadDotRef = useRef<HTMLSpanElement>(null)

  const { isMicOn, isCameraOn, isChatOpen, setChatOpen, messages } = useCallStore()

  useEffect(() => {
    const video = remoteVideoRef.current
    if (!video) return
    if (remoteStreamRef.current) {
      video.srcObject = remoteStreamRef.current
    }
  }, [remoteStreamRef])

  // Track unread remote messages when chat is closed
  useEffect(() => {
    const currentLength = messages.length
    if (currentLength > prevMessagesLengthRef.current) {
      if (!isChatOpen) {
        // Only count remote messages as unread
        const newMessages = messages.slice(prevMessagesLengthRef.current)
        const newRemote = newMessages.filter((m) => m.from === 'remote').length
        if (newRemote > 0) {
          unreadCountRef.current += newRemote
          if (unreadDotRef.current) {
            unreadDotRef.current.style.display = 'block'
          }
        }
      }
      prevMessagesLengthRef.current = currentLength
    }
  }, [messages, isChatOpen])

  function handleChatToggle() {
    if (!isChatOpen) {
      // Opening — reset unread count
      unreadCountRef.current = 0
      if (unreadDotRef.current) {
        unreadDotRef.current.style.display = 'none'
      }
    }
    setChatOpen(!isChatOpen)
  }

  return (
    <div data-testid="call-view" className="relative w-full h-screen bg-black overflow-hidden">
      {/* Remote video — NOT muted, audio plays through */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Self-view PiP overlay */}
      <SelfViewOverlay stream={localStreamRef.current} />

      {/* Chat panel overlay */}
      {isChatOpen && (
        <ChatPanel onSend={sendMessage} isReady={isChatReady} />
      )}

      {/* Controls bar at bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
        <MediaControls
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
        />

        {/* Chat toggle button with unread indicator */}
        <div className="relative">
          <Button
            onClick={handleChatToggle}
            variant="secondary"
            size="lg"
            aria-label="Toggle chat"
            className="rounded-full"
          >
            <MessageSquare className="size-4" />
          </Button>
          {/* Unread indicator dot — hidden by default, shown via ref */}
          <span
            ref={unreadDotRef}
            aria-hidden="true"
            style={{ display: 'none' }}
            className="absolute top-0 right-0 size-2.5 rounded-full bg-destructive border-2 border-black"
          />
        </div>

        <Button
          onClick={onHangUp}
          variant="destructive"
          size="lg"
          aria-label="Hang up"
          className="rounded-full"
        >
          <Phone className="size-4" />
        </Button>
      </div>
    </div>
  )
}
