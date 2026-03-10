import { useParams } from 'wouter'

export function RoomPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div>Room: {id}</div>
    </div>
  )
}
