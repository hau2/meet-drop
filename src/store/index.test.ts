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
})
