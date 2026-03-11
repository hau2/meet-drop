import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { generateRoomId } from '../lib/room'
import { useCallStore } from '../store'

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-4">MeetDrop</h1>
      <p className="text-zinc-400 mb-8">Anonymous video meetings. No sign-up. No trace.</p>
      <button
        onClick={handleCreateMeeting}
        className="bg-zinc-900 text-white px-6 py-3 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        Create Meeting
      </button>
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          placeholder="Enter Room ID (meet-xxxxxx)"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          className="bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-zinc-500 w-72"
        />
        <button
          onClick={handleJoin}
          className="bg-zinc-700 text-white px-4 py-2 rounded-lg hover:bg-zinc-600 transition-colors"
        >
          Join
        </button>
      </div>
    </div>
  )
}
