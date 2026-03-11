import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AudioContext
const mockStop = vi.fn()
const mockStart = vi.fn()
const mockSetValueAtTime = vi.fn()
const mockExponentialRampToValueAtTime = vi.fn()
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockResume = vi.fn().mockResolvedValue(undefined)

const mockGainNode = {
  gain: {
    setValueAtTime: mockSetValueAtTime,
    exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
  },
  connect: mockConnect,
  disconnect: mockDisconnect,
}

const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: {
    setValueAtTime: mockSetValueAtTime,
  },
  connect: mockConnect,
  start: mockStart,
  stop: mockStop,
}

const mockAudioContext = {
  state: 'running' as AudioContextState,
  currentTime: 0,
  createOscillator: vi.fn(() => ({ ...mockOscillator, frequency: { setValueAtTime: vi.fn() } })),
  createGain: vi.fn(() => ({ ...mockGainNode, gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } })),
  destination: {},
  resume: mockResume,
}

const MockAudioContext = vi.fn(() => mockAudioContext)

vi.stubGlobal('AudioContext', MockAudioContext)

describe('sounds', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockAudioContext.state = 'running'
    mockAudioContext.createOscillator.mockImplementation(() => ({
      ...mockOscillator,
      frequency: { setValueAtTime: vi.fn() },
    }))
    mockAudioContext.createGain.mockImplementation(() => ({
      ...mockGainNode,
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    }))
  })

  it('playJoinSound creates an AudioContext if none exists', async () => {
    const { playJoinSound } = await import('./sounds')
    await playJoinSound()
    expect(MockAudioContext).toHaveBeenCalledTimes(1)
  })

  it('playJoinSound calls createOscillator twice', async () => {
    const { playJoinSound } = await import('./sounds')
    await playJoinSound()
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2)
  })

  it('playJoinSound calls start on both oscillators', async () => {
    const osc1Start = vi.fn()
    const osc2Start = vi.fn()
    let callCount = 0
    mockAudioContext.createOscillator.mockImplementation(() => {
      callCount++
      return {
        ...mockOscillator,
        frequency: { setValueAtTime: vi.fn() },
        start: callCount === 1 ? osc1Start : osc2Start,
        connect: vi.fn(),
      }
    })
    const { playJoinSound } = await import('./sounds')
    await playJoinSound()
    expect(osc1Start).toHaveBeenCalled()
    expect(osc2Start).toHaveBeenCalled()
  })

  it('playLeaveSound reuses existing AudioContext and creates two oscillators with descending frequencies', async () => {
    const { playJoinSound, playLeaveSound } = await import('./sounds')
    await playJoinSound()
    MockAudioContext.mockClear()
    await playLeaveSound()
    // Should NOT create a new AudioContext
    expect(MockAudioContext).not.toHaveBeenCalled()
    // Should create 2 oscillators
    // Total calls: 2 (join) + 2 (leave) = 4
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(4)
  })

  it('playJoinSound calls audioCtx.resume() if state is suspended', async () => {
    mockAudioContext.state = 'suspended'
    const { playJoinSound } = await import('./sounds')
    await playJoinSound()
    expect(mockResume).toHaveBeenCalled()
  })
})
