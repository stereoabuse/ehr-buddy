/**
 * Parses a dollar-amount string (as typed in a fee input) into integer cents.
 * Empty/whitespace-only input is treated as zero. Returns null for anything
 * that isn't a valid non-negative number, so callers can distinguish "blank"
 * from "invalid" and surface an error only for the latter.
 */
export function parseFeeDollars(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return 0
  const dollars = Number(trimmed)
  if (!Number.isFinite(dollars) || dollars < 0) return null
  return Math.round(dollars * 100)
}
