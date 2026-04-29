import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Profile } from '../../types'
import ProfileAvatar from '../profiles/ProfileAvatar'

interface Props {
  profile: Profile
  onUnlock: () => void
}

const PIN_LENGTH = 4

export default function PinLock({ profile, onUnlock }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  const verify = useCallback(async (code: string) => {
    if (verifying) return
    setVerifying(true)
    const result = await window.electronAPI.auth.verifyPin(profile.id, code)
    if (result.success) {
      onUnlock()
    } else {
      setError('Incorrect PIN')
      setShaking(true)
      setPin('')
      setTimeout(() => {
        setShaking(false)
        setVerifying(false)
        setError('')
        inputRef.current?.focus()
      }, 600)
    }
  }, [profile.id, onUnlock, verifying])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(val)
    setError('')
    if (val.length === PIN_LENGTH) setTimeout(() => verify(val), 0)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'var(--bg-primary)',
        padding: 32,
        cursor: 'default'
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <style>{`
        @keyframes pinShake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          35%      { transform: translateX(8px); }
          55%      { transform: translateX(-5px); }
          75%      { transform: translateX(5px); }
          90%      { transform: translateX(-2px); }
        }
        @keyframes dotPop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>

      <ProfileAvatar profile={profile} size={60} />

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 3 }}>{profile.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter PIN to unlock</div>
      </div>

      {/* 4 individual PIN boxes */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          animation: shaking ? 'pinShake 0.5s ease' : 'none'
        }}
        onClick={e => { e.stopPropagation(); inputRef.current?.focus() }}
      >
        {Array(PIN_LENGTH).fill('').map((_, i) => {
          const filled = i < pin.length
          const isActive = focused && i === pin.length // next slot to fill

          return (
            <div
              key={i}
              style={{
                width: 52,
                height: 56,
                borderRadius: 'var(--radius)',
                border: `2px solid ${
                  error   ? '#ef4444'        :
                  filled  ? 'var(--accent)'  :
                  isActive? 'var(--accent)'  :
                            'var(--border)'
                }`,
                background: filled
                  ? 'var(--accent-subtle)'
                  : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                boxShadow: isActive && !filled
                  ? '0 0 0 3px var(--accent-subtle)'
                  : 'none',
                cursor: 'text'
              }}
            >
              {filled ? (
                /* Filled: show solid dot */
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: error ? '#ef4444' : 'var(--accent)',
                  animation: 'dotPop 0.2s ease'
                }} />
              ) : isActive ? (
                /* Current active slot: blinking cursor bar */
                <div style={{
                  width: 2,
                  height: 20,
                  borderRadius: 2,
                  background: 'var(--accent)',
                  animation: 'cursorBlink 1s step-end infinite'
                }} />
              ) : (
                /* Empty unfocused: faint dot */
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--border)',
                  opacity: 0.5
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Status / error */}
      <div style={{ height: 20, display: 'flex', alignItems: 'center' }}>
        {error ? (
          <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
            Incorrect PIN — try again
          </div>
        ) : !focused ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Click to start typing
          </div>
        ) : null}
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={PIN_LENGTH}
        autoComplete="off"
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 1,
          height: 1
        }}
      />

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        🔒 This profile is PIN protected
      </div>
    </div>
  )
}
