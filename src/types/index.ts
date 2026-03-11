export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'

export type MediaError = 'not-allowed' | 'not-found' | 'not-readable' | 'unknown'

export interface ChatMessage {
  from: 'local' | 'remote'
  text: string
  timestamp: number
}
