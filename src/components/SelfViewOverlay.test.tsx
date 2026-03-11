import { render, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

/** Dispatch a pointer event using MouseEvent (jsdom supports clientX/Y via MouseEvent init) */
function pointerEvent(el: HTMLElement, type: string, init: { clientX?: number; clientY?: number; pointerId?: number } = {}) {
  const event = new MouseEvent(`pointer${type}`, {
    clientX: init.clientX,
    clientY: init.clientY,
    bubbles: true,
    cancelable: true,
  })
  el.dispatchEvent(event)
}

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

  it('Test 9: defaults to bottom-right corner (has bottom-4 and right-4 classes)', () => {
    const { container } = render(<SelfViewOverlay stream={null} />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('bottom-4')
    expect(wrapper!.className).toContain('right-4')
  })

  it('Test 10: snaps to top-left corner after pointer events in top-left quadrant', () => {
    const { container } = render(
      <div style={{ width: '800px', height: '600px', position: 'relative' }}>
        <SelfViewOverlay stream={null} />
      </div>
    )
    const overlayWrapper = container.querySelector('[data-testid="self-view-overlay"]') as HTMLElement
    expect(overlayWrapper).not.toBeNull()

    // Mock getBoundingClientRect for the overlay element
    vi.spyOn(overlayWrapper, 'getBoundingClientRect').mockReturnValue({
      left: 600,
      top: 400,
      right: 740,
      bottom: 478,
      width: 140,
      height: 78,
      x: 600,
      y: 400,
      toJSON: () => ({}),
    })

    // Mock getBoundingClientRect for parent container
    const parent = overlayWrapper.parentElement as HTMLElement
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    // Mock setPointerCapture
    overlayWrapper.setPointerCapture = vi.fn()

    act(() => {
      pointerEvent(overlayWrapper, 'down', { clientX: 670, clientY: 439 })
    })

    act(() => {
      // Move to top-left quadrant: clientX=100 < midX=400, clientY=100 < midY=300
      pointerEvent(overlayWrapper, 'move', { clientX: 100, clientY: 100 })
    })

    act(() => {
      pointerEvent(overlayWrapper, 'up', { clientX: 100, clientY: 100 })
    })

    // After snap, should have top-left corner classes
    expect(overlayWrapper.className).toContain('top-20')
    expect(overlayWrapper.className).toContain('left-4')
  })

  it('Test 11: calls setPointerCapture on pointer down', () => {
    const { container } = render(
      <div style={{ width: '800px', height: '600px', position: 'relative' }}>
        <SelfViewOverlay stream={null} />
      </div>
    )
    const overlayWrapper = container.querySelector('[data-testid="self-view-overlay"]') as HTMLElement
    expect(overlayWrapper).not.toBeNull()

    const mockSetPointerCapture = vi.fn()
    overlayWrapper.setPointerCapture = mockSetPointerCapture

    // Mock getBoundingClientRect to prevent errors
    vi.spyOn(overlayWrapper, 'getBoundingClientRect').mockReturnValue({
      left: 600,
      top: 400,
      right: 740,
      bottom: 478,
      width: 140,
      height: 78,
      x: 600,
      y: 400,
      toJSON: () => ({}),
    })

    act(() => {
      pointerEvent(overlayWrapper, 'down', { clientX: 670, clientY: 439 })
    })

    // setPointerCapture should have been called (pointerId may be undefined in jsdom)
    expect(mockSetPointerCapture).toHaveBeenCalled()
  })
})
