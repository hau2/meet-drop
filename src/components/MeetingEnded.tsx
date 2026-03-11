import { useLocation } from 'wouter'
import { generateRoomId } from '../lib/room'
import { Button } from '@/components/ui/button'
import { useCallStore } from '../store'

export function MeetingEnded() {
  const [, setLocation] = useLocation()

  function handleReturnHome() {
    useCallStore.getState().reset()
    setLocation('/')
  }

  function handleNewMeeting() {
    useCallStore.getState().reset()
    setLocation(`/room/${generateRoomId()}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Meeting Ended</h1>
        <p className="mt-2 text-muted-foreground">The call has ended.</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleNewMeeting}>New Meeting</Button>
        <Button variant="outline" onClick={handleReturnHome}>Return Home</Button>
      </div>
    </div>
  )
}
