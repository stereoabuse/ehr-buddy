<p align="center">
  <img src="resources/icon.png" alt="EHR Buddy" width="128" />
</p>

<h1 align="center">EHR Buddy</h1>

<p align="center">Minimal local EHR for solo mental health practice.<br/>No cloud, no accounts, no subscriptions — just a desktop app that stores everything on your machine.</p>

## What it does

- **Client roster** -- searchable, filterable list of clients with phone, primary diagnosis, last-seen date, unpaid balance, active status, and unsigned-note counts
- **Client records** -- full contact info, emergency contact, and insurance details on the per-client detail page
- **Diagnoses** -- ICD-10 autocomplete picker covering chapter F (mental, behavioral, neurodevelopmental) and chapter Z (factors influencing health status); refreshable from the NIH/NLM clinical-tables API
- **Progress notes** -- structured form covering observations (cognitive functioning, affect, mood, interpersonal, functional status), current functioning, content discussed, interventions, treatment plan, plan, risk factors, medications, and recommendation, with CPT code and fee. Unsigned legacy DAP / free-text notes are migrated into the structured form on open; signed legacy notes remain read-only in their original format
- **Sign off & lock notes** -- finalize a progress note; later changes are recorded as dated, append-only amendments
- **Per-client documents** -- upload PDFs or images (PDF, PNG, JPG, HEIC) tagged as consent, ROI, intake, or other; stored under the app's user-data folder
- **Clinician profile** -- your credentials, NPI, tax ID, and default fee schedule
- **Inline payment tracking** -- paid toggle on each client's Sessions tab, plus a per-client Billing tab showing unpaid balance and bulk "mark all paid"
- **Superbill PDFs** -- one-click generation for client reimbursement
- **Income summary (PDF)** -- date-ranged report with per-client totals, CPT breakdown, and grand totals
- **Session detail (CSV)** -- date-ranged export with one row per session (date, client, CPT, ICD-10, fee, paid) plus a totals row, suitable for Excel or an accountant
- **Activity log** -- append-only record of every read, edit, and export of patient data (HIPAA §164.312(b)), surfaced under Settings, exportable to CSV
- **One-click backup** -- copies the SQLite database to a location you choose (the documents folder is separate; back it up alongside)

There is no cloud sync, no user authentication, no payment processing, no insurance claim submission, and no third-party services of any kind. EHR Buddy never makes a network request. The app is designed for a single clinician on a single machine.

---

## For clinicians (installing and using the app)

Download the latest installer from the **Releases** page in the sidebar.

### Windows

1. Download **EHR Buddy Setup x.x.x.exe** from Releases.
2. Run the installer. Choose an install location or accept the default.
3. **SmartScreen warning:** Windows will show a "Windows protected your PC" dialog on first launch because the app is not code-signed. Click **"More info"**, then click **"Run anyway"**. This is normal for v1.
4. Launch EHR Buddy from your Start menu or desktop shortcut.

### macOS

1. Download **EHR Buddy-x.x.x.dmg** from Releases.
2. Open the DMG and drag EHR Buddy to your Applications folder.
3. **Gatekeeper warning:** macOS will block the app on first launch. Right-click (or Control-click) the app and choose **Open**, then click **Open** in the dialog.
4. Launch EHR Buddy from Applications.

### Where is my data?

The database is a single SQLite file:

| OS      | Path                                                    |
|---------|---------------------------------------------------------|
| Windows | `%APPDATA%\EHR Buddy\ehrbuddy.db`                      |
| macOS   | `~/Library/Application Support/ehr-buddy/ehrbuddy.db`   |

**Uninstalling the app does NOT delete this file.** Your patient data is preserved until you manually remove it. See [SECURITY.md](SECURITY.md) for guidance on handling PHI.

### Backups

Use the one-click backup button on the Dashboard. It copies the database file to a folder you select. Store backups on an encrypted drive. See [SECURITY.md](SECURITY.md) for details.

---

## For developers

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- On macOS: Xcode Command Line Tools (`xcode-select --install`)
- On Windows: Visual Studio Build Tools (for native module compilation)

### Setup

```bash
git clone <repo-url>
cd ehr_buddy
npm install
```

The `postinstall` script runs `electron-rebuild` to compile `better-sqlite3` for the local Electron version.

### Development

```bash
npm run dev
```

This starts `electron-vite` in dev mode with hot reload for the renderer process.

### Type checking

```bash
npm run typecheck
```

### Refreshing the ICD-10 code list

The bundled F/Z code list is generated from the CMS valid-codes file. To refresh it:

```bash
npm run icd10:refresh
```

### Building distributables

```bash
# macOS (produces .dmg)
npm run dist:mac

# Windows (produces .exe NSIS installer)
npm run dist:win
```

Output goes to the `dist/` directory. Cross-compilation is not supported -- build on the target OS.

### Project structure

```
src/
  main/            # Electron main process
    db/            # SQLite connection, migrations, repositories
    ipc/           # IPC handler registration
    pdf/           # Superbill and tax report PDF generation (pdfkit)
    reports/       # CSV export logic
    audit.ts       # Append-only audit log helper
    backup.ts      # Database backup
    index.ts       # Main process entry
  preload/         # Context bridge
  renderer/src/    # React UI
    components/    # Shared UI components (Sidebar, TopBar, Icd10Picker, PaidToggle, etc.)
    pages/         # Route pages (Dashboard, ClientList, ClientDetail, SessionEditor, Reports, Settings, Activity, ClinicianProfile)
    lib/           # Renderer-side utilities
    styles/        # Tailwind globals
  shared/          # Types shared between main and renderer
scripts/           # Dev/maintenance scripts (e.g. ICD-10 refresh)
```

### Stack

| Layer     | Technology                      |
|-----------|---------------------------------|
| Shell     | Electron 30                     |
| UI        | React 18 + React Router 6      |
| Styling   | Tailwind CSS 3                  |
| State     | TanStack Query 5                |
| Database  | better-sqlite3 (SQLite)         |
| PDF       | pdfkit                          |
| Validation| Zod                             |
| Build     | electron-vite + electron-builder|

---

## License

MIT
