import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Unit tests target the pure, environment-neutral modules (shared logic and
// renderer libs). Electron/native (better-sqlite3) modules are intentionally
// out of scope here — see the security review notes on the native ABI.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@': resolve('src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true
  }
})
