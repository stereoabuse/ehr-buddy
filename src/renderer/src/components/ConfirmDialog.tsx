import { Btn } from './Btn'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  return (
    <Modal width={430} onClose={onCancel} labelledBy="confirm-dialog-title">
      <div className="px-6 py-5">
        <h3
          id="confirm-dialog-title"
          className="m-0 text-lg font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)' }}
        >
          {title}
        </h3>
        <p className="mt-2 mb-0 text-base leading-[1.6] text-body">{message}</p>
      </div>
      <div
        className="flex justify-end gap-2.5 bg-canvas-2 px-6 py-3.5"
        style={{ borderTop: '0.5px solid var(--color-hairline)' }}
      >
        <Btn variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Btn>
      </div>
    </Modal>
  )
}
