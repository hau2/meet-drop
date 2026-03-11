import { Badge } from '@/components/ui/badge'
import type { NetworkQuality } from '../types'

interface NetworkQualityBadgeProps {
  quality: NetworkQuality
}

const qualityConfig: Record<
  NonNullable<NetworkQuality>,
  { label: string; className: string; dotColor: string }
> = {
  good: {
    label: 'Good',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    dotColor: 'bg-green-400',
  },
  fair: {
    label: 'Fair',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    dotColor: 'bg-yellow-400',
  },
  poor: {
    label: 'Poor',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    dotColor: 'bg-red-400',
  },
}

export function NetworkQualityBadge({ quality }: NetworkQualityBadgeProps) {
  if (quality === null) return null

  const config = qualityConfig[quality]

  return (
    <Badge
      data-testid="network-quality-badge"
      variant="outline"
      className={config.className}
    >
      <span className={`size-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  )
}
