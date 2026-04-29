import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximized: (cb: (val: boolean) => void) => {
      ipcRenderer.on('window:maximized', (_, val) => cb(val))
      return () => ipcRenderer.removeAllListeners('window:maximized')
    }
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.send('shell:open-external', url)
  },
  theme: {
    getSystem: () => ipcRenderer.invoke('theme:get-system')
  },
  dialog: {
    openFile: (options: any) => ipcRenderer.invoke('dialog:open-file', options),
    saveFile: (options: any) => ipcRenderer.invoke('dialog:save-file', options)
  },
  tasks: {
    getAll: (profileId: number) => ipcRenderer.invoke('tasks:get-all', profileId),
    create: (task: any) => ipcRenderer.invoke('tasks:create', task),
    update: (id: number, data: any) => ipcRenderer.invoke('tasks:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tasks:delete', id),
    reorder: (updates: { id: number; sort_order: number }[]) => ipcRenderer.invoke('tasks:reorder', updates)
  },
  subtasks: {
    create: (taskId: number, title: string) => ipcRenderer.invoke('subtasks:create', taskId, title),
    update: (id: number, data: any) => ipcRenderer.invoke('subtasks:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('subtasks:delete', id),
    reorder: (updates: { id: number; sort_order: number }[]) => ipcRenderer.invoke('subtasks:reorder', updates)
  },
  projects: {
    getAll: (profileId: number) => ipcRenderer.invoke('projects:get-all', profileId),
    create: (data: any) => ipcRenderer.invoke('projects:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('projects:delete', id)
  },
  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:get-all'),
    create: (profile: any) => ipcRenderer.invoke('profiles:create', profile),
    update: (id: number, data: any) => ipcRenderer.invoke('profiles:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('profiles:delete', id),
    setAvatar: (id: number, imagePath: string) => ipcRenderer.invoke('profiles:set-avatar', id, imagePath),
    reorder: (updates: { id: number; sort_order: number }[]) => ipcRenderer.invoke('profiles:reorder', updates)
  },
  files: {
    attach: (taskId: number, filePath: string) => ipcRenderer.invoke('files:attach', taskId, filePath),
    getForTask: (taskId: number) => ipcRenderer.invoke('files:get-for-task', taskId),
    delete: (id: number) => ipcRenderer.invoke('files:delete', id),
    open: (id: number) => ipcRenderer.invoke('files:open', id)
  },
  auth: {
    hasPin: (profileId: number) => ipcRenderer.invoke('auth:has-pin', profileId),
    setPin: (profileId: number, pin: string) => ipcRenderer.invoke('auth:set-pin', profileId, pin),
    verifyPin: (profileId: number, pin: string) => ipcRenderer.invoke('auth:verify-pin', profileId, pin),
    removePin: (profileId: number, pin: string) => ipcRenderer.invoke('auth:remove-pin', profileId, pin),
    changePin: (profileId: number, oldPin: string, newPin: string) => ipcRenderer.invoke('auth:change-pin', profileId, oldPin, newPin)
  },
  export: {
    toCSV: (profileId: number, savePath: string) => ipcRenderer.invoke('export:csv', profileId, savePath),
    toJSON: (profileId: number, savePath: string) => ipcRenderer.invoke('export:json', profileId, savePath),
    toPDF: (profileId: number, savePath: string) => ipcRenderer.invoke('export:pdf', profileId, savePath),
    toProfile: (profileId: number, savePath: string) => ipcRenderer.invoke('export:profile', profileId, savePath)
  },
  import: {
    fromJSON: (profileId: number, filePath: string) => ipcRenderer.invoke('import:json', profileId, filePath)
  },
  notify: {
    send: (title: string, body: string) => ipcRenderer.invoke('notify:send', title, body)
  }
})
