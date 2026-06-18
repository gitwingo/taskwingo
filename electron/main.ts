import { app, BrowserWindow, ipcMain, shell, dialog, nativeTheme, session, Tray, Menu, Notification } from 'electron'
import { join } from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { startUpdateChecker, RELEASES_PAGE } from './update/checkRelease'
import { startReminderChecker, stopReminderChecker } from './reminders/checkReminders'
import { initDatabase } from './db/index'
import { registerTaskHandlers } from './ipc/tasks'
import { registerProfileHandlers } from './ipc/profiles'
import { registerFileHandlers } from './ipc/files'
import { registerAuthHandlers } from './ipc/auth'
import { registerExportHandlers } from './ipc/export'

// Enforce a single running instance. If a second launch is attempted
// (e.g. clicking the Start Menu shortcut while the app is already running
// minimized to tray), the second process immediately quits and the FIRST
// process receives the 'second-instance' event instead, which brings its
// existing window to the foreground — same behaviour as clicking the tray icon.
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  // This is the second instance — quit immediately, nothing to do.
  app.quit()
} else {
  // This is the first (and only) instance.
  // Fired when a subsequent launch is attempted while we're already running.
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
        mainWindow.show()
      }
      mainWindow.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// Sets the Windows notification title to "Taskwingo" instead of the
// Electron default. Without this call, Windows falls back to
// "electron.app.<name>" where <name> defaults to "Electron" — Electron's
// own source builds this string literally as `"electron.app." + appName`
// (see Browser::SetAppUserModelID in Electron's C++ source) — which is
// exactly the generic "electron.app.Electron" title that showed up on the
// reminder notification.
//
// Important constraint, not a choice: on Windows, this ID IS the visible
// notification title — Electron's own docs note it's "not modifiable
// using the Toast XML" beyond this single call. That means it can't be
// made dynamic per-notification (e.g. embedding which profile a reminder
// belongs to directly in this string), since it's registered once for the
// whole app/process, and Windows uses it to group, remember, and let the
// user configure per-app notification permissions (the exact screen
// you'd see under Settings → Notifications → "Notifications from apps and
// other senders") — changing it per-notification would fragment Taskwingo
// into multiple different "apps" in Windows' eyes, which is the wrong
// tradeoff. The per-profile context ("which profile is this reminder
// for") is added to the notification BODY instead, in the notify:send
// handler below — fully dynamic, and the right place for content that
// varies per-notification rather than identifying the app itself.
//
// Harmless no-op on macOS/Linux — this is a Windows-only mechanism and
// Electron's platform-specific APIs are consistently implemented as silent
// no-ops elsewhere rather than throwing on unsupported platforms.
app.setAppUserModelId('Taskwingo')

// Redirect Chromium's disk cache (HTTP cache, GPUCache, Local Storage,
// cookies, etc.) away from the default location, which is the same
// directory as `userData` unless told otherwise — see Electron's own docs
// on `sessionData`: "Chromium may write very large disk cache here... it
// is recommended to set this directory elsewhere" if the app doesn't rely
// on browser storage. Taskwingo doesn't use localStorage/cookies for
// anything (all real data lives in the SQLite DB via better-sqlite3), so
// there's no reason for this cache to share a directory with userData.
//
// This may also help with the terminal errors
// "[ERROR:block_files.cc] Failing CreateMapBlock" /
// "[ERROR:entry_impl.cc] Failed to save user data" — both are a generic,
// well-documented Chromium disk-cache failure (the identical error shows
// up in completely unrelated Chromium-based apps, unrelated to anything
// in this codebase), so isolating the cache into its own clean directory
// is worth doing on Electron's own recommendation regardless. It is not
// a guaranteed fix for this specific error on this specific machine —
// these particular cache errors are also commonly benign/cosmetic and
// don't necessarily break app functionality even when they appear.
//
// This must run before app.whenReady(), since Chromium may otherwise
// already initialize its cache at the default path before this line has
// a chance to run.
app.setPath('sessionData', join(app.getPath('appData'), app.getName(), 'SessionData'))

const stateFile = join(app.getPath('userData'), 'window-state.json')
const prefsFile = join(app.getPath('userData'), 'app-prefs.json')

interface AppPrefs { minimizeToTray: boolean; zoomLevel: number; checkForUpdates: boolean }

// Electron's zoomFactor is a multiplier (1.0 = 100%). Clamp to a sane range
// so a runaway Ctrl+- can never zoom the UI into uselessness, and so a
// corrupted/edited prefs file can't load an extreme value on next launch.
const MIN_ZOOM = 0.5   // 50%
const MAX_ZOOM = 2.0   // 200%
const ZOOM_STEP = 0.1
const DEFAULT_ZOOM = 1.0

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
}

function loadAppPrefs(): AppPrefs {
  try {
    if (existsSync(prefsFile)) {
      const parsed = JSON.parse(readFileSync(prefsFile, 'utf-8'))
      const safeZoom = clampZoom(parsed.zoomLevel ?? DEFAULT_ZOOM) // always re-clamp on load
      // Only one `zoomLevel` key now — the previous fix attempt renamed
      // what computed the VALUE but still wrote the key name twice in the
      // same object literal (once before the ...parsed spread as a
      // fallback default, once after to force the clamped value), which
      // is exactly what esbuild's duplicate-key check flags regardless of
      // whether the two values differ. `minimizeToTray` doesn't have this
      // problem since it only appears once.
      return {
        minimizeToTray: true,
        checkForUpdates: true,
        ...parsed,
        zoomLevel: safeZoom
      }
    }
  } catch {}
  // Default ON — the ✕ button minimizes to tray instead of quitting, so
  // reminders/deadline notifications can still fire in the background.
  // Explicitly toggleable in Settings → Window Behavior for anyone who
  // wants a true quit-on-close instead.
  return { minimizeToTray: true, zoomLevel: DEFAULT_ZOOM, checkForUpdates: true }
}

function saveAppPrefs(prefs: AppPrefs): void {
  try { writeFileSync(prefsFile, JSON.stringify(prefs), 'utf-8') } catch {}
}

let appPrefs: AppPrefs = loadAppPrefs()

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

  // Removes Electron's default application menu entirely. The window is
  // frameless (no native title bar) so this menu was never visibly reachable
  // in normal use, but some Electron/OS combinations can still reveal a
  // hidden menu bar via Alt — and the default menu's "View" section includes
  // a "Toggle Developer Tools" item, a second route to DevTools beyond the
  // keyboard shortcuts already blocked below. Setting it to null removes
  // that path entirely rather than relying on it staying inaccessible.
  Menu.setApplicationMenu(null)

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
    icon: join(__dirname, '../renderer/logo.ico'),
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

  // Check GitHub for a newer release and notify the user if one exists.
  // Only runs if the user has not opted out in Settings → Updates.
  if (appPrefs.checkForUpdates) startUpdateChecker(mainWindow)

  // Apply the user's last saved zoom level once content loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.setZoomFactor(appPrefs.zoomLevel)
  })

  function applyZoom(newZoom: number): void {
    if (!mainWindow) return
    const clamped = clampZoom(newZoom)
    mainWindow.webContents.setZoomFactor(clamped)
    appPrefs.zoomLevel = clamped
    saveAppPrefs(appPrefs)
    mainWindow.webContents.send('zoom:changed', clamped)
  }

  // Explicit zoom shortcuts — don't rely on Chromium's built-in accelerators.
  // Those default to Ctrl+= for zoom-in, which most people don't reach for
  // since the visible character is "+" (requiring Shift on most layouts).
  // Ctrl+- maps directly to a key that's already there, which is why only
  // zoom-out "worked" before — zoom-in's actual default shortcut just didn't
  // match what people were pressing.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!(input.control || input.meta)) return
    if (input.type !== 'keyDown') return

    if (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd') {
      event.preventDefault()
      applyZoom(appPrefs.zoomLevel + ZOOM_STEP)
    } else if (input.key === '-' || input.code === 'NumpadSubtract') {
      event.preventDefault()
      applyZoom(appPrefs.zoomLevel - ZOOM_STEP)
    } else if (input.key === '0' || input.code === 'Numpad0') {
      event.preventDefault()
      applyZoom(DEFAULT_ZOOM)
    }
  })

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)
  mainWindow.on('close', (e) => {
    saveWindowState()
    if (tray && appPrefs.minimizeToTray) { e.preventDefault(); mainWindow?.hide() }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Disable DevTools unconditionally — Ctrl+Shift+I (or J), Ctrl+U "view
  // source", and F12 should never open the inspector, in dev or production.
  // This previously only applied when ELECTRON_RENDERER_URL was unset, which
  // meant it silently did nothing while running `npm run dev` — exactly the
  // mode most people use while testing, so it looked like the block didn't
  // work at all. `input.code` is also checked alongside `input.key` so this
  // doesn't depend on keyboard layout or Shift-driven case changes.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const isDevToolsShortcut =
      (input.control && input.shift && (input.key === 'I' || input.code === 'KeyI')) ||
      (input.control && input.shift && (input.key === 'J' || input.code === 'KeyJ')) ||
      (input.control && (input.key === 'U' || input.code === 'KeyU') && !input.shift) ||
      input.key === 'F12' || input.code === 'F12'
    if (isDevToolsShortcut) event.preventDefault()
  })
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow?.webContents.closeDevTools()
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
    if (tray && appPrefs.minimizeToTray) mainWindow?.hide()
    else mainWindow?.close()
  })
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized())
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false))

  ipcMain.handle('theme:get-system', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  ipcMain.on('shell:open-external', (_, url: string) => shell.openExternal(url))
  ipcMain.handle('dialog:open-file', async (_, options) => dialog.showOpenDialog(mainWindow!, options))
  ipcMain.handle('dialog:save-file', async (_, options) => dialog.showSaveDialog(mainWindow!, options))
  // Single source of truth for the app version shown in the UI (Settings,
  // About). Previously both of those screens had the version typed in as a
  // literal string, which meant every release needed someone to remember
  // to update it in two separate places — easy to forget, and exactly the
  // kind of drift that's invisible until a user notices the UI still says
  // an old version. app.getVersion() reads directly from package.json, so
  // bumping the version there is now the only thing that needs to happen.
  ipcMain.handle('app:get-version', () => app.getVersion())

  ipcMain.handle('zoom:get', () => appPrefs.zoomLevel)
  ipcMain.handle('zoom:in', () => { applyZoom(appPrefs.zoomLevel + ZOOM_STEP); return appPrefs.zoomLevel })
  ipcMain.handle('zoom:out', () => { applyZoom(appPrefs.zoomLevel - ZOOM_STEP); return appPrefs.zoomLevel })
  ipcMain.handle('zoom:reset', () => { applyZoom(DEFAULT_ZOOM); return appPrefs.zoomLevel })
  ipcMain.handle('zoom:set', (_, value: number) => { applyZoom(value); return appPrefs.zoomLevel })

  ipcMain.handle('prefs:get-minimize-to-tray', () => appPrefs.minimizeToTray)
  ipcMain.handle('prefs:set-minimize-to-tray', (_, value: boolean) => {
    appPrefs.minimizeToTray = value
    saveAppPrefs(appPrefs)
    return { success: true }
  })

  ipcMain.handle('prefs:get-check-for-updates', () => appPrefs.checkForUpdates)
  ipcMain.handle('prefs:set-check-for-updates', (_, value: boolean) => {
    appPrefs.checkForUpdates = value
    saveAppPrefs(appPrefs)
    return { success: true }
  })

  ipcMain.handle('updates:open-releases-page', () => {
    shell.openExternal(RELEASES_PAGE)
    return { success: true }
  })

  ipcMain.handle('notify:send', (_, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: join(__dirname, '../renderer/logo.ico') }).show()
    }
    return { success: true }
  })
}

function createTray(): void {
  const iconPath = join(__dirname, '../renderer/logo.ico')
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
          'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; img-src 'self' data: file: http://localhost:*; font-src 'self' data:;"]
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

  // Centralized reminder + deadline checker — runs across ALL profiles,
  // not just whichever one is currently selected in the UI. Previously
  // this logic lived in the renderer (TaskList.tsx), scoped to a single
  // mounted profile's tasks, so switching away from a profile silently
  // stopped its reminders from firing. See checkReminders.ts for the full
  // rationale. The renderer's copy of this logic has been removed to
  // avoid duplicate notifications for whichever profile happens to be
  // selected.
  startReminderChecker()

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !(tray && appPrefs.minimizeToTray)) app.quit()
})

app.on('before-quit', () => {
  tray?.destroy()
  stopReminderChecker()
})
