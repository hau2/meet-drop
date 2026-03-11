import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from './ConnectionStatus'

describe('ConnectionStatus', () => {
  it('renders "Waiting" text when state is idle', () => {
    render(<ConnectionStatus state="idle" />)
    expect(screen.getByText('Waiting')).toBeInTheDocument()
  })

  it('renders "Connecting" text when state is connecting', () => {
    render(<ConnectionStatus state="connecting" />)
    expect(screen.getByText('Connecting')).toBeInTheDocument()
  })

  it('renders "Connected" text when state is connected', () => {
    render(<ConnectionStatus state="connected" />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('renders "Disconnected" text when state is disconnected', () => {
    render(<ConnectionStatus state="disconnected" />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('renders "Connection Failed" text when state is failed', () => {
    render(<ConnectionStatus state="failed" />)
    expect(screen.getByText('Connection Failed')).toBeInTheDocument()
  })
})
