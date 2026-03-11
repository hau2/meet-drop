import { describe, it, expect, beforeEach } from 'vitest'
import { useCallStore } from './index'

describe('useCallStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCallStore.getState().reset()
    localStorage.clear()
  })

  it('has initial state with connectionState idle and peerId null', () => {
    const state = useCallStore.getState()
    expect(state.connectionState).toBe('idle')
    expect(state.peerId).toBeNull()
  })

  it('setConnectionState updates the connectionState', () => {
    useCallStore.getState().setConnectionState('connected')
    expect(useCallStore.getState().connectionState).toBe('connected')
  })

  it('store operations never write to localStorage', () => {
    useCallStore.getState().setConnectionState('connecting')
    useCallStore.getState().setPeerId('test-peer-123')
    useCallStore.getState().setConnectionState('connected')
    expect(Object.keys(localStorage).length).toBe(0)
  })

  it('callEnded defaults to false, setCallEnded(true) updates it, reset() clears it back to false', () => {
    expect(useCallStore.getState().callEnded).toBe(false)
    useCallStore.getState().setCallEnded(true)
    expect(useCallStore.getState().callEnded).toBe(true)
    useCallStore.getState().reset()
    expect(useCallStore.getState().callEnded).toBe(false)
  })

  it('wasConnected defaults to false, setWasConnected(true) updates it, reset() clears it back to false', () => {
    expect(useCallStore.getState().wasConnected).toBe(false)
    useCallStore.getState().setWasConnected(true)
    expect(useCallStore.getState().wasConnected).toBe(true)
    useCallStore.getState().reset()
    expect(useCallStore.getState().wasConnected).toBe(false)
  })

  // Chat state tests
  it('messages defaults to empty array', () => {
    expect(useCallStore.getState().messages).toEqual([])
  })

  it('isChatOpen defaults to false', () => {
    expect(useCallStore.getState().isChatOpen).toBe(false)
  })

  it('addMessage appends to messages array', () => {
    const msg = { from: 'local' as const, text: 'hello', timestamp: 1234567890 }
    useCallStore.getState().addMessage(msg)
    expect(useCallStore.getState().messages).toHaveLength(1)
    expect(useCallStore.getState().messages[0]).toEqual(msg)
  })

  it('addMessage appends multiple messages in order', () => {
    const msg1 = { from: 'local' as const, text: 'first', timestamp: 1 }
    const msg2 = { from: 'remote' as const, text: 'second', timestamp: 2 }
    useCallStore.getState().addMessage(msg1)
    useCallStore.getState().addMessage(msg2)
    expect(useCallStore.getState().messages).toHaveLength(2)
    expect(useCallStore.getState().messages[0]).toEqual(msg1)
    expect(useCallStore.getState().messages[1]).toEqual(msg2)
  })

  it('setChatOpen(true) sets isChatOpen to true', () => {
    useCallStore.getState().setChatOpen(true)
    expect(useCallStore.getState().isChatOpen).toBe(true)
  })

  it('setChatOpen(false) sets isChatOpen to false', () => {
    useCallStore.getState().setChatOpen(true)
    useCallStore.getState().setChatOpen(false)
    expect(useCallStore.getState().isChatOpen).toBe(false)
  })

  it('reset() clears messages to [] and isChatOpen to false', () => {
    useCallStore.getState().addMessage({ from: 'local', text: 'hi', timestamp: 1 })
    useCallStore.getState().setChatOpen(true)
    useCallStore.getState().reset()
    expect(useCallStore.getState().messages).toEqual([])
    expect(useCallStore.getState().isChatOpen).toBe(false)
  })

  it('chat messages are never written to localStorage', () => {
    useCallStore.getState().addMessage({ from: 'local', text: 'secret', timestamp: 1 })
    useCallStore.getState().setChatOpen(true)
    expect(Object.keys(localStorage).length).toBe(0)
  })
})
