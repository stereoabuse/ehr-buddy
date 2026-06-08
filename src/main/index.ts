import { app, BrowserWindow, Menu, session, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { registerIpcHandlers } from './ipc/handlers'
import { getDb, closeDb } from './db/connection'
import { audit } from './audit'
import { migrateLegacyWindowsUserData } from './migrate-legacy-userdata'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Set the app name early. On macOS this controls the dev application menu
// title (which otherwise reads "Electron"); on Windows it controls the
// userData folder name (otherwise %APPDATA%/Electron). Packaged builds pick
// up the correct name from electron-builder's productName, but unpackaged
// dev runs need this explicit override.
app.setName('EHR Buddy')

// In dev, point the window/dock at the source PNG so we don't see the generic
// Electron logo. In packaged builds the OS reads the icon from the bundle
// (icon.icns on macOS, icon.ico embedded in the .exe on Windows) — both are
// produced from resources/ via electron-builder's buildResources, so we don't
// need a runtime path.
const devIconPath = join(__dirname, '../../resources/icon.png')
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

function openAllowedExternalUrl(rawUrl: string): void {
  try {
    const url = new URL(rawUrl)
    if (ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol)) {
      shell.openExternal(url.toString())
    } else {
      console.warn(`[security] blocked external URL protocol: ${url.protocol}`)
    }
  } catch {
    console.warn(`[security] blocked invalid external URL: ${rawUrl}`)
  }
}

function isSameDocumentNavigation(rawUrl: string, currentRawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    const current = new URL(currentRawUrl)
    return (
      url.origin === current.origin &&
      url.pathname === current.pathname &&
      url.search === current.search
    )
  } catch {
    return false
  }
}

// Content-Security-Policy applied to every response via the default session.
// Packaged builds get a strict policy; dev relaxes script/connect so Vite's
// HMR client (inline bootstrap + ws:// websocket) keeps working.
function installContentSecurityPolicy(): void {
  const packagedCsp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'"
  ].join('; ')

  const devCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' ws: http: https:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'"
  ].join('; ')

  const csp = app.isPackaged ? packagedCsp : devCsp

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

function buildMacAppMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { label: 'File', submenu: [{ role: 'close' }] },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(app.isPackaged ? {} : { icon: devIconPath }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (!app.isPackaged) mainWindow.webContents.openDevTools({ mode: 'right' })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openAllowedExternalUrl(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isSameDocumentNavigation(url, mainWindow.webContents.getURL())) return
    event.preventDefault()
    openAllowedExternalUrl(url)
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Prevent a second instance from racing the same SQLite file.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    installContentSecurityPolicy()
    if (!app.isPackaged && process.platform === 'darwin') {
      app.dock?.setIcon(devIconPath)
    }
    if (process.platform === 'darwin') buildMacAppMenu()
    migrateLegacyWindowsUserData()
    getDb()
    audit('app_start', 'app', null, { version: app.getVersion() })
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    closeDb()
  })
}
