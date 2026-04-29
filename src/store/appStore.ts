import { create } from 'zustand'
import { Profile, Task, Theme, TaskFilters, Attachment, Project, ViewMode } from '../types'

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

  theme: Theme
  setTheme: (theme: Theme) => void

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
  activeProfileId: null,
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfileId: (id) => set({ activeProfileId: id }),
  upsertProfile: (profile) => set((s) => ({
    profiles: s.profiles.find(p => p.id === profile.id)
      ? s.profiles.map(p => p.id === profile.id ? profile : p)
      : [...s.profiles, profile]
  })),
  removeProfile: (id) => set((s) => ({
    profiles: s.profiles.filter(p => p.id !== id),
    activeProfileId: s.activeProfileId === id ? null : s.activeProfileId
  })),

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

  theme: (localStorage.getItem('theme') as Theme) ?? 'dark',
  setTheme: (theme) => { localStorage.setItem('theme', theme); set({ theme }) },

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
