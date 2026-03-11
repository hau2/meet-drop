import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomePage } from './HomePage'

// Mock wouter so we can track navigation
const mockSetLocation = vi.fn()
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}))

// Mock generateRoomId to have predictable output
vi.mock('../lib/room', () => ({
  generateRoomId: () => 'meet-abc123',
}))

// Mock useCallStore reset
vi.mock('../store', () => ({
  useCallStore: vi.fn(() => ({ reset: vi.fn() })),
}))

describe('HomePage manual join input', () => {
  beforeEach(() => {
    mockSetLocation.mockClear()
  })

  it('Test 1: typing a valid room ID and clicking Join navigates to /room/meet-abc123', () => {
    render(<HomePage />)
    const input = screen.getByPlaceholderText(/Enter Room ID/i)
    const joinBtn = screen.getByRole('button', { name: /Join/i })

    fireEvent.change(input, { target: { value: 'meet-abc123' } })
    fireEvent.click(joinBtn)

    expect(mockSetLocation).toHaveBeenCalledWith('/room/meet-abc123')
  })

  it('Test 2: pasting a full URL extracts room ID and navigates', () => {
    render(<HomePage />)
    const input = screen.getByPlaceholderText(/Enter Room ID/i)
    const joinBtn = screen.getByRole('button', { name: /Join/i })

    fireEvent.change(input, { target: { value: 'https://example.com/#/room/meet-abc123' } })
    fireEvent.click(joinBtn)

    expect(mockSetLocation).toHaveBeenCalledWith('/room/meet-abc123')
  })

  it('Test 3: empty input does not navigate', () => {
    render(<HomePage />)
    const joinBtn = screen.getByRole('button', { name: /Join/i })

    fireEvent.click(joinBtn)

    expect(mockSetLocation).not.toHaveBeenCalledWith(expect.stringMatching(/\/room\//))
  })

  it('Test 4: invalid input (no meet-xxxxxx pattern) does not navigate', () => {
    render(<HomePage />)
    const input = screen.getByPlaceholderText(/Enter Room ID/i)
    const joinBtn = screen.getByRole('button', { name: /Join/i })

    fireEvent.change(input, { target: { value: 'random-invalid-id' } })
    fireEvent.click(joinBtn)

    expect(mockSetLocation).not.toHaveBeenCalledWith(expect.stringMatching(/\/room\//))
  })
})
