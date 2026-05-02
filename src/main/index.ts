import { app, BrowserWindow, Menu, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { registerIpcHandlers } from './ipc/handlers'
import { getDb, closeDb } from './db/connection'
import { audit } from './audit'

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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
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
    if (!app.isPackaged && process.platform === 'darwin') {
      app.dock?.setIcon(devIconPath)
    }
    if (process.platform === 'darwin') buildMacAppMenu()
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
