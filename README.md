<p align="center">
  <img src="resources/icon.png" alt="EHR Buddy" width="128" />
</p>

<h1 align="center">EHR Buddy</h1>

<p align="center">Minimal local EHR for solo mental health practice. Client data never leaves your machine.</p> 

## What it does

- **Client roster & records** -- searchable list with diagnosis, last-seen, unpaid balance, and unsigned-note counts; per-client contact, emergency, and insurance details
- **Progress notes** -- structured form covering observations, content, interventions, treatment plan, risk, and medications, with CPT code and fee. Sign-off locks the note; later changes are recorded as dated, append-only amendments
- **Diagnoses** -- ICD-10 autocomplete
- **Per-client documents** -- upload PDFs or images (PDF, PNG, JPG, HEIC) tagged as consent, ROI, intake, or other
- **Clinician profile** -- credentials, NPI, tax ID, and default fee schedule
- **Billing** -- inline paid toggle on the Sessions tab and per-client Billing tab with unpaid balance and bulk "mark all paid"
- **Reports** -- superbill PDFs, date-ranged income summary PDF (per-client totals + CPT breakdown), and session-detail CSV
- **Audit log** -- append-only record of every read, edit, and export of patient data (HIPAA §164.312(b)), exportable to CSV
- **Backups** -- copy the SQLite database, or export a ZIP archive of database + documents + CSVs + manifest

No cloud sync, authentication, payments, claims, or third-party services so EHR Buddy never makes a network request.

---

## For clinicians (installing and using the app)

Download the latest installer from the **Releases** page in the sidebar.

### Windows

1. Download **EHR Buddy Setup x.x.x.exe** and run it.
2. **SmartScreen warning:** Windows will show "Windows protected your PC" because the app is not code-signed. Click **More info > Run anyway**.
3. Launch from the Start menu.

### macOS

1. Download the **.dmg**, open it, and drag EHR Buddy to Applications.
2. **Gatekeeper warning:** right-click the app, choose **Open**, then click **Open** in the dialog. (One-time only.)
3. Launch from Applications.

### Where is my data?

The database is a single SQLite file:

| OS      | Path                                                    |
|---------|---------------------------------------------------------|
| Windows | `%APPDATA%\EHR Buddy\ehrbuddy.db`                       |
| macOS   | `~/Library/Application Support/EHR Buddy/ehrbuddy.db`   |

**Uninstalling does NOT delete this file** -- patient data is preserved until you remove it manually. See [SECURITY.md](SECURITY.md) for PHI handling guidance.

### Backups

Use the backup tools under Settings. **Back up now** copies the database file. **Export full archive** creates a ZIP with the database, uploaded documents, CSV exports, and a manifest. Store backups on encrypted storage.

---

## For developers

### Prereqs

- Node.js 20+ and npm 9+
- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Windows: Visual Studio Build Tools (for native module compilation)

### Setup

```bash
git clone <repo-url>
cd ehr-buddy
npm install   # postinstall rebuilds better-sqlite3 for Electron
```

### Common scripts

```bash
npm run dev           # electron-vite dev with renderer hot reload
npm run typecheck     # tsc --noEmit
npm run icd10:refresh # regenerate the bundled F/Z ICD-10 list from CMS data
npm run dist:mac      # build .dmg (macOS only)
npm run dist:win      # build NSIS .exe (Windows only)
```

Distributables land in `dist/`. Cross-compilation is not supported -- build on the target OS. For tagged GitHub releases, see [RELEASING.md](RELEASING.md).

### Project structure

```
src/
  main/         # Electron main: db/, ipc/, pdf/, reports/, audit, backup, migration
  preload/      # Context bridge
  renderer/src/ # React UI: components/, pages/, lib/, styles/
  shared/       # Types shared between main and renderer
scripts/        # Dev/maintenance scripts
```

### Stack

| Layer     | Technology                       |
|-----------|----------------------------------|
| Shell     | Electron 30                      |
| UI        | React 18 + React Router 6        |
| Styling   | Tailwind CSS 3                   |
| State     | TanStack Query 5                 |
| Database  | better-sqlite3 (SQLite)          |
| PDF       | pdfkit                           |
| Validation| Zod                              |
| Build     | electron-vite + electron-builder |

---

## License

MIT
