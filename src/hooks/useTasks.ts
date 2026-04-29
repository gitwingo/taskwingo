import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { Task } from '../types'

export function useTasks() {
  const {
    tasks, upsertTask, removeTask, activeProfileId
  } = useAppStore()

  const profileTasks = tasks.filter(t => t.profile_id === activeProfileId)

  const createTask = useCallback(async (data: Partial<Task>) => {
    if (!activeProfileId) return null
    const result = await window.electronAPI.tasks.create({ ...data, profile_id: activeProfileId })
    if (result) {
      const parsed = { ...result, tags: JSON.parse(result.tags || '[]') }
      upsertTask(parsed)
      return parsed
    }
    return null
  }, [activeProfileId])

  const updateTask = useCallback(async (id: number, data: Partial<Task>) => {
    const result = await window.electronAPI.tasks.update(id, data)
    if (result) {
      const parsed = { ...result, tags: JSON.parse(result.tags || '[]') }
      upsertTask(parsed)
      return parsed
    }
    return null
  }, [])

  const deleteTask = useCallback(async (id: number) => {
    await window.electronAPI.tasks.delete(id)
    removeTask(id)
  }, [])

  return { tasks: profileTasks, createTask, updateTask, deleteTask }
}
