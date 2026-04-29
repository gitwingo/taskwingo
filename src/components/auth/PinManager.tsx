import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/appStore'

interface Props { profileId: number }
type Mode = 'view' | 'set' | 'change' | 'remove'
const PIN_LENGTH = 4

function PinDots({ value, onChange, label, inputRef, onFilled }: {
  value: string; onChange: (v: string) => void; label: string
  inputRef?: React.RefObject<HTMLInputElement>; onFilled?: (val: string) => void
}) {
  const [focused, setFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    onChange(val)
    if (val.length === PIN_LENGTH && onFilled) onFilled(val)
  }

  return (
    <div className="form-group" style={{ marginBottom: 14 }}>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div onClick={() => inputRef?.current?.focus()} style={{
          display: 'flex', gap: 10, padding: '11px 16px', borderRadius: 'var(--radius)',
          border: `2px solid ${focused ? 'var(--accent)' : value.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
          background: 'var(--bg-tertiary)',
          boxShadow: focused ? '0 0 0 3px var(--accent-subtle)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          cursor: 'text', width: 'fit-content', minWidth: 140
        }}>
          {Array(PIN_LENGTH).fill('').map((_, i) => (
            <div key={i} style={{
              width: 11, height: 11, borderRadius: '50%',
              background: i < value.length ? 'var(--accent)' : 'var(--border)',
              opacity: focused && i === value.length && value.length < PIN_LENGTH ? 0.4 : 1,
              transition: 'background 0.15s, opacity 0.15s', flexShrink: 0
            }} />
          ))}
        </div>
        {focused && (
          <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 3, fontWeight: 500 }}>
            {value.length === 0 ? 'Type your PIN' : value.length < PIN_LENGTH ? `${PIN_LENGTH - value.length} more digit${PIN_LENGTH - value.length !== 1 ? 's' : ''}` : 'PIN entered ✓'}
          </div>
        )}
        <input ref={inputRef} type="password" inputMode="numeric" value={value} onChange={handleChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          maxLength={PIN_LENGTH} autoComplete="off"
          style={{ position: 'absolute', opacity: 0, top: 0, left: 0, width: '100%', height: '100%', cursor: 'text', zIndex: 1 }} />
      </div>
    </div>
  )
}

export default function PinManager({ profileId }: Props) {
  const { lockProfile, profileHasPin: _ph } = useAppStore() as any
  const { lockProfile: lock } = useAppStore()
  const [hasPin, setHasPin] = useState(false)
  const [mode, setMode] = useState<Mode>('view')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const oldRef = useRef<HTMLInputElement>(null)
  const newRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  useEffect(() => { window.electronAPI.auth.hasPin(profileId).then((has: boolean) => setHasPin(has)) }, [profileId])
  useEffect(() => {
    if (mode === 'set') setTimeout(() => newRef.current?.focus(), 80)
    if (mode === 'change' || mode === 'remove') setTimeout(() => oldRef.current?.focus(), 80)
  }, [mode])

  const reset = () => { setOldPin(''); setNewPin(''); setConfirmPin(''); setMessage(null); setMode('view') }

  const doSet = async (np: string, cp: string) => {
    if (np.length < PIN_LENGTH) { setMessage({ text: `PIN must be ${PIN_LENGTH} digits`, type: 'error' }); return }
    if (np !== cp) { setMessage({ text: 'PINs do not match', type: 'error' }); return }
    const r = await window.electronAPI.auth.setPin(profileId, np)
    if (r.success) {
      setHasPin(true)
      setMessage({ text: 'PIN set — profile is now locked ✓', type: 'success' })
      // Fix #6: instantly lock the profile after PIN is set
      lock(profileId)
      setTimeout(reset, 1500)
    } else setMessage({ text: r.error || 'Failed', type: 'error' })
  }

  const doChange = async (op: string, np: string, cp: string) => {
    if (op.length < PIN_LENGTH) { setMessage({ text: 'Enter current PIN', type: 'error' }); return }
    if (np.length < PIN_LENGTH) { setMessage({ text: `New PIN must be ${PIN_LENGTH} digits`, type: 'error' }); return }
    if (np !== cp) { setMessage({ text: 'New PINs do not match', type: 'error' }); return }
    const r = await window.electronAPI.auth.changePin(profileId, op, np)
    if (r.success) {
      setMessage({ text: 'PIN changed — profile locked ✓', type: 'success' })
      // Fix #6: re-lock profile after PIN change
      lock(profileId)
      setTimeout(reset, 1500)
    } else setMessage({ text: r.error || 'Incorrect PIN', type: 'error' })
  }

  const doRemove = async (op: string) => {
    if (op.length < PIN_LENGTH) { setMessage({ text: 'Enter current PIN', type: 'error' }); return }
    const r = await window.electronAPI.auth.removePin(profileId, op)
    if (r.success) { setHasPin(false); setMessage({ text: 'PIN removed ✓', type: 'success' }); setTimeout(reset, 1200) }
    else setMessage({ text: r.error || 'Incorrect PIN', type: 'error' })
  }

  if (mode === 'view') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{hasPin ? '🔒' : '🔓'}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>PIN Lock {hasPin ? 'Enabled' : 'Disabled'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hasPin ? 'Profile is protected. Setting a new PIN will lock instantly.' : 'Anyone can access this profile'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!hasPin && <button className="btn btn-primary btn-sm" onClick={() => setMode('set')}>Set PIN</button>}
        {hasPin && <><button className="btn btn-secondary btn-sm" onClick={() => setMode('change')}>Change PIN</button><button className="btn btn-danger btn-sm" onClick={() => setMode('remove')}>Remove PIN</button></>}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        {mode === 'set' ? '🔒 Set PIN' : mode === 'change' ? '🔑 Change PIN' : '🔓 Remove PIN'}
      </div>
      {(mode === 'change' || mode === 'remove') && (
        <PinDots label="Current PIN" value={oldPin} onChange={setOldPin}
          onFilled={val => mode === 'remove' ? doRemove(val) : newRef.current?.focus()} inputRef={oldRef} />
      )}
      {(mode === 'set' || mode === 'change') && (
        <>
          <PinDots label="New PIN" value={newPin} onChange={setNewPin} onFilled={() => confirmRef.current?.focus()} inputRef={newRef} />
          <PinDots label="Confirm PIN" value={confirmPin}
            onChange={val => { setConfirmPin(val); if (message?.text.includes('match')) setMessage(null) }}
            onFilled={val => mode === 'set' ? doSet(newPin, val) : doChange(oldPin, newPin, val)} inputRef={confirmRef} />
        </>
      )}
      {message && (
        <div style={{ padding: '7px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 500, marginBottom: 10,
          background: message.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
          color: message.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {message.text}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={reset}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={() => {
          if (mode === 'set') doSet(newPin, confirmPin)
          else if (mode === 'change') doChange(oldPin, newPin, confirmPin)
          else doRemove(oldPin)
        }}>
          {mode === 'set' ? 'Set PIN' : mode === 'change' ? 'Change PIN' : 'Remove PIN'}
        </button>
      </div>
    </div>
  )
}
