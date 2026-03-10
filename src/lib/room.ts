import { customAlphabet } from 'nanoid'

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const generateId = customAlphabet(alphabet, 6)

export function generateRoomId(): string {
  return `meet-${generateId()}`
}
