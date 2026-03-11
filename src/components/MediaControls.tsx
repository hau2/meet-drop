import { Mic, MicOff, Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MediaControlsProps {
  isMicOn: boolean
  isCameraOn: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
}

export function MediaControls({ isMicOn, isCameraOn, onToggleMic, onToggleCamera }: MediaControlsProps) {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onToggleMic}
        aria-label="Toggle microphone"
        variant={isMicOn ? 'secondary' : 'destructive'}
        size="lg"
        className="flex-1"
      >
        {isMicOn ? <Mic className="size-4" data-icon="inline-start" /> : <MicOff className="size-4" data-icon="inline-start" />}
        {isMicOn ? 'Mic' : 'Muted'}
      </Button>
      <Button
        onClick={onToggleCamera}
        aria-label="Toggle camera"
        variant={isCameraOn ? 'secondary' : 'destructive'}
        size="lg"
        className="flex-1"
      >
        {isCameraOn ? <Camera className="size-4" data-icon="inline-start" /> : <CameraOff className="size-4" data-icon="inline-start" />}
        {isCameraOn ? 'Camera' : 'Off'}
      </Button>
    </div>
  )
}
