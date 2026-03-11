import { webcrypto } from 'node:crypto'
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}
import '@testing-library/jest-dom'
