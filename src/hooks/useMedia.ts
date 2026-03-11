import { useEffect, useRef, useState, useCallback } from 'react'
import { useCallStore } from '../store'
import type { MediaError } from '../types'

export type { MediaError }

export function useMedia() {
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<MediaError | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { isMicOn, isCameraOn, setMicOn, setCameraOn } = useCallStore()

  useEffect(() => {
    let cancelled = false

    async function acquire() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setMicOn(true)
        setCameraOn(true)
        setIsLoading(false)
      } catch (err) {
        if (cancelled) return
        setIsLoading(false)
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') setError('not-allowed')
          else if (err.name === 'NotFoundError') setError('not-found')
          else if (err.name === 'NotReadableError') setError('not-readable')
          else setError('unknown')
        } else {
          setError('unknown')
        }
      }
    }

    acquire()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    const next = !useCallStore.getState().isMicOn
    track.enabled = next
    setMicOn(next)
  }, [setMicOn])

  const toggleCamera = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !useCallStore.getState().isCameraOn
    track.enabled = next
    setCameraOn(next)
  }, [setCameraOn])

  return { streamRef, error, isLoading, toggleMic, toggleCamera, isMicOn, isCameraOn }
}
