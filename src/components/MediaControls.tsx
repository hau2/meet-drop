import { Mic, MicOff, Camera, CameraOff } from 'lucide-react'
import { cn } from '../lib/cn'

interface MediaControlsProps {
  isMicOn: boolean
  isCameraOn: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
}

export function MediaControls({ isMicOn, isCameraOn, onToggleMic, onToggleCamera }: MediaControlsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onToggleMic}
        aria-label="Toggle microphone"
        className={cn(
          'flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors',
          isMicOn ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-red-600 hover:bg-red-500'
        )}
      >
        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
      <button
        onClick={onToggleCamera}
        aria-label="Toggle camera"
        className={cn(
          'flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors',
          isCameraOn ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-red-600 hover:bg-red-500'
        )}
      >
        {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
      </button>
    </div>
  )
}
