import { useParams } from 'wouter'
import { usePeer } from '../hooks/usePeer'
import { useMedia } from '../hooks/useMedia'
import { useCallStore } from '../store'
import { VideoPreview } from '../components/VideoPreview'
import { MediaControls } from '../components/MediaControls'
import { CopyLinkButton } from '../components/CopyLinkButton'
import { SelfViewOverlay } from '../components/SelfViewOverlay'

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
  const { peerRef: _peerRef } = usePeer(id ?? '')
  const { streamRef, error, isLoading, toggleMic, toggleCamera } = useMedia()
  const { isMicOn, isCameraOn } = useCallStore()

  const roomLink = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/#/room/${id}`

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 w-full max-w-4xl mx-auto min-h-screen items-center justify-center">
      {/* Left column: video area */}
      <div className="relative w-full md:flex-1 aspect-video bg-zinc-900 rounded-xl overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
            Requesting camera...
          </div>
        )}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 text-center px-4">
            {getErrorMessage(error)}
          </div>
        )}
        {!isLoading && !error && (
          <VideoPreview stream={streamRef.current} mirror className="w-full h-full object-cover" />
        )}
        <SelfViewOverlay stream={streamRef.current} />
      </div>

      {/* Right column: controls sidebar */}
      <div className="flex flex-col gap-3 w-full md:w-64">
        <p className="text-zinc-400 text-sm">
          Room: <span className="text-white font-mono">{id}</span>
        </p>
        <MediaControls
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
        />
        <CopyLinkButton url={roomLink} />
        <button
          disabled
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg w-full opacity-60 cursor-not-allowed"
        >
          Waiting for peer...
        </button>
      </div>
    </div>
  )
}
