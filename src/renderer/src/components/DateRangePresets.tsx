import { DATE_RANGE_PRESETS, presetDateRange } from '@shared/date-ranges'

interface DateRangePresetsProps {
  onSelect: (startIso: string, endIso: string) => void
  className?: string
}

/** Quick-set chips for the five standard reporting date ranges. Clicking one
 * computes the range as of now and hands both ISO dates to the caller — the
 * manual date inputs next to it stay fully editable either way. */
export function DateRangePresets({ onSelect, className = '' }: DateRangePresetsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {DATE_RANGE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => {
            const range = presetDateRange(preset.id, new Date())
            onSelect(range.start, range.end)
          }}
          className="h-[26px] rounded-md bg-canvas-2 px-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-body"
          style={{ border: '0.5px solid var(--color-hairline)' }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
