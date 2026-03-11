import { Badge } from '@/components/ui/badge'
import type { ConnectionState } from '@/types'

const STATE_LABELS: Record<ConnectionState, string> = {
  idle: 'Waiting',
  connecting: 'Connecting',
  connected: 'Connected',
  disconnected: 'Disconnected',
  failed: 'Connection Failed',
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'

const STATE_VARIANTS: Record<ConnectionState, BadgeVariant> = {
  idle: 'secondary',
  connecting: 'secondary',
  connected: 'default',
  disconnected: 'destructive',
  failed: 'destructive',
}

interface ConnectionStatusProps {
  state: ConnectionState
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  return (
    <Badge variant={STATE_VARIANTS[state]}>
      {STATE_LABELS[state]}
    </Badge>
  )
}
