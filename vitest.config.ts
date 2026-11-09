import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Most tests target pure, environment-neutral modules (shared logic and
// renderer libs) and run in Node. Component tests (*.test.tsx) opt into jsdom
// per file and stub window.api, so they never touch Electron or the native
// better-sqlite3 module.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@': resolve('src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true
  }
})
