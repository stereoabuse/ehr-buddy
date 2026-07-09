import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not invoke fn before the delay elapses', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    d.call()
    vi.advanceTimersByTime(999)
    expect(fn).not.toHaveBeenCalled()
  })

  it('invokes fn once the delay elapses', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    d.call()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('restarts the delay on each call, coalescing rapid calls into one invocation', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    d.call()
    vi.advanceTimersByTime(600)
    d.call()
    vi.advanceTimersByTime(600)
    d.call()
    vi.advanceTimersByTime(999)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes the arguments from the most recent call to fn', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    d.call('first')
    d.call('second')
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('cancel() prevents a pending invocation from firing', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    d.call()
    d.cancel()
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel() is a no-op when nothing is pending', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    expect(() => d.cancel()).not.toThrow()
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('allows scheduling again after a previous invocation fired', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    d.call()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
    d.call()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('allows scheduling again after cancel()', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000)
    d.call()
    d.cancel()
    d.call()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
