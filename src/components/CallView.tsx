import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MediaControls } from './MediaControls'
import { SelfViewOverlay } from './SelfViewOverlay'
import { useCallStore } from '../store'

interface CallViewProps {
  remoteStreamRef: RefObject<MediaStream | null>
  localStreamRef: RefObject<MediaStream | null>
  onHangUp: () => void
  toggleMic: () => void
  toggleCamera: () => void
}

export function CallView({
  remoteStreamRef,
  localStreamRef,
  onHangUp,
  toggleMic,
  toggleCamera,
}: CallViewProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const { isMicOn, isCameraOn } = useCallStore()

  useEffect(() => {
    const video = remoteVideoRef.current
    if (!video) return
    if (remoteStreamRef.current) {
      video.srcObject = remoteStreamRef.current
    }
  }, [remoteStreamRef])

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

      {/* Controls bar at bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
        <MediaControls
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
        />
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
