import React, { useState } from 'react'
import { Profile } from '../../types'

interface Props {
  profile: Profile | { name: string; avatar_path?: string | null; avatar_cache_path?: string | null; color?: string }
  size?: number
}

export default function ProfileAvatar({ profile, size = 32 }: Props) {
  const [imgError, setImgError] = useState(false)

  const initials = profile.name
    .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)

  const color = (profile as Profile).color ?? '#6366f1'

  // Fix #3: prefer cached path (always available), fall back to original path
  const p = profile as any
  const imgSrc = p.avatar_cache_path || p.avatar_path

  if (imgSrc && !imgError) {
    return (
      <img
        src={`file://${imgSrc}`}
        alt={profile.name}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: '1.5px solid var(--border)'
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
      flexShrink: 0, letterSpacing: '-0.5px'
    }}>
      {initials}
    </div>
  )
}
