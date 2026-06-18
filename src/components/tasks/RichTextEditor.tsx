import React, { useRef, useEffect, useState, useCallback } from 'react'

interface Props {
  value: string
  onChange: (plain: string, html: string) => void
  placeholder?: string
  minHeight?: number
}

type FormatState = {
  bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean
  unorderedList: boolean; orderedList: boolean
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 100 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)
  const [fmt, setFmt] = useState<FormatState>({ bold: false, italic: false, underline: false, strikethrough: false, unorderedList: false, orderedList: false })

  // Initialize content only once on mount — prevents reverse-typing bug
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || ''
      isInitialized.current = true
    }
  }, []) // empty deps — only run on mount

  const updateFormatState = useCallback(() => {
    setFmt({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
    })
  }, [])

  const exec = useCallback((cmd: string, val?: string) => {
    const editor = editorRef.current
    if (!editor) return

    // Restore focus without disturbing selection
    editor.focus()

    document.execCommand(cmd, false, val ?? undefined)

    // Update format state and propagate change
    updateFormatState()
    onChange(editor.innerText, editor.innerHTML)
  }, [onChange, updateFormatState])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      updateFormatState()
      onChange(editorRef.current.innerText, editorRef.current.innerHTML)
    }
  }, [onChange, updateFormatState])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    ') }
    if ((e.ctrlKey || e.metaKey)) {
      if (e.key === 'b') { e.preventDefault(); exec('bold') }
      if (e.key === 'i') { e.preventDefault(); exec('italic') }
      if (e.key === 'u') { e.preventDefault(); exec('underline') }
      if (e.shiftKey && e.key === 'S') { e.preventDefault(); exec('strikeThrough') }
    }
  }, [exec])

  const handleMouseUp = useCallback(() => {
    updateFormatState()
  }, [updateFormatState])

  const handleKeyUp = useCallback(() => {
    updateFormatState()
  }, [updateFormatState])

  // Toolbar button — uses onMouseDown with preventDefault to keep selection alive
  const ToolBtn = ({ cmd, label, val, active }: { cmd: string; label: string; val?: string; active?: boolean }) => (
    <button
      onMouseDown={e => {
        e.preventDefault() // critical: don't blur the editor or lose selection
        exec(cmd, val)
      }}
      title={label}
      style={{
        padding: '3px 9px', borderRadius: 4,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
        color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
        cursor: 'pointer', fontSize: 12, fontWeight: 600, lineHeight: 1.5,
        transition: 'all 0.12s'
      }}
    >{label}</button>
  )

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 3, padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', flexWrap: 'wrap', alignItems: 'center' }}>
        <ToolBtn cmd="bold"                  label="B"      active={fmt.bold} />
        <ToolBtn cmd="italic"                label="I"      active={fmt.italic} />
        <ToolBtn cmd="underline"             label="U"      active={fmt.underline} />
        <ToolBtn cmd="strikeThrough"         label="S̶"     active={fmt.strikethrough} />
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
        <ToolBtn cmd="insertUnorderedList"   label="• List" active={fmt.unorderedList} />
        <ToolBtn cmd="insertOrderedList"     label="1. List" active={fmt.orderedList} />
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
        <ToolBtn cmd="formatBlock"           label="H3"     val="h3" />
        <ToolBtn cmd="formatBlock"           label="¶"      val="p" />
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
        <ToolBtn cmd="removeFormat"          label="Clear"  />
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp}
        onKeyUp={handleKeyUp}
        onFocus={updateFormatState}
        data-placeholder={placeholder}
        style={{
          minHeight, padding: '10px 12px', outline: 'none',
          fontSize: 14, lineHeight: 1.7,
          color: 'var(--text-primary)', background: 'var(--bg-tertiary)',
          overflowY: 'auto', maxHeight: 220,
          userSelect: 'text', cursor: 'text'
        }}
      />
      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: var(--text-muted); pointer-events: none; display: block; }
        [contenteditable] ul { list-style: disc; padding-left: 20px; margin: 4px 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 20px; margin: 4px 0; }
        [contenteditable] h3 { font-size: 15px; font-weight: 700; margin: 6px 0 2px; }
        [contenteditable] p  { margin: 2px 0; }
        [contenteditable] b, [contenteditable] strong { font-weight: 700; }
        [contenteditable] i, [contenteditable] em     { font-style: italic; }
        [contenteditable] u  { text-decoration: underline; }
        [contenteditable] s, [contenteditable] strike { text-decoration: line-through; }
      `}</style>
    </div>
  )
}
