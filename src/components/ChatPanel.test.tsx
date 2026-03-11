import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatPanel } from './ChatPanel'
import { useCallStore } from '../store'

// Mock the store
vi.mock('../store', () => ({
  useCallStore: vi.fn(),
}))

const mockSetChatOpen = vi.fn()

function setupStore(messages = []) {
  vi.mocked(useCallStore).mockReturnValue({
    messages,
    isChatOpen: true,
    setChatOpen: mockSetChatOpen,
  } as ReturnType<typeof useCallStore>)
}

describe('ChatPanel', () => {
  const onSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    onSend.mockReset()
    mockSetChatOpen.mockReset()
    setupStore()
  })

  it('renders message list with correct labels for local messages', () => {
    setupStore([
      { from: 'local', text: 'Hello there', timestamp: Date.now() },
    ])
    render(<ChatPanel onSend={onSend} isReady={true} />)
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders message list with correct labels for remote messages', () => {
    setupStore([
      { from: 'remote', text: 'Hi back', timestamp: Date.now() },
    ])
    render(<ChatPanel onSend={onSend} isReady={true} />)
    expect(screen.getByText('Them')).toBeInTheDocument()
    expect(screen.getByText('Hi back')).toBeInTheDocument()
  })

  it('send button is disabled when isReady is false', () => {
    render(<ChatPanel onSend={onSend} isReady={false} />)
    const button = screen.getByRole('button', { name: /send/i })
    expect(button).toBeDisabled()
  })

  it('send button is disabled when input is empty even if isReady is true', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const button = screen.getByRole('button', { name: /send/i })
    expect(button).toBeDisabled()
  })

  it('pressing Enter in the input calls onSend with the input text', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello world' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('hello world')
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('empty input does not call onSend on Enter', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('whitespace-only input does not call onSend on Enter', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' } )
    expect(onSend).not.toHaveBeenCalled()
  })

  it('clicking Send button calls onSend with the input text', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test message' } })
    const button = screen.getByRole('button', { name: /send/i })
    fireEvent.click(button)
    expect(onSend).toHaveBeenCalledWith('test message')
  })

  it('input clears after send via Enter', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'clear me' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('')
  })

  it('input clears after send via button click', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'clear me too' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(input.value).toBe('')
  })

  it('close button calls setChatOpen(false)', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const closeBtn = screen.getByRole('button', { name: /close chat/i })
    fireEvent.click(closeBtn)
    expect(mockSetChatOpen).toHaveBeenCalledWith(false)
  })

  it('input enforces 500 character max length', () => {
    render(<ChatPanel onSend={onSend} isReady={true} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('maxLength', '500')
  })
})
