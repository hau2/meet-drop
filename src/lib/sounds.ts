// Singleton AudioContext — lazy initialized to avoid autoplay policy violations
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

async function ensureResumed(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number
): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gainNode.gain.setValueAtTime(0.12, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

/**
 * Play ascending two-tone join sound: C5 (523 Hz) → G5 (784 Hz)
 */
export async function playJoinSound(): Promise<void> {
  const ctx = getAudioContext()
  await ensureResumed(ctx)
  const now = ctx.currentTime
  playTone(ctx, 523, now, 0.15)
  playTone(ctx, 784, now + 0.15, 0.2)
}

/**
 * Play descending two-tone leave sound: G5 (784 Hz) → C5 (523 Hz)
 */
export async function playLeaveSound(): Promise<void> {
  const ctx = getAudioContext()
  await ensureResumed(ctx)
  const now = ctx.currentTime
  playTone(ctx, 784, now, 0.15)
  playTone(ctx, 523, now + 0.15, 0.2)
}
