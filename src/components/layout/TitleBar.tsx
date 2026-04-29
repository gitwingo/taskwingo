import React, { useState, useEffect } from 'react'
import appLogo from '../../public/logo.png'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [iconError, setIconError] = useState(false)

  useEffect(() => {
    window.electronAPI.window.isMaximized().then(setIsMaximized)
    const unsub = window.electronAPI.window.onMaximized(setIsMaximized)
    return unsub
  }, [])

  return (
    <div style={{
      height: 36,
      background: 'var(--titlebar-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)',
      WebkitAppRegion: 'drag' as any,
      flexShrink: 0,
      paddingLeft: 12
    }}>
      {/* App name + icon */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 12, fontWeight: 600,
        color: 'var(--text-muted)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
      }}>
        {!iconError ? (
          <img
            src={appLogo}
            alt=""
            onError={() => setIconError(true)}
            style={{ width: 16, height: 16, objectFit: 'contain', opacity: 0.8 }}
          />
        ) : (
          <span style={{ fontSize: 13 }}>✦</span>
        )}
        Taskwingo
      </div>

      {/* Window controls */}
      <div style={{
        display: 'flex', alignItems: 'center',
        WebkitAppRegion: 'no-drag' as any,
        height: '100%'
      }}>
        <WinBtn onClick={() => window.electronAPI.window.minimize()} title="Minimize" hoverColor="rgba(255,255,0,0.1)">
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>
        </WinBtn>
        <WinBtn onClick={() => window.electronAPI.window.maximize()} title={isMaximized ? 'Restore' : 'Maximize'} hoverColor="rgba(0,255,0,0.1)">
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="0" width="8" height="8"/>
              <rect x="0" y="2" width="8" height="8" fill="var(--titlebar-bg)"/>
              <rect x="0" y="2" width="8" height="8"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0" y="0" width="10" height="10"/>
            </svg>
          )}
        </WinBtn>
        <WinBtn onClick={() => window.electronAPI.window.close()} title="Close" hoverColor="rgba(255,0,0,0.2)">
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10"/>
            <line x1="10" y1="0" x2="0" y2="10"/>
          </svg>
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({ children, onClick, title, hoverColor }: {
  children: React.ReactNode; onClick: () => void; title: string; hoverColor: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 44, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)',
        background: hovered ? hoverColor : 'transparent',
        transition: 'background 0.15s',
        cursor: 'pointer', border: 'none'
      }}
    >{children}</button>
  )
}
