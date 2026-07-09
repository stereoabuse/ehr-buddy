import { describe, expect, it } from 'vitest'
import { isSessionOutputPath, recordSessionOutput } from './session-outputs'

describe('session-outputs', () => {
  it('rejects a path that was never recorded', () => {
    expect(isSessionOutputPath('/Users/someone/Documents/not-written-by-us.pdf')).toBe(false)
  })

  it('accepts a path after it is recorded', () => {
    const path = '/Users/someone/Documents/superbill-test.pdf'
    recordSessionOutput(path)
    expect(isSessionOutputPath(path)).toBe(true)
  })

  it('does not accept an unrelated path just because another was recorded', () => {
    recordSessionOutput('/Users/someone/Documents/report-a.csv')
    expect(isSessionOutputPath('/Users/someone/Documents/report-b.csv')).toBe(false)
  })
})
