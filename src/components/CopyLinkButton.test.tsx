import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CopyLinkButton } from './CopyLinkButton'

describe('CopyLinkButton', () => {
  const testUrl = 'https://example.com/#/room/meet-abc123'

  beforeEach(() => {
    // Mock navigator.clipboard.writeText
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('Test 5: clicking calls navigator.clipboard.writeText with the url prop', async () => {
    render(<CopyLinkButton url={testUrl} />)
    const button = screen.getByRole('button')

    fireEvent.click(button)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testUrl)
    })
  })

  it('Test 6: after click, button text changes to "Copied!"', async () => {
    render(<CopyLinkButton url={testUrl} />)
    const button = screen.getByRole('button')

    expect(button.textContent).toBe('Copy Link')

    fireEvent.click(button)

    await waitFor(() => {
      expect(button.textContent).toBe('Copied!')
    })
  })
})
