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
        {isMicOn ? 'Mic On' : 'Mic Off'}
      </button>
      <button
        onClick={onToggleCamera}
        aria-label="Toggle camera"
        className={cn(
          'flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors',
          isCameraOn ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-red-600 hover:bg-red-500'
        )}
      >
        {isCameraOn ? 'Cam On' : 'Cam Off'}
      </button>
    </div>
  )
}
