import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QRScannerProps {
  onScan: (roomId: string) => void
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  async function startScanning() {
    setError(null)
    setScanning(true)

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          // Extract room ID from URL
          const match = decodedText.match(/meet-[0-9a-z]{6}/)
          if (match) {
            scanner.stop().catch(() => {})
            scannerRef.current = null
            setScanning(false)
            onScan(match[0])
          }
        },
        () => {} // ignore scan failures (no QR in frame)
      )
    } catch {
      setScanning(false)
      setError('Could not access camera. Please allow camera access.')
    }
  }

  async function stopScanning() {
    await scannerRef.current?.stop().catch(() => {})
    scannerRef.current = null
    setScanning(false)
  }

  if (!scanning) {
    return (
      <div className="space-y-1">
        <Button
          onClick={startScanning}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <ScanLine className="size-4" data-icon="inline-start" />
          Scan QR Code
        </Button>
        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden bg-black">
        <button
          onClick={stopScanning}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white"
          aria-label="Stop scanning"
        >
          <X className="size-4" />
        </button>
        <div id="qr-reader" ref={containerRef} className="w-full" />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Point your camera at a meeting QR code
      </p>
    </div>
  )
}
