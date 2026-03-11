import { VideoPreview } from './VideoPreview'

interface SelfViewOverlayProps {
  stream: MediaStream | null
}

export function SelfViewOverlay({ stream }: SelfViewOverlayProps) {
  return (
    <div className="absolute bottom-4 right-4 w-32 md:w-40 aspect-video rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10 z-10">
      <VideoPreview stream={stream} mirror className="w-full h-full object-cover" />
    </div>
  )
}
