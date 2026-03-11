import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VideoPreview } from './VideoPreview'

// jsdom does not natively implement srcObject — define it so we can track assignments
let capturedSrcObject: MediaStream | null = null

beforeEach(() => {
  capturedSrcObject = null
  Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
    configurable: true,
    set(value: MediaStream | null) {
      capturedSrcObject = value
    },
    get() {
      return capturedSrcObject
    },
  })
})

const mockStream = {
  getTracks: () => [],
  getAudioTracks: () => [],
  getVideoTracks: () => [],
} as unknown as MediaStream

const mockStream2 = {
  getTracks: () => [],
  getAudioTracks: () => [],
  getVideoTracks: () => [],
  id: 'stream-2',
} as unknown as MediaStream

describe('VideoPreview', () => {
  it('Test 1: assigns stream to video element srcObject', () => {
    render(<VideoPreview stream={mockStream} />)
    expect(capturedSrcObject).toBe(mockStream)
  })

  it('Test 2: renders with muted, autoPlay, playsInline attributes', () => {
    const { container } = render(<VideoPreview stream={mockStream} />)
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video!.muted).toBe(true)
    expect(video!.hasAttribute('autoplay')).toBe(true)
    expect(video!.hasAttribute('playsinline')).toBe(true)
  })

  it('Test 3: applies -scale-x-100 class when mirror=true', () => {
    const { container } = render(<VideoPreview stream={mockStream} mirror={true} />)
    const video = container.querySelector('video')
    expect(video!.className).toContain('-scale-x-100')
  })

  it('Test 4: does not apply -scale-x-100 when mirror=false', () => {
    const { container } = render(<VideoPreview stream={mockStream} mirror={false} />)
    const video = container.querySelector('video')
    expect(video!.className).not.toContain('-scale-x-100')
  })

  it('Test 5: updates srcObject when stream prop changes', () => {
    const { rerender } = render(<VideoPreview stream={mockStream} />)
    expect(capturedSrcObject).toBe(mockStream)

    rerender(<VideoPreview stream={mockStream2} />)
    expect(capturedSrcObject).toBe(mockStream2)
  })
})
