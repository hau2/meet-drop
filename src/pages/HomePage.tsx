import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { Video, LogIn } from 'lucide-react'
import { QRScanner } from '../components/QRScanner'
import { generateRoomId } from '../lib/room'
import { useCallStore } from '../store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function HomePage() {
  const [, setLocation] = useLocation()
  const { reset } = useCallStore()
  const [joinId, setJoinId] = useState('')

  // Reset store on mount — clears any stale state when navigating back home (PRIV-01 defense in depth)
  useEffect(() => {
    reset()
  }, [reset])

  function handleCreateMeeting() {
    const id = generateRoomId()
    setLocation(`/room/${id}`)
  }

  function handleJoin() {
    const match = joinId.match(/meet-[0-9a-z]{6}/)
    if (!match) return
    setLocation(`/room/${match[0]}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tight mb-2">MeetDrop</h1>
        <p className="text-muted-foreground text-lg">Anonymous video meetings. No sign-up. No trace.</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Start a meeting</CardTitle>
          <CardDescription>Create a new room or join an existing one</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCreateMeeting}
            size="lg"
            className="w-full"
          >
            <Video className="size-4" data-icon="inline-start" />
            Create Meeting
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or join</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter Room ID (meet-xxxxxx)"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <Button
              onClick={handleJoin}
              variant="secondary"
            >
              <LogIn className="size-4" data-icon="inline-start" />
              Join
            </Button>
          </div>

          <QRScanner onScan={(roomId) => setLocation(`/room/${roomId}`)} />
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>
          Built by{' '}
          <a
            href="mailto:leconghau095@gmail.com"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Le Cong Hau
          </a>
        </p>
      </footer>
    </div>
  )
}
