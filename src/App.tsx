import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useAppStore } from './store/appStore'
import { useProfileSettings } from './hooks/useProfileSettings'
import TitleBar from './components/layout/TitleBar'
import Sidebar from './components/layout/Sidebar'
import TaskList from './components/tasks/TaskList'
import TaskModal from './components/tasks/TaskModal'
import ProfileModal from './components/profiles/ProfileModal'
import PinLock from './components/auth/PinLock'
import AppSettings from './components/settings/AppSettings'
import AboutModal from './components/about/AboutModal'
import UpdateBanner from './components/about/UpdateBanner'
import { Profile } from './types'

declare global { interface Window { electronAPI: any } }

export default function App() {
  const {
    profiles, setProfiles, activeProfileId, setActiveProfileId,
    isTaskModalOpen, isProfileModalOpen, isSettingsOpen, isAboutOpen,
    unlockedProfiles, unlockProfile, lockProfile
  } = useAppStore()
  const { theme } = useProfileSettings()

  const [pinChecked, setPinChecked] = useState<Record<number, boolean>>({})
  const [profileHasPin, setProfileHasPin] = useState<Record<number, boolean>>({})
  const lastActivityRef = useRef(Date.now())

  // Theme now comes from the active profile (useProfileSettings), so this
  // effect re-runs both when the theme value itself changes AND whenever
  // the active profile changes — switching profiles correctly switches
  // the visible theme instead of leaving the previous profile's theme on
  // screen, which was the bug being fixed here.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Apply saved accent color on load
  useEffect(() => {
    const active = profiles.find(p => p.id === activeProfileId)
    if (active?.accent_color) {
      document.documentElement.style.setProperty('--accent', active.accent_color)
      document.documentElement.style.setProperty('--accent-subtle', active.accent_color + '22')
      document.documentElement.style.setProperty('--text-accent', active.accent_color)
    }
  }, [activeProfileId, profiles])

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const data = await window.electronAPI.profiles.getAll()
        const parsed: Profile[] = data.map((p: any) => ({ ...p, links: JSON.parse(p.links || '[]') }))
        setProfiles(parsed)
        // activeProfileId may have been restored from localStorage already
        // (see appStore.ts), but that restored value is provisional until
        // verified against what's actually in the database — the profile
        // could have been deleted in a previous session, or this could be
        // a fresh install with no stored value at all. Only fall back to
        // the first profile in the list if the restored ID doesn't match
        // anything real; otherwise leave the restored selection alone.
        const restoredProfileStillExists = activeProfileId && parsed.some(p => p.id === activeProfileId)
        if (parsed.length > 0 && !restoredProfileStillExists) setActiveProfileId(parsed[0].id)
      } catch(e) { console.error('Failed to load profiles', e) }
    }
    loadProfiles()
  }, [])

  useEffect(() => {
    if (!activeProfileId) return
    // Re-check whenever active profile changes - covers instant lock after PIN set
    
    const check = async () => {
      const has = await window.electronAPI.auth.hasPin(activeProfileId)
      setProfileHasPin(prev => ({ ...prev, [activeProfileId]: has }))
      if (!has) unlockProfile(activeProfileId)
      setPinChecked(prev => ({ ...prev, [activeProfileId]: true }))
    }
    check()
  }, [activeProfileId, unlockedProfiles.size])

  // Auto-lock: track activity and lock after idle
  const resetActivity = useCallback(() => { lastActivityRef.current = Date.now() }, [])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'mousemove', 'scroll']
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, resetActivity))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      profiles.forEach(profile => {
        if (!profile.auto_lock_minutes || profile.auto_lock_minutes <= 0) return
        if (!profileHasPin[profile.id]) return
        if (!unlockedProfiles.has(profile.id)) return
        const idleMs = Date.now() - lastActivityRef.current
        const limitMs = profile.auto_lock_minutes * 60 * 1000
        if (idleMs >= limitMs) lockProfile(profile.id)
      })
    }, 15000) // check every 15s
    return () => clearInterval(interval)
  }, [profiles, profileHasPin, unlockedProfiles])

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null
  const isChecked = activeProfileId ? pinChecked[activeProfileId] === true : false
  const hasPin = activeProfileId ? profileHasPin[activeProfileId] === true : false
  const isUnlocked = activeProfileId ? unlockedProfiles.has(activeProfileId) : false
  const showPin = isChecked && hasPin && !isUnlocked
  const showTasks = isChecked && (!hasPin || isUnlocked)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <TitleBar />
      <UpdateBanner />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!activeProfile ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-title">No Profile Selected</div>
              <div className="empty-state-desc">Create a profile to get started.</div>
            </div>
          ) : !isChecked ? (
            <div style={{ flex: 1, background: 'var(--bg-primary)' }} />
          ) : showPin ? (
            <PinLock profile={activeProfile} onUnlock={() => unlockProfile(activeProfile.id)} />
          ) : showTasks ? (
            <TaskList profile={activeProfile} />
          ) : null}
        </main>
      </div>

      {isTaskModalOpen && <TaskModal />}
      {isProfileModalOpen && <ProfileModal />}
      {isSettingsOpen && <AppSettings />}
      {isAboutOpen && <AboutModal />}
    </div>
  )
}
