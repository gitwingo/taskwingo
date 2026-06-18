import { create } from 'zustand'
import { Profile, Task, TaskFilters, Attachment, Project, ViewMode } from '../types'

interface AppState {
  profiles: Profile[]
  activeProfileId: number | null
  setProfiles: (profiles: Profile[]) => void
  setActiveProfileId: (id: number | null) => void
  upsertProfile: (profile: Profile) => void
  removeProfile: (id: number) => void

  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: number) => void

  projects: Project[]
  setProjects: (projects: Project[]) => void
  upsertProject: (project: Project) => void
  removeProject: (id: number) => void

  attachments: Record<number, Attachment[]>
  setAttachments: (taskId: number, attachments: Attachment[]) => void
  addAttachment: (attachment: Attachment) => void
  removeAttachment: (id: number, taskId: number) => void

  filters: TaskFilters
  setFilters: (filters: Partial<TaskFilters>) => void

  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  isTaskModalOpen: boolean
  setTaskModalOpen: (open: boolean) => void
  editingTaskId: number | null
  setEditingTaskId: (id: number | null) => void

  isProfileModalOpen: boolean
  setProfileModalOpen: (open: boolean) => void
  editingProfileId: number | null
  setEditingProfileId: (id: number | null) => void

  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  isAboutOpen: boolean
  setAboutOpen: (open: boolean) => void

  isProjectModalOpen: boolean
  setProjectModalOpen: (open: boolean) => void
  editingProjectId: number | null
  setEditingProjectId: (id: number | null) => void

  unlockedProfiles: Set<number>
  unlockProfile: (id: number) => void
  lockProfile: (id: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  profiles: [],
  // Restore the last-active profile ID from localStorage on launch, instead
  // of always starting at `null`. Previously, activeProfileId reset to
  // null on every app restart with no persistence at all, and App.tsx's
  // profile-loading effect would then default to `profiles[0]` (whichever
  // profile happens to be first in the loaded list) — meaning the app
  // always opened on profile #1 regardless of which profile was actually
  // in use last. The loaded value here is provisional: App.tsx still
  // verifies the restored ID actually exists among the profiles fetched
  // from the database before relying on it, in case that profile was
  // deleted since the last session.
  activeProfileId: (() => {
    const saved = localStorage.getItem('activeProfileId')
    return saved ? Number(saved) : null
  })(),
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfileId: (id) => {
    // Every profile switch flows through this single setter (sidebar
    // clicks, profile modal selection, etc.), so persisting here — rather
    // than at each call site — guarantees localStorage always reflects
    // the most recent switch without needing to remember to do it
    // elsewhere. Clearing to null (e.g. on profile deletion) removes the
    // stored value too, so a deleted profile is never restored as if it
    // still existed.
    if (id === null) localStorage.removeItem('activeProfileId')
    else localStorage.setItem('activeProfileId', String(id))
    set({ activeProfileId: id })
  },
  upsertProfile: (profile) => set((s) => ({
    profiles: s.profiles.find(p => p.id === profile.id)
      ? s.profiles.map(p => p.id === profile.id ? profile : p)
      : [...s.profiles, profile]
  })),
  removeProfile: (id) => set((s) => {
    const wasActive = s.activeProfileId === id
    if (wasActive) localStorage.removeItem('activeProfileId')
    return {
      profiles: s.profiles.filter(p => p.id !== id),
      activeProfileId: wasActive ? null : s.activeProfileId
    }
  }),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) => set((s) => ({
    tasks: s.tasks.find(t => t.id === task.id)
      ? s.tasks.map(t => t.id === task.id ? task : t)
      : [...s.tasks, task]
  })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),

  projects: [],
  setProjects: (projects) => set({ projects }),
  upsertProject: (project) => set((s) => ({
    projects: s.projects.find(p => p.id === project.id)
      ? s.projects.map(p => p.id === project.id ? project : p)
      : [...s.projects, project]
  })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter(p => p.id !== id) })),

  attachments: {},
  setAttachments: (taskId, attachments) => set((s) => ({ attachments: { ...s.attachments, [taskId]: attachments } })),
  addAttachment: (attachment) => set((s) => ({
    attachments: { ...s.attachments, [attachment.task_id]: [...(s.attachments[attachment.task_id] ?? []), attachment] }
  })),
  removeAttachment: (id, taskId) => set((s) => ({
    attachments: { ...s.attachments, [taskId]: (s.attachments[taskId] ?? []).filter(a => a.id !== id) }
  })),

  filters: { priority: 'all', status: 'all', search: '', sortBy: 'sort_order', sortDir: 'asc', projectId: 'all' },
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

  viewMode: (localStorage.getItem('viewMode') as ViewMode) ?? 'list',
  setViewMode: (mode) => { localStorage.setItem('viewMode', mode); set({ viewMode: mode }) },

  isTaskModalOpen: false,
  setTaskModalOpen: (open) => set({ isTaskModalOpen: open, editingTaskId: open ? undefined : null }),
  editingTaskId: null,
  setEditingTaskId: (id) => set({ editingTaskId: id, isTaskModalOpen: id !== null }),

  isProfileModalOpen: false,
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
  editingProfileId: null,
  setEditingProfileId: (id) => set({ editingProfileId: id, isProfileModalOpen: id !== null }),

  isSettingsOpen: false,
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  isAboutOpen: false,
  setAboutOpen: (open) => set({ isAboutOpen: open }),

  isProjectModalOpen: false,
  setProjectModalOpen: (open) => set({ isProjectModalOpen: open }),
  editingProjectId: null,
  setEditingProjectId: (id) => set({ editingProjectId: id, isProjectModalOpen: id !== null }),

  unlockedProfiles: new Set(),
  unlockProfile: (id) => set((s) => ({ unlockedProfiles: new Set([...s.unlockedProfiles, id]) })),
  lockProfile: (id) => set((s) => { const n = new Set(s.unlockedProfiles); n.delete(id); return { unlockedProfiles: n } })
}))
