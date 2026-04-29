import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Profile, ProfileLink } from '../../types'
import ProfileAvatar from './ProfileAvatar'
import { randomUUID } from '../../utils/id'
import PinManager from '../auth/PinManager'

export default function ProfileModal() {
  const { editingProfileId, profiles, setProfileModalOpen, setEditingProfileId, upsertProfile, removeProfile, activeProfileId, setActiveProfileId } = useAppStore()
  const existing = editingProfileId ? profiles.find(p => p.id === editingProfileId) : null

  const [name, setName] = useState(existing?.name ?? '')
  const [bio, setBio] = useState(existing?.bio ?? '')
  const [links, setLinks] = useState<ProfileLink[]>(existing?.links ?? [])
  const [avatarPath, setAvatarPath] = useState<string | null>(existing?.avatar_path ?? null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'links' | 'security'>('info')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const close = () => { setProfileModalOpen(false); setEditingProfileId(null) }

  const pickAvatar = async () => {
    const result = await window.electronAPI.dialog.openFile({
      title: 'Choose Avatar', properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg','jpeg','png','gif','webp'] }]
    })
    if (!result.canceled && result.filePaths?.[0]) {
      if (existing) await window.electronAPI.profiles.setAvatar(existing.id, result.filePaths[0])
      setAvatarPath(result.filePaths[0])
    }
  }

  const addLink = () => setLinks(l => [...l, { id: randomUUID(), label: '', url: '' }])
  const updateLink = (id: string, field: 'label' | 'url', val: string) => setLinks(l => l.map(link => link.id === id ? { ...link, [field]: val } : link))
  const removeLink = (id: string) => setLinks(l => l.filter(link => link.id !== id))

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const payload = { name: name.trim(), bio, links: links.filter(l => l.label || l.url), avatar_path: avatarPath }
    try {
      let result: any
      if (existing) result = await window.electronAPI.profiles.update(existing.id, payload)
      else result = await window.electronAPI.profiles.create(payload)
      if (result) upsertProfile({ ...result, links: JSON.parse(result.links || '[]') })
      if (!existing && !activeProfileId) setActiveProfileId(result.id)
      close()
    } catch(e: any) { setError(e.message) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!existing) return
    await window.electronAPI.profiles.delete(existing.id)
    removeProfile(existing.id); close()
  }

  const previewProfile = { name: name || 'Preview', avatar_path: avatarPath, color: existing?.color ?? '#6366f1', bio: '', links: [] }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal-box" style={{ width: 460, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProfileAvatar profile={previewProfile as any} size={30} />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{existing ? 'Edit Profile' : 'New Profile'}</h2>
          </div>
          <button onClick={close} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 20px' }}>
          {(['info', 'links', 'security'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 14px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--text-accent)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', marginBottom: -1, textTransform: 'capitalize', transition: 'color 0.15s'
            }}>{t}</button>
          ))}
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '60vh' }}>
          {tab === 'info' && (
            <>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <ProfileAvatar profile={previewProfile as any} size={56} />
                  <button onClick={pickAvatar} style={{
                    position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    cursor: 'pointer', border: 'none', color: '#fff', opacity: 0, transition: 'opacity 0.15s'
                  }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>📷</button>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{name || 'Profile Name'}</div>
                  <button className="btn btn-secondary btn-sm" onClick={pickAvatar}>Change Photo</button>
                </div>
              </div>

              {/* Fix #3: removed color picker — colors handled via accent color in Settings */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Name *</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Profile name" />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Short bio…" rows={2} />
              </div>
            </>
          )}

          {tab === 'links' && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Save social links and important URLs for this profile.</div>
              {links.map(link => (
                <div key={link.id} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input className="form-input" value={link.label} onChange={e => updateLink(link.id, 'label', e.target.value)} placeholder="Label (e.g. GitHub)" style={{ width: 120 }} />
                  <input className="form-input" value={link.url} onChange={e => updateLink(link.id, 'url', e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
                  <button onClick={() => removeLink(link.id)} className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={addLink}>+ Add Link</button>
            </div>
          )}

          {tab === 'security' && (
            existing ? <PinManager profileId={existing.id} />
              : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Save the profile first to configure PIN lock.</div>
          )}

          {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius)', fontSize: 13, marginTop: 10 }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {existing ? (
            confirmDelete ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Delete this profile?</span>
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>Yes</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>No</button>
              </div>
            ) : <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete Profile</button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={close}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Profile'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
