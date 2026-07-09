// Tracks file paths this main process has written during the current
// session (superbill/note/tax PDFs, CSV exports, backups). The
// shell:show-item-in-folder IPC handler only reveals paths recorded here —
// since export paths are user-chosen via save dialogs, this is the guard
// against revealing an arbitrary filesystem path a compromised renderer
// might ask for.
const writtenPaths = new Set<string>()

export function recordSessionOutput(path: string): void {
  writtenPaths.add(path)
}

export function isSessionOutputPath(path: string): boolean {
  return writtenPaths.has(path)
}
