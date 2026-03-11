import { useParams } from 'wouter'
import { usePeer } from '../hooks/usePeer'
import { useMedia } from '../hooks/useMedia'
import { useCall } from '../hooks/useCall'
import { useCallStore } from '../store'
import { VideoPreview } from '../components/VideoPreview'
import { MediaControls } from '../components/MediaControls'
import { CopyLinkButton } from '../components/CopyLinkButton'
import { SelfViewOverlay } from '../components/SelfViewOverlay'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { MeetingEnded } from '../components/MeetingEnded'
import { CallView } from '../components/CallView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function getErrorMessage(error: string): string {
  switch (error) {
    case 'not-allowed':
      return 'Camera access denied. Please allow camera access in your browser settings.'
    case 'not-found':
      return 'No camera found. Please connect a camera and try again.'
    case 'not-readable':
      return 'Camera is in use by another application.'
    default:
      return 'Could not access camera. Please try again.'
  }
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const { peerRef } = usePeer(id ?? '')
  const { streamRef, error, isLoading, toggleMic, toggleCamera } = useMedia()
  const { isMicOn, isCameraOn, connectionState, callEnded, joined, setJoined } = useCallStore()
  const { remoteStreamRef, hangUp } = useCall(peerRef, streamRef, id ?? '')

  const roomLink = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/#/room/${id}`

  // State-driven rendering
  if (callEnded) {
    return <MeetingEnded />
  }

  if (connectionState === 'connected') {
    return (
      <CallView
        remoteStreamRef={remoteStreamRef}
        localStreamRef={streamRef}
        onHangUp={hangUp}
        toggleMic={toggleMic}
        toggleCamera={toggleCamera}
      />
    )
  }

  // Lobby view
  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 md:p-8 w-full max-w-5xl mx-auto min-h-screen items-center justify-center">
      {/* Left column: video area */}
      <div className="relative w-full md:flex-1 aspect-video bg-muted rounded-xl overflow-hidden border border-border">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="size-6 animate-spin" />
            <span className="text-sm">Requesting camera...</span>
          </div>
        )}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive text-center px-4 text-sm">
            {getErrorMessage(error)}
          </div>
        )}
        {!isLoading && !error && (
          <VideoPreview stream={streamRef.current} mirror className="w-full h-full object-cover" />
        )}
        <SelfViewOverlay stream={streamRef.current} />
      </div>

      {/* Right column: controls sidebar */}
      <Card className="w-full md:w-72">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lobby</span>
            <div className="flex items-center gap-2">
              <ConnectionStatus state={connectionState} />
              <Badge variant="outline" className="font-mono text-xs">{id}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MediaControls
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
          />
          <CopyLinkButton url={roomLink} />
          {joined ? (
            <Button
              disabled
              size="lg"
              variant={connectionState === 'failed' ? 'destructive' : 'default'}
              className="w-full"
            >
              {connectionState === 'failed' ? 'Connection failed' : 'Waiting for peer...'}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={() => setJoined(true)}
              disabled={isLoading || !!error}
            >
              Join Meeting
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
