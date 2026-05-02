// Dev-only: rewrite node_modules/electron/dist/Electron.app/Contents/Info.plist
// so the running binary's CFBundleName is "EHR Buddy". macOS reads this at
// launch for the application menu and the dock tooltip, and Electron exposes
// no runtime override for it. Re-runs on every npm install via postinstall.
//
// Packaged builds get the correct name from electron-builder's productName, so
// this script is a no-op outside macOS dev.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const APP_NAME = 'EHR Buddy'

if (process.platform !== 'darwin') {
  process.exit(0)
}

const appPath = join(process.cwd(), 'node_modules/electron/dist/Electron.app')
const plistPath = join(appPath, 'Contents/Info.plist')

if (!existsSync(plistPath)) {
  console.log('[patch-electron-name] Info.plist not found; skipping')
  process.exit(0)
}

const original = readFileSync(plistPath, 'utf8')

function rewriteKey(text, key, value) {
  const re = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)
  return re.test(text) ? text.replace(re, `$1${value}$2`) : text
}

let patched = original
patched = rewriteKey(patched, 'CFBundleName', APP_NAME)
patched = rewriteKey(patched, 'CFBundleDisplayName', APP_NAME)

if (patched === original) {
  console.log('[patch-electron-name] already patched')
  process.exit(0)
}

writeFileSync(plistPath, patched)
console.log(`[patch-electron-name] CFBundleName → ${APP_NAME}`)
