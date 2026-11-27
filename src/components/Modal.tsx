import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

/**
 * Render into document.body rather than inside the panel.
 *
 * The panel is a scroll container; a `position: fixed` backdrop inside it is
 * still clipped by the panel's overflow in some containing-block situations, and
 * it inherits the panel's stacking context. Portalling keeps the dialog on top
 * of the whole window, like the host's own dialogs.
 *
 * The `.aurora-panel` class is carried onto the portal root so the theme
 * variables and every scoped selector keep applying outside the panel.
 */
export function Modal({ open, title, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="aurora-panel aurora-portal">
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div
          className={`modal ${wide ? 'modal-wide' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="icon-button" onClick={onClose} aria-label="关闭">
              ✕
            </button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
