import React, { useEffect, useState } from 'react'

interface UpdateInfo {
  version: string
  name: string
  url: string
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubscribe = window.electronAPI.updates.onAvailable((info: UpdateInfo) => {
      setUpdate(info)
      setDismissed(false)
    })
    return unsubscribe
  }, [])

  if (!update || dismissed) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px', background: 'var(--accent-subtle)',
      borderBottom: '1px solid var(--accent)', fontSize: 12.5,
      color: 'var(--text-primary)', flexShrink: 0
    }}>
      <span style={{ fontSize: 14 }}>🚀</span>
      <span style={{ flex: 1 }}>
        <strong>{update.name || update.version}</strong> is available — a new version of Taskwingo is ready to download.
      </span>
      <button
        onClick={() => window.electronAPI.shell.openExternal(update.url)}
        className="btn btn-primary btn-sm"
      >View Release</button>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 4px' }}
      >✕</button>
    </div>
  )
}
