export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type Theme = 'dark' | 'light' | 'night' | 'summer'
export type ViewMode = 'list' | 'kanban' | 'calendar'
export type RecurRule = 'daily' | 'weekly' | 'monthly' | 'weekdays' | null
export type DateFormat = 'MMM d, yyyy' | 'yyyy-MM-dd' | 'dd/MM/yyyy' | 'MM/dd/yyyy'

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'MMM d, yyyy', label: 'Month D, Year', example: 'Jun 20, 2026' },
  { value: 'yyyy-MM-dd',  label: 'YYYY-MM-DD (ISO)', example: '2026-06-20' },
  { value: 'dd/MM/yyyy',  label: 'DD/MM/YYYY',        example: '20/06/2026' },
  { value: 'MM/dd/yyyy',  label: 'MM/DD/YYYY',        example: '06/20/2026' }
]

export interface Profile {
  id: number
  name: string
  avatar_path: string | null
  bio: string
  links: ProfileLink[]
  color: string
  accent_color: string
  auto_lock_minutes: number
  theme: Theme
  date_format: DateFormat
  created_at: number
  updated_at: number
  pin_hash?: string | null
}

export interface ProfileLink {
  id: string
  label: string
  url: string
}

export interface Subtask {
  id: number
  task_id: number
  title: string
  done: boolean
  sort_order: number
  created_at: number
}

export interface Task {
  id: number
  profile_id: number
  title: string
  notes: string
  notes_html: string
  priority: Priority
  status: TaskStatus
  deadline: number | null
  reminder_at: number | null
  sort_order: number
  tags: string[]
  project_id: number | null
  recur_rule: RecurRule
  recur_next: number | null
  subtasks: Subtask[]
  archived: number  // 0 = active, 1 = archived
  created_at: number
  updated_at: number
}

export interface Project {
  id: number
  profile_id: number
  name: string
  color: string
  collapsed: boolean
  sort_order: number
  created_at: number
}

export interface Attachment {
  id: number
  task_id: number
  original_name: string
  stored_path: string
  mime_type: string
  size: number
  created_at: number
}

export interface TaskFilters {
  priority: Priority | 'all'
  status: TaskStatus | 'all'
  search: string
  sortBy: 'sort_order' | 'deadline' | 'priority' | 'created_at'
  sortDir: 'asc' | 'desc'
  projectId: number | 'all' | 'none'
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; order: number }> = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', order: 4 },
  high:   { label: 'High',   color: '#f97316', bg: 'rgba(249,115,22,0.12)', order: 3 },
  medium: { label: 'Medium', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', order: 2 },
  low:    { label: 'Low',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  order: 1 }
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: string }> = {
  todo:        { label: 'To Do',       icon: '○' },
  in_progress: { label: 'In Progress', icon: '◑' },
  done:        { label: 'Done',        icon: '●' }
}

export const RECUR_OPTIONS: { value: RecurRule; label: string }[] = [
  { value: null,       label: 'No repeat' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekdays',label: 'Weekdays (Mon–Fri)' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]
