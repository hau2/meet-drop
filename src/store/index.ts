import { create } from 'zustand'
import type { ConnectionState } from '../types'

// No persist — PRIV-01: store lives only in memory
interface CallStore {
  connectionState: ConnectionState
  peerId: string | null
  isMicOn: boolean
  isCameraOn: boolean
  callEnded: boolean
  wasConnected: boolean
  setConnectionState: (state: ConnectionState) => void
  setPeerId: (id: string | null) => void
  setMicOn: (on: boolean) => void
  setCameraOn: (on: boolean) => void
  setCallEnded: (ended: boolean) => void
  setWasConnected: (connected: boolean) => void
  reset: () => void
}

export const useCallStore = create<CallStore>((set) => ({
  connectionState: 'idle',
  peerId: null,
  isMicOn: true,
  isCameraOn: true,
  callEnded: false,
  wasConnected: false,
  setConnectionState: (connectionState) => set({ connectionState }),
  setPeerId: (peerId) => set({ peerId }),
  setMicOn: (isMicOn) => set({ isMicOn }),
  setCameraOn: (isCameraOn) => set({ isCameraOn }),
  setCallEnded: (callEnded) => set({ callEnded }),
  setWasConnected: (wasConnected) => set({ wasConnected }),
  reset: () => set({ connectionState: 'idle', peerId: null, isMicOn: true, isCameraOn: true, callEnded: false, wasConnected: false }),
}))
