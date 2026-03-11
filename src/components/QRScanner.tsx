import { useCallback, useEffect, useRef, useState } from 'react'
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

  const startScanner = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      const scanConfig = { fps: 10, qrbox: { width: 200, height: 200 } }
      const onSuccess = (decodedText: string) => {
        const match = decodedText.match(/meet-[0-9a-z]{6}/)
        if (match) {
          scanner.stop().catch(() => {})
          scannerRef.current = null
          setScanning(false)
          onScan(match[0])
        }
      }
      const onFailure = () => {} // ignore scan failures (no QR in frame)

      try {
        // Try rear camera first (mobile)
        await scanner.start({ facingMode: 'environment' }, scanConfig, onSuccess, onFailure)
      } catch {
        // Fall back to any available camera (desktop/laptop)
        await scanner.start({ facingMode: 'user' }, scanConfig, onSuccess, onFailure)
      }
    } catch {
      setScanning(false)
      setError('Could not access camera. Please allow camera access.')
    }
  }, [onScan])

  // Start scanner after the #qr-reader div has rendered
  useEffect(() => {
    if (scanning) {
      startScanner()
    }
  }, [scanning, startScanner])

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  function handleStartClick() {
    setError(null)
    setScanning(true)
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
          onClick={handleStartClick}
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
        <div id="qr-reader" className="w-full" />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Point your camera at a meeting QR code
      </p>
    </div>
  )
}
