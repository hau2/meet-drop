import { create } from 'zustand'
import type { ConnectionState } from '../types'

// No persist — PRIV-01: store lives only in memory
interface CallStore {
  connectionState: ConnectionState
  peerId: string | null
  setConnectionState: (state: ConnectionState) => void
  setPeerId: (id: string | null) => void
  reset: () => void
}

export const useCallStore = create<CallStore>((set) => ({
  connectionState: 'idle',
  peerId: null,
  setConnectionState: (connectionState) => set({ connectionState }),
  setPeerId: (peerId) => set({ peerId }),
  reset: () => set({ connectionState: 'idle', peerId: null }),
}))
