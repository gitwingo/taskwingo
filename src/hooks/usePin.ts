import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function usePin(profileId: number) {
  const { unlockedProfiles, unlockProfile, lockProfile } = useAppStore()

  const isUnlocked = unlockedProfiles.has(profileId)

  const verify = useCallback(async (pin: string) => {
    const result = await window.electronAPI.auth.verifyPin(profileId, pin)
    if (result.success) unlockProfile(profileId)
    return result.success
  }, [profileId])

  const lock = useCallback(() => lockProfile(profileId), [profileId])

  return { isUnlocked, verify, lock }
}
