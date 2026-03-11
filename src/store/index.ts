import { create } from 'zustand'
import type { ConnectionState } from '../types'

// No persist — PRIV-01: store lives only in memory
interface CallStore {
  connectionState: ConnectionState
  peerId: string | null
  isMicOn: boolean
  isCameraOn: boolean
  setConnectionState: (state: ConnectionState) => void
  setPeerId: (id: string | null) => void
  setMicOn: (on: boolean) => void
  setCameraOn: (on: boolean) => void
  reset: () => void
}

export const useCallStore = create<CallStore>((set) => ({
  connectionState: 'idle',
  peerId: null,
  isMicOn: true,
  isCameraOn: true,
  setConnectionState: (connectionState) => set({ connectionState }),
  setPeerId: (peerId) => set({ peerId }),
  setMicOn: (isMicOn) => set({ isMicOn }),
  setCameraOn: (isCameraOn) => set({ isCameraOn }),
  reset: () => set({ connectionState: 'idle', peerId: null, isMicOn: true, isCameraOn: true }),
}))
