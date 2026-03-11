import { create } from 'zustand'
import type { ConnectionState, ChatMessage } from '../types'

// No persist — PRIV-01: store lives only in memory
interface CallStore {
  connectionState: ConnectionState
  peerId: string | null
  isMicOn: boolean
  isCameraOn: boolean
  callEnded: boolean
  wasConnected: boolean
  joined: boolean
  messages: ChatMessage[]
  isChatOpen: boolean
  setConnectionState: (state: ConnectionState) => void
  setPeerId: (id: string | null) => void
  setMicOn: (on: boolean) => void
  setCameraOn: (on: boolean) => void
  setCallEnded: (ended: boolean) => void
  setWasConnected: (connected: boolean) => void
  setJoined: (joined: boolean) => void
  addMessage: (msg: ChatMessage) => void
  setChatOpen: (open: boolean) => void
  reset: () => void
}

export const useCallStore = create<CallStore>((set) => ({
  connectionState: 'idle',
  peerId: null,
  isMicOn: true,
  isCameraOn: true,
  callEnded: false,
  wasConnected: false,
  joined: false,
  messages: [],
  isChatOpen: false,
  setConnectionState: (connectionState) => set({ connectionState }),
  setPeerId: (peerId) => set({ peerId }),
  setMicOn: (isMicOn) => set({ isMicOn }),
  setCameraOn: (isCameraOn) => set({ isCameraOn }),
  setCallEnded: (callEnded) => set({ callEnded }),
  setWasConnected: (wasConnected) => set({ wasConnected }),
  setJoined: (joined) => set({ joined }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setChatOpen: (isChatOpen) => set({ isChatOpen }),
  reset: () => set({
    connectionState: 'idle',
    peerId: null,
    isMicOn: true,
    isCameraOn: true,
    callEnded: false,
    wasConnected: false,
    joined: false,
    messages: [],
    isChatOpen: false,
  }),
}))
