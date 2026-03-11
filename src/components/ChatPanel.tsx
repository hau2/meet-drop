import { useEffect, useRef, useState } from 'react'
import { X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCallStore } from '../store'

interface ChatPanelProps {
  onSend: (text: string) => void
  isReady: boolean
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function ChatPanel({ onSend, isReady }: ChatPanelProps) {
  const { messages, setChatOpen } = useCallStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length])

  const canSend = isReady && input.trim().length > 0

  function handleSend() {
    const text = input.trim()
    if (!text || !isReady) return
    onSend(text)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border z-30 flex flex-col"
      data-testid="chat-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-semibold text-sm">Chat</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close chat"
          onClick={() => setChatOpen(false)}
          className="size-7"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
      >
        {messages.map((msg, i) => {
          const isLocal = msg.from === 'local'
          return (
            <div
              key={i}
              className={`flex flex-col gap-0.5 ${isLocal ? 'items-end' : 'items-start'}`}
            >
              <span
                className={`text-xs font-medium ${isLocal ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {isLocal ? 'You' : 'Them'}
              </span>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm break-words ${
                  isLocal
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-border shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          maxLength={500}
          className="flex-1"
          disabled={!isReady}
        />
        <Button
          onClick={handleSend}
          size="icon"
          aria-label="Send"
          disabled={!canSend}
          className="shrink-0"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}
