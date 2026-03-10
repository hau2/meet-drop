import { describe, it, expect } from 'vitest'
import { generateRoomId } from './room'

describe('generateRoomId', () => {
  it('returns a string matching /^meet-[a-z0-9]{6}$/', () => {
    const id = generateRoomId()
    expect(id).toMatch(/^meet-[a-z0-9]{6}$/)
  })

  it('produces unique IDs across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRoomId()))
    expect(ids.size).toBe(100)
  })
})
