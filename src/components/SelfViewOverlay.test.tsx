import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { SelfViewOverlay } from './SelfViewOverlay'

// jsdom does not natively implement srcObject — define it so VideoPreview doesn't error
beforeEach(() => {
  Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
    configurable: true,
    set(_value: MediaStream | null) {
      // no-op in tests
    },
    get() {
      return null
    },
  })
})

describe('SelfViewOverlay', () => {
  it('Test 7: renders a VideoPreview with mirror=true (has -scale-x-100 class on video)', () => {
    const { container } = render(<SelfViewOverlay stream={null} />)
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video!.className).toContain('-scale-x-100')
  })

  it('Test 8: has absolute positioning classes for PiP corner placement', () => {
    const { container } = render(<SelfViewOverlay stream={null} />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('absolute')
  })
})
