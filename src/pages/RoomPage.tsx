import { useParams } from 'wouter'
import { usePeer } from '../hooks/usePeer'
import { useCallStore } from '../store'

export function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const { peerRef: _peerRef } = usePeer(id ?? '')
  const { connectionState, peerId } = useCallStore()

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="text-center space-y-2">
        <div>Room: {id}</div>
        <p className="text-zinc-400 text-sm">Status: {connectionState}</p>
        <p className="text-zinc-400 text-sm">Peer ID: {peerId ?? 'not connected'}</p>
      </div>
    </div>
  )
}
