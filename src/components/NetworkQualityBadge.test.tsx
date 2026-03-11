import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NetworkQualityBadge } from './NetworkQualityBadge'
import type { NetworkQuality } from '../hooks/useNetworkQuality'

describe('NetworkQualityBadge', () => {
  it('renders nothing when quality is null', () => {
    const { container } = render(<NetworkQualityBadge quality={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders "Good" label for quality="good"', () => {
    render(<NetworkQualityBadge quality="good" />)
    expect(screen.getByTestId('network-quality-badge')).toBeDefined()
    expect(screen.getByText('Good')).toBeDefined()
  })

  it('renders with green styling for quality="good"', () => {
    render(<NetworkQualityBadge quality="good" />)
    const badge = screen.getByTestId('network-quality-badge')
    expect(badge.className).toContain('green')
  })

  it('renders "Fair" label for quality="fair"', () => {
    render(<NetworkQualityBadge quality="fair" />)
    expect(screen.getByTestId('network-quality-badge')).toBeDefined()
    expect(screen.getByText('Fair')).toBeDefined()
  })

  it('renders with yellow styling for quality="fair"', () => {
    render(<NetworkQualityBadge quality="fair" />)
    const badge = screen.getByTestId('network-quality-badge')
    expect(badge.className).toContain('yellow')
  })

  it('renders "Poor" label for quality="poor"', () => {
    render(<NetworkQualityBadge quality="poor" />)
    expect(screen.getByTestId('network-quality-badge')).toBeDefined()
    expect(screen.getByText('Poor')).toBeDefined()
  })

  it('renders with red styling for quality="poor"', () => {
    render(<NetworkQualityBadge quality="poor" />)
    const badge = screen.getByTestId('network-quality-badge')
    expect(badge.className).toContain('red')
  })

  it('has data-testid="network-quality-badge" attribute', () => {
    render(<NetworkQualityBadge quality="good" />)
    expect(screen.getByTestId('network-quality-badge')).toBeDefined()
  })
})
