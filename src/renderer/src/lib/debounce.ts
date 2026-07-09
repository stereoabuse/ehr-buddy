/**
 * Debounces `fn`: each `call()` restarts the delay, so only the last call
 * within `delayMs` of silence actually invokes `fn`. `cancel()` clears any
 * pending invocation without firing it (used to stop a timer on unmount).
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): { call: (...args: Args) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    call(...args: Args) {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        fn(...args)
      }, delayMs)
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }
  }
}
