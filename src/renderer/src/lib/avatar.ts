// 10-swatch desaturated cool palette from prototype/data.jsx — plays nicely with the canvas.
export const AVATAR_PALETTE = [
  '#9CA4B8',
  '#8693B0',
  '#A8A0B8',
  '#9BB0AB',
  '#B0A593',
  '#A8B0C0',
  '#B59FA8',
  '#909AAA',
  '#A2ADB8',
  '#9DA6A0'
] as const

// Stable hash → palette index. Same input always maps to same swatch.
function djb2(input: string): number {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function avatarColorFor(seed: string): string {
  return AVATAR_PALETTE[djb2(seed) % AVATAR_PALETTE.length]!
}
