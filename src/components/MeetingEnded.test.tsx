import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MeetingEnded } from './MeetingEnded'

// Mock wouter's useLocation
const mockSetLocation = vi.fn()
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}))

// Mock generateRoomId
vi.mock('../lib/room', () => ({
  generateRoomId: () => 'meet-abc123',
}))

// Mock the store
const mockReset = vi.fn()
vi.mock('../store', () => ({
  useCallStore: {
    getState: () => ({ reset: mockReset }),
  },
}))

describe('MeetingEnded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Meeting Ended" heading', () => {
    render(<MeetingEnded />)
    expect(screen.getByRole('heading', { name: /meeting ended/i })).toBeInTheDocument()
  })

  it('renders "New Meeting" button and "Return Home" button', () => {
    render(<MeetingEnded />)
    expect(screen.getByRole('button', { name: /new meeting/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument()
  })

  it('clicking "Return Home" calls setLocation with "/"', () => {
    render(<MeetingEnded />)
    fireEvent.click(screen.getByRole('button', { name: /return home/i }))
    expect(mockSetLocation).toHaveBeenCalledWith('/')
  })

  it('clicking "New Meeting" calls setLocation with a path matching /\\/room\\/meet-[0-9a-z]{6}/', () => {
    render(<MeetingEnded />)
    fireEvent.click(screen.getByRole('button', { name: /new meeting/i }))
    expect(mockSetLocation).toHaveBeenCalledWith(
      expect.stringMatching(/\/room\/meet-[0-9a-z]{6}/)
    )
  })

  it('clicking "New Meeting" calls store reset() before navigation', () => {
    render(<MeetingEnded />)
    fireEvent.click(screen.getByRole('button', { name: /new meeting/i }))
    // Both should have been called
    expect(mockReset).toHaveBeenCalled()
    expect(mockSetLocation).toHaveBeenCalled()
    // reset should be called before setLocation — check call order
    const resetOrder = mockReset.mock.invocationCallOrder[0]
    const navOrder = mockSetLocation.mock.invocationCallOrder[0]
    expect(resetOrder).toBeLessThan(navOrder)
  })

  it('clicking "Return Home" calls store reset() before navigation', () => {
    render(<MeetingEnded />)
    fireEvent.click(screen.getByRole('button', { name: /return home/i }))
    expect(mockReset).toHaveBeenCalled()
    expect(mockSetLocation).toHaveBeenCalledWith('/')
    const resetOrder = mockReset.mock.invocationCallOrder[0]
    const navOrder = mockSetLocation.mock.invocationCallOrder[0]
    expect(resetOrder).toBeLessThan(navOrder)
  })
})
