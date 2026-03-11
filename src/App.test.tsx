import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App routing', () => {
  beforeEach(() => {
    window.location.hash = '#/'
  })

  it('renders HomePage with MeetDrop heading at root route', () => {
    render(<App />)
    expect(screen.getByText('MeetDrop')).toBeInTheDocument()
  })

  it('renders RoomPage when navigating to /room/:id', () => {
    window.location.hash = '#/room/meet-abc123'
    render(<App />)
    expect(screen.getByText('Lobby')).toBeInTheDocument()
  })
})
