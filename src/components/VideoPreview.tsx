import { useEffect, useRef } from 'react'
import { cn } from '../lib/cn'

interface VideoPreviewProps {
  stream: MediaStream | null
  mirror?: boolean
  className?: string
}

export function VideoPreview({ stream, mirror = false, className = '' }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={cn(mirror && '-scale-x-100', className)}
    />
  )
}
