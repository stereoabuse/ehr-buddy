import Database from 'better-sqlite3'
import { app, dialog } from 'electron'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'fs'
import { join } from 'path'

const MARKER_FILE = 'legacy-migration.json'

// One-time data migration for Windows users who installed v0.2.0 or earlier.
// Pre-fix builds wrote to %APPDATA%\ehr-buddy\ (from package.json "name") or
// %APPDATA%\Electron\ (Electron default) instead of %APPDATA%\EHR Buddy\.
// On first launch of a fixed build we detect the legacy folder and copy the
// database + uploaded documents into the new userData path. Copy (not move)
// so a partial failure leaves the original untouched.
//
// The .db file is staged as ehrbuddy.db.migrating and renamed last, so the
// gate at the top only flips on full success. Any failure aborts startup
// with a dialog instead of falling through to getDb(), which would otherwise
// create an empty database and permanently shadow the legacy data.
//
// We also defend against a target DB that exists but only contains the
// schema (e.g. a prior launch ran getDb() at the new path before this
// migration shipped, or a previous failed migration left a placeholder).
// In that case we sideline the empty shell and proceed with the copy.
//
// A success marker (legacy-migration.json) is written after the rename and
// short-circuits all subsequent launches. This decouples "migration ran"
// from "migration found user records" — without it, a legacy DB that
// happens to be empty would re-trigger the sideline+copy on every launch
// because the freshly-copied DB still looks like an empty shell.
export function migrateLegacyWindowsUserData(): void {
  if (process.platform !== 'win32') return

  const newUserData = app.getPath('userData')
  const newDb = join(newUserData, 'ehrbuddy.db')
  const markerPath = join(newUserData, MARKER_FILE)

  if (existsSync(markerPath)) return
  if (existsSync(newDb) && !targetIsEmptyShell(newDb)) return

  const appData = process.env.APPDATA
  if (!appData) return

  const candidates = [join(appData, 'ehr-buddy'), join(appData, 'Electron')]
  const legacyDir = candidates.find((dir) => existsSync(join(dir, 'ehrbuddy.db')))
  if (!legacyDir) return

  console.log(`[migrate] copying legacy user data: ${legacyDir} -> ${newUserData}`)

  const stagingDb = join(newUserData, 'ehrbuddy.db.migrating')

  try {
    mkdirSync(newUserData, { recursive: true })

    // If the target holds an empty shell from a prior run, move it aside
    // (don't delete) so the user always has a recovery path. Sideline runs
    // before any copy so a failure mid-migration can't corrupt the backup.
    sidelineEmptyShellIfPresent(newUserData)

    // Copy SQLite sidecars first. If SHM/WAL exist alongside a .db when
    // SQLite opens it, any uncommitted WAL frames are recovered.
    for (const name of ['ehrbuddy.db-shm', 'ehrbuddy.db-wal']) {
      const src = join(legacyDir, name)
      if (existsSync(src)) copyFileSync(src, join(newUserData, name))
    }

    const legacyDocs = join(legacyDir, 'documents')
    if (existsSync(legacyDocs)) {
      copyDirRecursive(legacyDocs, join(newUserData, 'documents'))
    }

    // Stage the .db copy under a temp name, then rename last as the atomic
    // commit point for the gate at the top of this function.
    copyFileSync(join(legacyDir, 'ehrbuddy.db'), stagingDb)
    renameSync(stagingDb, newDb)

    // Write the success marker last. Failure here is non-fatal — the data
    // is in place — but log loudly because a missing marker can cause an
    // extra retry on the next launch if the copied DB happens to be empty.
    try {
      writeFileSync(
        markerPath,
        JSON.stringify(
          { completedAt: new Date().toISOString(), legacySource: legacyDir },
          null,
          2
        )
      )
    } catch (markerErr) {
      console.error('[migrate] migration succeeded but marker write failed:', markerErr)
    }

    console.log('[migrate] legacy user data copied successfully')
  } catch (err) {
    console.error('[migrate] failed to copy legacy user data:', err)

    // Best-effort cleanup of the staging file so the next launch retries
    // cleanly. Leave the partial WAL/SHM/documents in place; they get
    // overwritten on retry, and removing them risks deleting user content
    // if newUserData somehow held data we did not put there.
    try {
      if (existsSync(stagingDb)) rmSync(stagingDb, { force: true })
    } catch {
      // ignore
    }

    const message = err instanceof Error ? err.message : String(err)
    dialog.showErrorBox(
      'EHR Buddy could not migrate your data',
      `${message}\n\n` +
        `Your original data is unchanged at:\n${legacyDir}\n\n` +
        `EHR Buddy will now quit. Please contact support before reopening the app.`
    )
    app.quit()
    throw err
  }
}

// True if the target DB exists but holds no user records — i.e. only the
// schema, possibly created by a stray getDb() call before this migration
// ran. Conservative on error: any failure to inspect returns false so we
// never overwrite a DB we couldn't read.
function targetIsEmptyShell(dbPath: string): boolean {
  let db: Database.Database | null = null
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true })

    // Tables whose presence indicates meaningful user activity. clinician is
    // a singleton populated only when the user fills out their profile (NPI,
    // license, fees, etc.); it is not auto-inserted by migrations, so a row
    // there means real onboarding work that should not be overwritten.
    // audit_log is intentionally excluded because it gains a row on every
    // app start, including no-op launches.
    const userTables = ['clients', 'sessions', 'clinician']
    const placeholders = userTables.map(() => '?').join(',')
    const present = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`
      )
      .all(...userTables) as { name: string }[]
    const names = new Set(present.map((t) => t.name))

    // Pre-migration / corrupt schema: none of the user tables exist yet.
    if (names.size === 0) return true

    let total = 0
    for (const table of userTables) {
      if (!names.has(table)) continue
      total += (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c
    }
    return total === 0
  } catch (err) {
    console.error('[migrate] could not inspect target DB; preserving as-is:', err)
    return false
  } finally {
    db?.close()
  }
}

function sidelineEmptyShellIfPresent(newUserData: string): void {
  const shellFiles = ['ehrbuddy.db', 'ehrbuddy.db-shm', 'ehrbuddy.db-wal']
  const shellDocs = join(newUserData, 'documents')
  const hasAny =
    shellFiles.some((name) => existsSync(join(newUserData, name))) || existsSync(shellDocs)
  if (!hasAny) return

  const backup = join(newUserData, `pre-migration-backup-${Date.now()}`)
  mkdirSync(backup, { recursive: true })
  for (const name of shellFiles) {
    const src = join(newUserData, name)
    if (existsSync(src)) renameSync(src, join(backup, name))
  }
  if (existsSync(shellDocs)) renameSync(shellDocs, join(backup, 'documents'))
  console.log(`[migrate] sidelined pre-existing empty shell to ${backup}`)
}

function copyDirRecursive(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const sp = join(src, entry.name)
    const dp = join(dst, entry.name)
    if (entry.isDirectory()) copyDirRecursive(sp, dp)
    else if (entry.isFile()) copyFileSync(sp, dp)
  }
}
