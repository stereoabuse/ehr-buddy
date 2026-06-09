import type { useBlocker } from 'react-router-dom'
import { Btn } from './Btn'
import { Modal } from './Modal'

type Blocker = ReturnType<typeof useBlocker>

export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  if (blocker.state !== 'blocked') return null
  return (
    <Modal width={430} onClose={() => blocker.reset()} labelledBy="unsaved-title">
      <div className="px-6 py-5">
        <h3
          id="unsaved-title"
          className="m-0 text-lg font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)' }}
        >
          Discard unsaved changes?
        </h3>
        <p className="mt-2 mb-0 text-base leading-[1.6] text-body">
          Navigating away from this page will discard the work you have entered since the last
          save.
        </p>
      </div>
      <div
        className="flex justify-end gap-2.5 bg-canvas-2 px-6 py-3.5"
        style={{ borderTop: '0.5px solid var(--color-hairline)' }}
      >
        <Btn variant="secondary" onClick={() => blocker.reset()}>
          Stay on this page
        </Btn>
        <Btn variant="danger" onClick={() => blocker.proceed()}>
          Discard changes
        </Btn>
      </div>
    </Modal>
  )
}
