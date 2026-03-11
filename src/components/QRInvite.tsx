import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QRInviteProps {
  url: string
}

export function QRInvite({ url }: QRInviteProps) {
  const [show, setShow] = useState(false)

  if (!show) {
    return (
      <Button
        onClick={() => setShow(true)}
        variant="outline"
        size="lg"
        className="w-full"
      >
        <QrCode className="size-4" data-icon="inline-start" />
        Show QR Code
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative flex justify-center p-4 bg-white rounded-lg">
        <button
          onClick={() => setShow(false)}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-100 text-gray-500"
          aria-label="Close QR code"
        >
          <X className="size-4" />
        </button>
        <QRCodeSVG
          value={url}
          size={180}
          level="M"
          marginSize={1}
        />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Scan to join this meeting
      </p>
    </div>
  )
}
