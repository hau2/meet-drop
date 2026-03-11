import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    // Reset sessionStorage and dark class before each test
    sessionStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    sessionStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('Test 1: returns isDark=true by default (dark class added by synchronous init)', () => {
    // Simulate dark class already applied (as main.tsx would do)
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(true)
  })

  it('Test 2: toggleTheme() removes dark class and sets sessionStorage to light', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current.toggleTheme()
    })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(sessionStorage.getItem('theme')).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('Test 3: toggleTheme() again re-adds dark class and sets sessionStorage to dark', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current.toggleTheme()
    })
    act(() => {
      result.current.toggleTheme()
    })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(sessionStorage.getItem('theme')).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('Test 4: when sessionStorage has light, useTheme initializes isDark=false', () => {
    sessionStorage.setItem('theme', 'light')
    // Simulate main.tsx removing dark class when sessionStorage is 'light'
    document.documentElement.classList.remove('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(false)
  })
})
