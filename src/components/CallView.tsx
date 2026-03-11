import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Phone, MessageSquare, Monitor, MonitorOff, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MediaControls } from './MediaControls'
import { SelfViewOverlay } from './SelfViewOverlay'
import { ChatPanel } from './ChatPanel'
import { NetworkQualityBadge } from './NetworkQualityBadge'
import { useCallStore } from '../store'
import type { NetworkQuality } from '../types'

interface CallViewProps {
  remoteStreamRef: RefObject<MediaStream | null>
  localStreamRef: RefObject<MediaStream | null>
  onHangUp: () => void
  toggleMic: () => void
  toggleCamera: () => void
  sendMessage: (text: string) => Promise<void>
  isChatReady: boolean
  isScreenSharing: boolean
  onToggleScreenShare: () => void
  networkQuality: NetworkQuality
}

export function CallView({
  remoteStreamRef,
  localStreamRef,
  onHangUp,
  toggleMic,
  toggleCamera,
  sendMessage,
  isChatReady,
  isScreenSharing,
  onToggleScreenShare,
  networkQuality,
}: CallViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const prevMessagesLengthRef = useRef(0)
  const unreadCountRef = useRef(0)
  const unreadDotRef = useRef<HTMLSpanElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // Sync fullscreen state with browser fullscreen events
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenEnabled) return
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

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
    <div
      ref={containerRef}
      data-testid="call-view"
      className="relative w-full h-screen bg-black overflow-hidden"
    >
      {/* Remote video — NOT muted, audio plays through */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Network quality badge — top-left */}
      <div className="absolute top-4 left-4 z-20">
        <NetworkQualityBadge quality={networkQuality} />
      </div>

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

        {/* Screen share button */}
        <Button
          onClick={onToggleScreenShare}
          variant={isScreenSharing ? 'default' : 'secondary'}
          size="lg"
          aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          className="rounded-full"
        >
          {isScreenSharing ? (
            <MonitorOff className="size-4" />
          ) : (
            <Monitor className="size-4" />
          )}
        </Button>

        {/* Fullscreen button */}
        <Button
          onClick={toggleFullscreen}
          variant="secondary"
          size="lg"
          aria-label="Toggle fullscreen"
          className="rounded-full"
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </Button>

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
