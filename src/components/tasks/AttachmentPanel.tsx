import React, { useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Attachment } from '../../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼'
  if (mime === 'application/pdf') return '📄'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.startsWith('audio/')) return '🎵'
  if (mime.includes('word')) return '📝'
  if (mime.includes('sheet')) return '📊'
  return '📎'
}

const ALL_EXTENSIONS = ['jpg','jpeg','png','gif','webp','bmp','pdf','mp4','mov','avi','mkv','webm','mp3','wav','ogg','flac','aac','m4a','docx','doc','xlsx','txt']

export default function AttachmentPanel({ taskId }: { taskId: number }) {
  const { attachments, setAttachments, addAttachment, removeAttachment } = useAppStore()
  const taskAttachments = attachments[taskId] ?? []
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    window.electronAPI.files.getForTask(taskId).then((data: Attachment[]) => setAttachments(taskId, data))
  }, [taskId])

  // Fix #1: attach multiple files sequentially, showing progress
  const attachFiles = async (paths: string[]) => {
    if (!paths.length) return
    setLoading(true)
    setProgress({ done: 0, total: paths.length })
    for (let i = 0; i < paths.length; i++) {
      const attachment = await window.electronAPI.files.attach(taskId, paths[i])
      if (attachment) addAttachment(attachment as Attachment)
      setProgress({ done: i + 1, total: paths.length })
    }
    setLoading(false)
    setProgress(null)
  }

  const pickFiles = async () => {
    const result = await window.electronAPI.dialog.openFile({
      title: 'Attach Files',
      // Fix #1: multiSelections enabled
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Supported', extensions: ALL_EXTENSIONS },
        { name: 'Images', extensions: ['jpg','jpeg','png','gif','webp','bmp'] },
        { name: 'Documents', extensions: ['pdf','docx','doc','xlsx','txt'] },
        { name: 'Videos', extensions: ['mp4','mov','avi','mkv','webm'] },
        { name: 'Audio', extensions: ['mp3','wav','ogg','flac','aac','m4a'] }
      ]
    })
    if (!result.canceled && result.filePaths?.length) {
      await attachFiles(result.filePaths)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    // Fix #1: handle multiple dropped files
    const paths: string[] = []
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const path = (e.dataTransfer.files[i] as any).path
      if (path) paths.push(path)
    }
    if (paths.length) await attachFiles(paths)
  }

  const handleDelete = async (a: Attachment) => {
    await window.electronAPI.files.delete(a.id)
    removeAttachment(a.id, taskId)
  }

  const loadingLabel = progress && progress.total > 1
    ? `⏳ Attaching ${progress.done}/${progress.total}…`
    : loading ? '⏳ Attaching…' : null

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        Attachments ({taskAttachments.length})
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={pickFiles}
        style={{
          border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '14px 12px', textAlign: 'center',
          cursor: 'pointer', background: dragOver ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
          transition: 'all 0.15s', marginBottom: taskAttachments.length > 0 ? 8 : 0,
          fontSize: 12, color: dragOver ? 'var(--text-accent)' : 'var(--text-muted)'
        }}
      >
        {loadingLabel ?? (
          dragOver
            ? '📎 Drop to attach'
            : '📎 Click to select or drop files here — multiple files supported'
        )}
      </div>

      {/* Attachment list */}
      {taskAttachments.map(a => (
        <div key={a.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
          background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)',
          marginBottom: 4, border: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontSize: 16 }}>{fileIcon(a.mime_type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
              {a.original_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(a.size)}</div>
          </div>
          <button onClick={() => window.electronAPI.files.open(a.id)} title="Open"
            style={{ fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>↗</button>
          <button onClick={() => handleDelete(a)} title="Remove"
            style={{ fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', color: '#ef4444', padding: '2px 6px', borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>✕</button>
        </div>
      ))}
    </div>
  )
}
