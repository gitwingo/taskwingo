import { app, Notification, shell, BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'

const REPO_OWNER = 'gitwingo'
const REPO_NAME = 'taskwingo'
const RELEASES_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`

// How often to re-check while the app stays open (6 hours)
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let lastCheckedTag: string | null = null
let mainWindowRef: BrowserWindow | null = null

function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf-8'))
    return pkg.version ?? '0.0.0'
  } catch {
    return app.getVersion() || '0.0.0'
  }
}

// Compares "1.2.3" style semver strings. Returns true if `latest` is newer than `current`.
function isNewerVersion(latest: string, current: string): boolean {
  const clean = (v: string) => v.replace(/^v/i, '').split('-')[0]
  const a = clean(latest).split('.').map(n => parseInt(n, 10) || 0)
  const b = clean(current).split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

interface GithubRelease {
  tag_name: string
  html_url: string
  name: string
  draft: boolean
  prerelease: boolean
}

async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const res = await fetch(RELEASES_API, {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Taskwingo-App' }
    })
    if (!res.ok) {
      console.warn('[UpdateCheck] GitHub API returned', res.status)
      return null
    }
    const data = await res.json() as GithubRelease
    if (data.draft || data.prerelease) return null
    return data
  } catch (e: any) {
    console.warn('[UpdateCheck] Failed to fetch latest release:', e.message)
    return null
  }
}

async function checkForUpdate(): Promise<void> {
  const release = await fetchLatestRelease()
  if (!release) return

  const currentVersion = getCurrentVersion()
  const latestVersion = release.tag_name

  if (!isNewerVersion(latestVersion, currentVersion)) return
  // Avoid re-notifying for the same tag within this app session
  if (lastCheckedTag === latestVersion) return
  lastCheckedTag = latestVersion

  const releaseUrl = release.html_url || RELEASES_PAGE

  if (Notification.isSupported()) {
    const notif = new Notification({
      title: '🚀 Taskwingo update available',
      body: `${release.name || latestVersion} is ready to download. Click to view the release.`,
      icon: join(__dirname, '../renderer/logo.ico')
    })
    notif.on('click', () => shell.openExternal(releaseUrl))
    notif.show()
  }

  // Also tell the renderer, so it can show an in-app banner as a fallback
  mainWindowRef?.webContents.send('update:available', {
    version: latestVersion,
    name: release.name,
    url: releaseUrl
  })
}

export function startUpdateChecker(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow
  // First check shortly after launch (let the window settle first)
  setTimeout(() => checkForUpdate(), 5000)
  // Recurring check
  setInterval(() => checkForUpdate(), CHECK_INTERVAL_MS)
}

export { RELEASES_PAGE }
