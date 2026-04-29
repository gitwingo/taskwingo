import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { Profile } from '../types'

export function useProfiles() {
  const { profiles, upsertProfile, removeProfile } = useAppStore()

  const createProfile = useCallback(async (data: Partial<Profile>) => {
    const result = await window.electronAPI.profiles.create(data)
    if (result) {
      const parsed = { ...result, links: JSON.parse(result.links || '[]') }
      upsertProfile(parsed)
      return parsed
    }
    return null
  }, [])

  const updateProfile = useCallback(async (id: number, data: Partial<Profile>) => {
    const result = await window.electronAPI.profiles.update(id, data)
    if (result) {
      const parsed = { ...result, links: JSON.parse(result.links || '[]') }
      upsertProfile(parsed)
      return parsed
    }
    return null
  }, [])

  const deleteProfile = useCallback(async (id: number) => {
    await window.electronAPI.profiles.delete(id)
    removeProfile(id)
  }, [])

  return { profiles, createProfile, updateProfile, deleteProfile }
}
