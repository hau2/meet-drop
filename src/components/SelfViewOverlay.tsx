import { useState, useRef } from 'react'
import { VideoPreview } from './VideoPreview'

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_CLASSES: Record<Corner, string> = {
  br: 'bottom-4 right-4',
  bl: 'bottom-4 left-4',
  tr: 'top-20 right-4',
  tl: 'top-20 left-4',
}

interface SelfViewOverlayProps {
  stream: MediaStream | null
}

function snapToCorner(pointerX: number, pointerY: number, parentWidth: number, parentHeight: number): Corner {
  const midX = parentWidth / 2
  const midY = parentHeight / 2
  if (pointerX < midX && pointerY < midY) return 'tl'
  if (pointerX >= midX && pointerY < midY) return 'tr'
  if (pointerX < midX && pointerY >= midY) return 'bl'
  return 'br'
}

export function SelfViewOverlay({ stream }: SelfViewOverlayProps) {
  const [corner, setCorner] = useState<Corner>('br')
  const [isDragging, setIsDragging] = useState(false)
  const [transform, setTransform] = useState<{ x: number; y: number } | null>(null)
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // Use ref for dragging guard to avoid stale closure in pointer event handlers
  const isDraggingRef = useRef(false)
  // Track last pointer position so pointerUp can snap even if clientX is unavailable
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    isDraggingRef.current = true
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const parent = e.currentTarget.parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const x = e.clientX - parentRect.left - dragOffsetRef.current.x
    const y = e.clientY - parentRect.top - dragOffsetRef.current.y
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    setTransform({ x, y })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const parent = e.currentTarget.parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()

    // Use event clientX/Y; fallback to last tracked position for environments where
    // clientX may not be available on the up event (e.g., some jsdom configurations)
    const px = e.clientX || lastPointerRef.current.x
    const py = e.clientY || lastPointerRef.current.y
    const pointerX = px - parentRect.left
    const pointerY = py - parentRect.top

    const snapped = snapToCorner(pointerX, pointerY, parentRect.width, parentRect.height)

    isDraggingRef.current = false
    setCorner(snapped)
    setTransform(null)
    setIsDragging(false)
  }

  const style: React.CSSProperties = {
    touchAction: 'none',
    ...(transform !== null
      ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
      : {}),
  }

  return (
    <div
      data-testid="self-view-overlay"
      className={`absolute ${CORNER_CLASSES[corner]} w-32 md:w-40 aspect-video rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10 z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <VideoPreview stream={stream} mirror className="w-full h-full object-cover" />
    </div>
  )
}
