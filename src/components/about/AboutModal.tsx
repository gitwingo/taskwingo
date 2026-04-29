import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'

const LINKS = [
  { label: 'GitHub', url: 'https://github.com/gitwingo', icon: 'G' },
  { label: 'Reddit', url: 'https://reddit.com/u/gitwingo', icon: 'R' },
  { label: 'X / Twitter', url: 'https://x.com/gitwingo', icon: 'X' }
]

export default function AboutModal() {
  const { setAboutOpen } = useAppStore()
  const [logoError, setLogoError] = useState(false)
  const [appIconError, setAppIconError] = useState(false)

  const openLink = (url: string) => window.electronAPI.shell.openExternal(url)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAboutOpen(false)}>
      <div className="modal-box" style={{ width: 400, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>About Taskwingo</h2>
          <button onClick={() => setAboutOpen(false)} className="btn-icon btn-ghost" style={{ fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: '24px 20px' }}>
          {/* App info with logo.ico */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
              overflow: 'hidden'
            }}>
              {!appIconError ? (
                <img
                  src="/logo.ico"
                  alt="Taskwingo"
                  onError={() => setAppIconError(true)}
                  style={{ width: 52, height: 52, objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: 32 }}>✦</span>
              )}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Taskwingo</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Version 1.0.0</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
              A clean personal task manager with multi-profile support,<br />file attachments, and PIN lock.
            </div>
          </div>

          <div className="divider" />

          {/* Creator */}
          <div style={{ padding: '16px 0' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12
            }}>Created by</div>

            {/* Creator card with gitwingo_logo.jpg */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              padding: '12px 14px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-subtle)'
            }}>
              {!logoError ? (
                <img
                  src="/gitwingo_logo.jpg"
                  alt="Gitwingo"
                  onError={() => setLogoError(true)}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    objectFit: 'cover', flexShrink: 0,
                    border: '2px solid var(--border)'
                  }}
                />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0
                }}>G</div>
              )}
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Gitwingo</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Developer & Designer</div>
              </div>
            </div>

            {/* Social links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {LINKS.map(link => (
                <button
                  key={link.url}
                  onClick={() => openLink(link.url)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                    cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13,
                    transition: 'background 0.15s, border-color 0.15s', textAlign: 'left'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--text-accent)' }}>{link.icon}</span>
                  <span style={{ flex: 1 }}>{link.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {link.url.replace('https://', '')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>↗</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Ko-Fi */}
          <div style={{ paddingTop: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10
            }}>Support the Project</div>
            <button
              onClick={() => openLink('https://ko-fi.com/gitwingo')}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 'var(--radius)',
                background: 'linear-gradient(135deg, #ff5e5b, #ff914d)',
                border: 'none', cursor: 'pointer', color: '#fff',
                fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, transition: 'opacity 0.15s, transform 0.1s',
                boxShadow: '0 2px 12px rgba(255,94,91,0.3)'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.opacity = '0.9'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.opacity = '1'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              ☕ Buy me a Ko-Fi
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              Your support keeps this app alive 💙
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
