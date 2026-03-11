import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useCallStore } from '../store'

// Mock wouter
vi.mock('wouter', () => ({
  useParams: () => ({ id: 'test-room' }),
  useLocation: () => ['/', vi.fn()],
}))

// Mock hooks
vi.mock('../hooks/usePeer', () => ({
  usePeer: () => ({ peerRef: { current: null } }),
}))

vi.mock('../hooks/useMedia', () => ({
  useMedia: () => ({
    streamRef: { current: null },
    error: null,
    isLoading: false,
    toggleMic: vi.fn(),
    toggleCamera: vi.fn(),
    isMicOn: true,
    isCameraOn: true,
  }),
}))

vi.mock('../hooks/useCall', () => ({
  useCall: () => ({
    remoteStreamRef: { current: null },
    hangUp: vi.fn(),
  }),
}))

// Stub child components so their real deps don't need to load
vi.mock('../components/CallView', () => ({
  CallView: () => <div data-testid="call-view">CallView stub</div>,
}))

vi.mock('../components/MeetingEnded', () => ({
  MeetingEnded: () => <div data-testid="meeting-ended">MeetingEnded stub</div>,
}))

vi.mock('../components/ConnectionStatus', () => ({
  ConnectionStatus: ({ state }: { state: string }) => (
    <span data-testid="connection-status">{state}</span>
  ),
}))

vi.mock('../components/VideoPreview', () => ({
  VideoPreview: () => <video data-testid="video-preview" />,
}))

vi.mock('../components/MediaControls', () => ({
  MediaControls: () => <div data-testid="media-controls">MediaControls stub</div>,
}))

vi.mock('../components/CopyLinkButton', () => ({
  CopyLinkButton: () => <button data-testid="copy-link-button">Copy link</button>,
}))

vi.mock('../components/SelfViewOverlay', () => ({
  SelfViewOverlay: () => <div data-testid="self-view-overlay">SelfViewOverlay stub</div>,
}))

import { RoomPage } from './RoomPage'

describe('RoomPage', () => {
  beforeEach(() => {
    useCallStore.getState().reset()
  })

  it('renders MeetingEnded when callEnded is true', () => {
    useCallStore.setState({ callEnded: true })

    render(<RoomPage />)

    expect(screen.getByTestId('meeting-ended')).toBeInTheDocument()
    expect(screen.queryByTestId('call-view')).not.toBeInTheDocument()
  })

  it('renders CallView when connectionState is connected and callEnded is false', () => {
    useCallStore.setState({ connectionState: 'connected', callEnded: false })

    render(<RoomPage />)

    expect(screen.getByTestId('call-view')).toBeInTheDocument()
    expect(screen.queryByTestId('meeting-ended')).not.toBeInTheDocument()
  })

  it('renders lobby with Join Meeting button when not joined', () => {
    useCallStore.setState({ connectionState: 'idle', callEnded: false, joined: false })

    render(<RoomPage />)

    expect(screen.getByText('Join Meeting')).toBeInTheDocument()
    expect(screen.queryByTestId('call-view')).not.toBeInTheDocument()
    expect(screen.queryByTestId('meeting-ended')).not.toBeInTheDocument()
  })

  it('renders lobby with Waiting for peer after joining', () => {
    useCallStore.setState({ connectionState: 'idle', callEnded: false, joined: true })

    render(<RoomPage />)

    expect(screen.getByText('Waiting for peer...')).toBeInTheDocument()
    expect(screen.queryByText('Join Meeting')).not.toBeInTheDocument()
  })
})
