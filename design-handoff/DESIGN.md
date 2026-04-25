# EHR Buddy — Visual Redesign Handoff

This folder is a brief for **Claude Code** (or any developer) executing the visual
redesign of EHR Buddy (Electron + React + Tailwind, repo `stereoabuse/ehr-buddy`).

The reference is `prototype/EHR Buddy.html` — open it in any browser to see the
target visuals. Screens are also captured as PNGs in `screenshots/`.

---

## 1. The brief in one paragraph

EHR Buddy gets a soft, soothing visual refresh in the spirit of SimplePractice's
information architecture but with a **muted dusty-blue / cool-oyster palette**
(no aggressive teal or green). Same screens, same data flow, same IPC, same
SQLite — just new tokens, new component styles, and a slight reordering of the
sidebar (Dashboard first, Calendar demoted). The existing pages remain; we are
**not refactoring routes or business logic**.

---

## 2. What to read first (in order)

1. This file.
2. `prototype/EHR Buddy.html` — open in a browser. Toggle the **Tweaks** panel
   (bottom-right) to see sidebar/density/type variations.
3. `screenshots/01-dashboard.png` … `05-progress-note.png` — for grepping pixel
   details when the prototype isn't running.
4. `tokens.css` and `tailwind.tokens.js` — the actual values to land in the repo.

---

## 3. Migration order (one screen at a time, show diffs)

**Phase 0 — Tokens (do this first, alone, commit before anything else):**

1. Replace `tailwind.config.js` `theme.extend` with values from
   `design-handoff/tailwind.tokens.js`. Existing class names that don't map
   (e.g. `bg-emerald-500`) should be flagged, not auto-converted.
2. Add the `:root` block from `design-handoff/tokens.css` to the top of
   `src/renderer/src/styles/globals.css`.
3. Confirm app still runs (`npm run dev`) — visuals will look broken; that is
   expected. Commit with message: `chore(design): land color/type tokens`.

**Phase 1 — Shell (sidebar + topbar):**

The prototype's sidebar is in `prototype/shell.jsx`. Recreate as
`src/renderer/src/components/Sidebar.tsx` and `TopBar.tsx`. Match:

- Dark soft-slate (`#2A2F3D`) sidebar with the EB monogram + "Solo practice"
- A primary "Create" button at the top of the nav (opens a new session for now;
  later: a menu of "New session / New client / New note")
- Nav order: **Dashboard, Clients, Calendar, Billing, Reports, Documents,
  Activity, Settings** — Calendar is intentionally below Clients
- User card pinned to bottom of sidebar (Dr. Robin Hale, LCSW · NPI ...)
- Topbar shows breadcrumbs + a global search field (`⌘K`) + help/notifications
- Width: 240px wide / 64px icon-only. Wire to a `sidebarLayout` setting later;
  hard-code "wide" for now.

**Phase 2 — Dashboard** (`src/renderer/src/pages/Dashboard.tsx`):

Match `screenshots/01-dashboard.png`. Order:

1. Greeting (`Good morning, {firstName}` + dated subhead)
2. KPI strip — 4 cards: Today's sessions, Active clients, Outstanding, Unsigned notes
3. Two-column row: Today's schedule (left, 1.4fr) + To-do (right, 1fr)
4. Outstanding balances strip (4 columns)

Pull data from existing repos — don't add new IPC. The KPI numbers all derive
from queries you already have (`sessions`, `clients`, `documents` tables).

**Phase 3 — Clients list** (`src/renderer/src/pages/ClientList.tsx`):

Match `screenshots/02-clients.png`. Search + filter chips + table. Avatar uses
hashed initials → one of ~10 muted swatches (see `prototype/data.jsx`). Row click
opens chart.

**Phase 4 — Client chart** (`src/renderer/src/pages/ClientDetail.tsx`):

Match `screenshots/04-client-chart.png`. Header card with avatar + key facts +
"New Session". Tabs: **Overview / Sessions / Billing / Documents / Measures**.

**Phase 5 — Progress Note editor** (`src/renderer/src/pages/SessionEditor.tsx`)
— *the polish target*:

Match `screenshots/05-progress-note.png`. Two columns: main note (DAP/SOAP/Free
text format toggle) on the left, sticky session details + diagnoses + client
mini-card on the right. Header has Close / Save Draft / **Sign & Lock**. After
sign, render append-only Amendments section beneath the locked note (existing
DB schema already supports this — see `004_notes_billing_consents.sql`).

**Phase 6 — everything else** (Calendar, Reports, Activity, Clinician Profile,
Settings): match the visual language but no need to redesign IA. Direct port.

---

## 4. Component inventory

The prototype defines these reusable components — port them to `components/`:

| Component  | File in prototype  | Notes |
|------------|-------------------|-------|
| `WindowFrame` | shell.jsx | Skip — only for prototype demo |
| `Sidebar` | shell.jsx | Phase 1 |
| `TopBar` | shell.jsx | Phase 1 |
| `Btn` | shell.jsx | Variants: primary, secondary, ghost, danger; sizes sm/md/lg; **must have `whiteSpace: nowrap`** |
| `Avatar` | shell.jsx | Hash name → palette index |
| `Pill` | shell.jsx | Tones: neutral, primary, success, warn, danger, accent |
| `Card` | shell.jsx | Surface + hairline border + subtle shadow |
| `Icon` | shell.jsx | Inline SVGs by name; copy as-is or replace with lucide-react |
| `TweaksPanel` + tweaks | tweaks-panel.jsx | **Skip** — prototype-only |

**Replace inline-style approach with Tailwind utilities** when porting. The
prototype uses inline styles for portability; your repo is Tailwind.

---

## 5. Data-driven choices the prototype encodes

- **Avatar color** is a per-client field in the DB (or hashed at render time).
  Use the 10-swatch palette in `prototype/data.jsx` (`#9CA4B8`, `#8693B0`, etc.)
  — they're all desaturated cool tones that play nicely with the canvas.
- **Density** (compact / comfy / cozy) lives in user settings. Compact is the
  prototype default per user preference.
- **Sidebar layout** (wide / icon / hidden) lives in user settings. Default wide.

---

## 6. Things NOT to change

- IPC channels and shapes (`src/shared/ipc-channels.ts`, `api-types.ts`)
- DB schema (any existing migration)
- `audit.ts` append-only logic
- The "no network requests, ever" guarantee — do not add a CDN font; system
  fonts only (the token file uses `-apple-system`)
- Sign & Lock + Amendments business logic — visual only
- Backup, PDF, CSV export pipelines

---

## 7. Suggested first prompt for Claude Code

```
Read design-handoff/DESIGN.md first. We're doing a visual-only redesign of
this Electron app. Open prototype/EHR Buddy.html for reference. Do Phase 0
only: land tokens.css and tailwind.tokens.js into globals.css and
tailwind.config.js. Show me a diff. Do not touch any pages yet.
```

Then iterate one phase per prompt, requesting diffs each time.

---

## 8. Files in this handoff

```
design-handoff/
├── DESIGN.md               ← this file
├── tokens.css              ← CSS custom properties
├── tailwind.tokens.js      ← Tailwind theme.extend
├── prototype/
│   ├── EHR Buddy.html      ← open in any browser
│   ├── shell.jsx
│   ├── screens.jsx
│   ├── chart.jsx
│   ├── note.jsx
│   ├── data.jsx
│   └── tweaks-panel.jsx
└── screenshots/
    ├── 01-dashboard.png
    ├── 02-clients.png
    ├── 03-calendar.png
    ├── 04-client-chart.png
    └── 05-progress-note.png
```
