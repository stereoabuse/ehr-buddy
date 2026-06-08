import { describe, it, expect } from 'vitest'
import { AVATAR_PALETTE, avatarColorFor } from './avatar'

// Reproduce the source's djb2 hash to derive expected indices independently.
function expectedColor(seed: string): string {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  }
  const idx = Math.abs(h) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]
}

describe('AVATAR_PALETTE', () => {
  it('contains exactly 10 swatches', () => {
    expect(AVATAR_PALETTE).toHaveLength(10)
  })

  it('contains only valid uppercase 6-digit hex colors', () => {
    for (const color of AVATAR_PALETTE) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('has no duplicate swatches', () => {
    const unique = new Set(AVATAR_PALETTE)
    expect(unique.size).toBe(AVATAR_PALETTE.length)
  })
})

describe('avatarColorFor', () => {
  it('returns a color that is a member of the palette', () => {
    expect(AVATAR_PALETTE).toContain(avatarColorFor('Alice'))
  })

  it('is deterministic: same seed always yields the same color', () => {
    const a = avatarColorFor('Jane Doe')
    const b = avatarColorFor('Jane Doe')
    expect(a).toBe(b)
  })

  it('is stable across many repeated calls for the same input', () => {
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(avatarColorFor('stable-seed-123'))
    }
    expect(results.size).toBe(1)
  })

  it('matches an independently computed djb2-based palette index', () => {
    for (const seed of ['Alice', 'Bob', 'Carol', 'patient-42', 'Dr. House MD']) {
      expect(avatarColorFor(seed)).toBe(expectedColor(seed))
    }
  })

  it('maps the empty string deterministically to palette index 1', () => {
    // djb2('') = 5381 -> Math.abs(5381) % 10 = 1
    expect(avatarColorFor('')).toBe(AVATAR_PALETTE[1])
    expect(avatarColorFor('')).toBe('#8693B0')
  })

  it('produces a stable result for a single-character seed', () => {
    expect(avatarColorFor('A')).toBe(expectedColor('A'))
    expect(AVATAR_PALETTE).toContain(avatarColorFor('A'))
  })

  it('distinguishes seeds that differ only by case', () => {
    expect(avatarColorFor('alice')).toBe(expectedColor('alice'))
    expect(avatarColorFor('Alice')).toBe(expectedColor('Alice'))
    // The two computed indices differ, so colors should differ.
    expect(avatarColorFor('alice')).not.toBe(avatarColorFor('Alice'))
  })

  it('handles unicode / multibyte seeds deterministically', () => {
    const seed = 'José 🦊 Núñez'
    expect(avatarColorFor(seed)).toBe(expectedColor(seed))
    expect(AVATAR_PALETTE).toContain(avatarColorFor(seed))
  })

  it('handles very long seeds without overflow issues', () => {
    const seed = 'x'.repeat(10000)
    const color = avatarColorFor(seed)
    expect(AVATAR_PALETTE).toContain(color)
    expect(color).toBe(expectedColor(seed))
  })

  it('handles whitespace-only seeds', () => {
    expect(avatarColorFor('   ')).toBe(expectedColor('   '))
    expect(AVATAR_PALETTE).toContain(avatarColorFor('   '))
  })

  it('distributes across multiple palette swatches for varied inputs', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      seen.add(avatarColorFor(`user-${i}`))
    }
    // With 200 distinct inputs over 10 buckets we expect broad coverage.
    expect(seen.size).toBeGreaterThan(5)
  })

  it('only ever returns values from the palette over a large input sweep', () => {
    const paletteSet = new Set<string>(AVATAR_PALETTE)
    for (let i = 0; i < 500; i++) {
      expect(paletteSet.has(avatarColorFor(`seed#${i}`))).toBe(true)
    }
  })
})
