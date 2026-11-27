import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function TagPicker({
  tags,
  selected,
  onChange,
}: {
  tags: string[]
  selected: string[]
  onChange: (tags: string[]) => void
}) {
  const customTags = selected.filter((tag) => !tags.includes(tag))
  const all = [...new Set([...tags, ...customTags])]
  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag])
  }
  return (
    <div className="tag-picker">
      {all.map((tag) => (
        <button
          type="button"
          key={tag}
          className={`tag-chip ${selected.includes(tag) ? 'tag-chip-active' : ''}`}
          onClick={() => toggle(tag)}
        >
          {tag}
        </button>
      ))}
      <input
        className="tag-input"
        placeholder="输入新标签后回车"
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          const value = event.currentTarget.value.trim()
          if (value && !selected.includes(value)) onChange([...selected, value])
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return createPortal(
    <div className="aurora-panel aurora-portal">
      <div className="modal-backdrop" onMouseDown={onCancel}>
        <div className="modal confirm-modal" role="alertdialog" onMouseDown={(event) => event.stopPropagation()}>
          <h2>请确认</h2>
          <p>{message}</p>
          <div className="form-actions">
            <button className="button button-ghost" onClick={onCancel}>取消</button>
            <button className="button button-danger" onClick={onConfirm}>确认删除</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
