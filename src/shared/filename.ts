/**
 * Make free text (e.g. a client's last name) safe to embed in a default
 * export filename on Windows and macOS: path separators, reserved
 * characters, and control characters become '-', whitespace collapses, and
 * the result is length-capped. Never returns an empty string.
 */
export function safeFilenamePart(input: string, maxLength = 60): string {
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s-]+|[.\s]+$/g, '')
    .slice(0, maxLength)
    .trim()
  return cleaned || 'client'
}
