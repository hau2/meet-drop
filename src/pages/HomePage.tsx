import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { generateRoomId } from '../lib/room'
import { useCallStore } from '../store'

export function HomePage() {
  const [, setLocation] = useLocation()
  const { reset } = useCallStore()

  // Reset store on mount — clears any stale state when navigating back home (PRIV-01 defense in depth)
  useEffect(() => {
    reset()
  }, [reset])

  function handleCreateMeeting() {
    const id = generateRoomId()
    setLocation(`/room/${id}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-4">MeetDrop</h1>
      <p className="text-zinc-400 mb-8">Anonymous video meetings. No sign-up. No trace.</p>
      <button
        onClick={handleCreateMeeting}
        className="bg-zinc-900 text-white px-6 py-3 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        Create Meeting
      </button>
    </div>
  )
}
