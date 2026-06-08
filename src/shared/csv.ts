/**
 * CSV value escaping shared across every export path (reports, audit log,
 * full-archive backup).
 *
 * Beyond standard RFC-4180 quoting, this neutralizes spreadsheet *formula
 * injection*: a cell whose first character is `=`, `+`, `-`, `@`, TAB, or CR
 * is treated as a live formula by Excel/Sheets/LibreOffice. We defuse it by
 * prefixing a single quote so the value is rendered as literal text.
 */
export function csvEscape(value: unknown): string {
  let text = value == null ? '' : String(value)
  // Neutralize spreadsheet formula injection before quoting.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}
