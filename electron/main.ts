import { app, BrowserWindow, ipcMain, shell, dialog, nativeTheme, session, Tray, Menu, Notification } from 'electron'
import { join } from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { initDatabase } from './db/index'
import { registerTaskHandlers } from './ipc/tasks'
import { registerProfileHandlers } from './ipc/profiles'
import { registerFileHandlers } from './ipc/files'
import { registerAuthHandlers } from './ipc/auth'
import { registerExportHandlers } from './ipc/export'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

const stateFile = join(app.getPath('userData'), 'window-state.json')

function loadWindowState() {
  try {
    if (existsSync(stateFile)) return JSON.parse(readFileSync(stateFile, 'utf-8'))
  } catch {}
  return { width: 1280, height: 800, x: undefined, y: undefined, maximized: false }
}

function saveWindowState() {
  if (!mainWindow) return
  try {
    const bounds = mainWindow.getBounds()
    const maximized = mainWindow.isMaximized()
    writeFileSync(stateFile, JSON.stringify({ ...bounds, maximized }), 'utf-8')
  } catch {}
}

function createWindow(): void {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width ?? 1280,
    height: state.height ?? 800,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f0f',
    icon: join(__dirname, '../../logo.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    },
    show: false
  })

  if (state.maximized) mainWindow.maximize()

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)
  mainWindow.on('close', (e) => {
    saveWindowState()
    if (tray) { e.preventDefault(); mainWindow?.hide() }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Catch renderer crashes — show error dialog instead of blank screen
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer crashed:', details)
    dialog.showErrorBox(
      'Taskwingo — Renderer Error',
      `The app renderer crashed unexpectedly.\n\nReason: ${details.reason}\n\nPlease restart the app. If this keeps happening, delete the "out" folder and run "npm run dev" again.`
    )
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
    // Retry loading once after a short delay
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const devUrl = process.env['ELECTRON_RENDERER_URL']
        if (devUrl) mainWindow.loadURL(devUrl)
        else mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
      }
    }, 1000)
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    // Only open devtools if explicitly requested via env var
    if (process.env['OPEN_DEVTOOLS'] === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // IPC: window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => {
    saveWindowState()
    if (tray) mainWindow?.hide()
    else mainWindow?.close()
  })
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized())
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false))

  ipcMain.handle('theme:get-system', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  ipcMain.on('shell:open-external', (_, url: string) => shell.openExternal(url))
  ipcMain.handle('dialog:open-file', async (_, options) => dialog.showOpenDialog(mainWindow!, options))
  ipcMain.handle('dialog:save-file', async (_, options) => dialog.showSaveDialog(mainWindow!, options))
  ipcMain.handle('notify:send', (_, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: join(__dirname, '../../logo.ico') }).show()
    }
    return { success: true }
  })
}

function createTray(): void {
  const iconPath = join(__dirname, '../../logo.ico')
  if (!existsSync(iconPath)) return
  try {
    tray = new Tray(iconPath)
    tray.setToolTip('Taskwingo')
    tray.on('click', () => {
      if (mainWindow?.isVisible()) mainWindow.focus()
      else { mainWindow?.show(); mainWindow?.focus() }
    })
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Taskwingo', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { type: 'separator' },
      { label: 'Quit', click: () => { tray?.destroy(); app.exit(0) } }
    ]))
  } catch (e) {
    console.warn('Could not create tray:', e)
  }
}

app.whenReady().then(async () => {
  if (process.env['ELECTRON_RENDERER_URL']) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; img-src 'self' data: file: http://localhost:*; font-src 'self' data: https://fonts.gstatic.com;"]
        }
      })
    })
  }

  try {
    initDatabase()
  } catch (e: any) {
    dialog.showErrorBox('Taskwingo — Database Error', `Failed to initialise database:\n${e.message}`)
    app.quit()
    return
  }

  registerTaskHandlers()
  registerProfileHandlers()
  registerFileHandlers()
  registerAuthHandlers()
  registerExportHandlers()

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit()
})

app.on('before-quit', () => {
  tray?.destroy()
})
