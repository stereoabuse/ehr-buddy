interface AvatarProps {
  initials: string
  /** Hex color; if omitted, defaults to the prototype's neutral swatch. */
  color?: string
  size?: number
}

export function Avatar({ initials, color = '#9CA4B8', size = 32 }: AvatarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.38,
        boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.08)'
      }}
    >
      {initials}
    </div>
  )
}
