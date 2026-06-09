import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import type { BlockerFunction } from 'react-router-dom'

/**
 * Blocks router navigation (and window close) while `isDirty` is true.
 * `bypass(fn)` runs fn with the guard suppressed, for programmatic
 * navigations that follow a successful save or delete.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty
  const bypassRef = useRef(false)

  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        dirtyRef.current &&
        !bypassRef.current &&
        currentLocation.pathname !== nextLocation.pathname,
      []
    )
  )

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current && !bypassRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const bypass = useCallback(<T,>(fn: () => T): T => {
    bypassRef.current = true
    try {
      return fn()
    } finally {
      // Refs (not state) so the suppression is visible to the blocker in the
      // same tick as the navigation; release after the router has processed it.
      setTimeout(() => {
        bypassRef.current = false
      }, 0)
    }
  }, [])

  return { blocker, bypass }
}
