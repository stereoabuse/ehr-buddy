import { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { registerIpcHandlers } from './ipc/handlers'
import { getDb, closeDb } from './db/connection'
import { audit } from './audit'
import { migrateLegacyWindowsUserData } from './migrate-legacy-userdata'
import { IPC } from '../shared/ipc-channels'

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

// Renderer-reported "does the open form have unsaved changes" flag. Drives
// the native close-confirmation dialog below. Reset on reload/navigation so
// a stale true can't outlive the form that set it.
let hasUnsavedChanges = false
// Distinguishes a full app quit (Cmd+Q, dock > Quit) from an ordinary window
// close (Cmd+W, red button): before-quit only fires for the former.
let isQuitRequested = false

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

  // Block close (window or quit) while a form is dirty; confirm via native
  // dialog rather than the renderer beforeunload, which Electron cancels
  // with no visible prompt at all.
  mainWindow.on('close', (event) => {
    if (!hasUnsavedChanges) return
    event.preventDefault()
    const quitRequested = isQuitRequested
    isQuitRequested = false
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Keep editing', 'Discard changes'],
      defaultId: 0,
      cancelId: 0,
      message: 'You have unsaved changes.',
      detail: 'If you discard changes, your unsaved edits will be lost.'
    })
    if (choice === 1) {
      hasUnsavedChanges = false
      mainWindow.destroy()
      // preventDefault() above aborted any in-progress quit sequence; if this
      // close was part of a quit request, restart it now that the window is
      // actually gone.
      if (quitRequested) app.quit()
    }
  })

  // A real page reload/navigation bypasses the in-app router, so reset the
  // flag rather than leave it stuck true for a page that no longer exists.
  mainWindow.webContents.on('did-navigate', () => {
    hasUnsavedChanges = false
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
    ipcMain.on(IPC.APP_SET_UNSAVED_CHANGES, (_e, dirty: unknown) => {
      hasUnsavedChanges = Boolean(dirty)
    })
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    isQuitRequested = true
  })

  // Fires only once the quit is actually proceeding (i.e. not aborted by the
  // close handler's preventDefault() above), so a cancelled/discarded quit
  // never leaves the app running with its db connection already closed.
  app.on('will-quit', () => {
    closeDb()
  })
}
