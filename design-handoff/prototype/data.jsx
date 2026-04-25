// Sample placeholder data for EHR Buddy redesign

const CLIENTS = [
  { id: 'c1', first: 'Jane', last: 'Doe', dob: '1989-04-12', phone: '(555) 201-3344', email: 'jane.doe@example.com', dx: 'F41.1 — GAD', status: 'Active', balance: 18000, lastSession: '2026-04-22', nextSession: '2026-04-25 10:00', initials: 'JD', color: '#9CA4B8' },
  { id: 'c2', first: 'John',  last: 'Smith', dob: '1978-11-30', phone: '(555) 444-8821', email: 'jsmith@example.com', dx: 'F32.1 — MDD, moderate', status: 'Active', balance: 0, lastSession: '2026-04-21', nextSession: '2026-04-25 11:00', initials: 'JS', color: '#8693B0' },
  { id: 'c3', first: 'Mary',  last: 'Johnson', dob: '1995-07-08', phone: '(555) 778-2210', email: 'maryj@example.com', dx: 'F43.10 — PTSD', status: 'Active', balance: 36000, lastSession: '2026-04-18', nextSession: '2026-04-25 13:00', initials: 'MJ', color: '#A8A4B8' },
  { id: 'c4', first: 'Robert', last: 'Williams', dob: '1982-02-14', phone: '(555) 332-9087', email: 'rwilliams@example.com', dx: 'F33.1 — Recurrent MDD', status: 'Active', balance: 0, lastSession: '2026-04-19', nextSession: '2026-04-25 14:00', initials: 'RW', color: '#9088A8' },
  { id: 'c5', first: 'Linda', last: 'Brown', dob: '1971-09-03', phone: '(555) 661-4520', email: 'linda.b@example.com', dx: 'F40.10 — Social anxiety', status: 'Active', balance: 9000, lastSession: '2026-04-15', nextSession: '2026-04-25 15:30', initials: 'LB', color: '#7E94B8' },
  { id: 'c6', first: 'Michael', last: 'Davis', dob: '1990-12-22', phone: '(555) 220-3344', email: 'mdavis@example.com', dx: 'F90.0 — ADHD, inattentive', status: 'Active', balance: 0, lastSession: '2026-04-12', nextSession: '2026-04-26 09:00', initials: 'MD', color: '#8AA0AC' },
  { id: 'c7', first: 'Sarah', last: 'Miller', dob: '1986-06-17', phone: '(555) 991-2030', email: 'sarah.m@example.com', dx: 'F43.22 — Adjustment, mixed', status: 'Active', balance: 18000, lastSession: '2026-04-09', nextSession: '—', initials: 'SM', color: '#A0AEC0' },
  { id: 'c8', first: 'David', last: 'Wilson', dob: '1965-01-25', phone: '(555) 100-7766', email: 'd.wilson@example.com', dx: 'F31.81 — Bipolar II', status: 'Inactive', balance: 0, lastSession: '2026-02-28', nextSession: '—', initials: 'DW', color: '#B0A8B8' },
  { id: 'c9', first: 'Emily', last: 'Anderson', dob: '2001-08-11', phone: '(555) 553-8819', email: 'emily.a@example.com', dx: 'F50.02 — Bulimia', status: 'Active', balance: 0, lastSession: '2026-04-23', nextSession: '2026-04-30 16:00', initials: 'EA', color: '#7C8FA8' },
  { id: 'c10', first: 'James', last: 'Taylor', dob: '1993-03-29', phone: '(555) 882-1100', email: 'j.taylor@example.com', dx: 'F41.0 — Panic disorder', status: 'Active', balance: 0, lastSession: '2026-04-20', nextSession: '2026-04-27 12:00', initials: 'JT', color: '#9CA8B8' },
];

// Today is Sat Apr 25 2026
const TODAY_APPTS = [
  { id: 's1', clientId: 'c1', start: '10:00', end: '10:50', cpt: '90834', status: 'confirmed' },
  { id: 's2', clientId: 'c2', start: '11:00', end: '11:50', cpt: '90834', status: 'confirmed' },
  { id: 's3', clientId: 'c3', start: '13:00', end: '13:50', cpt: '90837', status: 'confirmed' },
  { id: 's4', clientId: 'c4', start: '14:00', end: '14:50', cpt: '90834', status: 'confirmed' },
  { id: 's5', clientId: 'c5', start: '15:30', end: '16:20', cpt: '90834', status: 'tentative' },
];

// Week appointments keyed by day index (0=Sun .. 6=Sat). Today is Sat (6).
const WEEK_APPTS = {
  0: [], // Sun
  1: [ // Mon
    { id: 'w1', clientId: 'c6', start: '09:00', end: '09:50', cpt: '90834' },
    { id: 'w2', clientId: 'c2', start: '11:00', end: '11:50', cpt: '90834' },
    { id: 'w3', clientId: 'c4', start: '14:00', end: '14:50', cpt: '90834' },
  ],
  2: [ // Tue
    { id: 'w4', clientId: 'c1', start: '10:00', end: '10:50', cpt: '90834' },
    { id: 'w5', clientId: 'c10', start: '12:00', end: '12:50', cpt: '90834' },
    { id: 'w6', clientId: 'c5', start: '15:30', end: '16:20', cpt: '90834' },
    { id: 'w7', clientId: 'c9', start: '17:00', end: '17:50', cpt: '90834' },
  ],
  3: [ // Wed
    { id: 'w8', clientId: 'c3', start: '13:00', end: '13:50', cpt: '90837' },
    { id: 'w9', clientId: 'c2', start: '14:00', end: '14:50', cpt: '90834' },
  ],
  4: [ // Thu
    { id: 'w10', clientId: 'c1', start: '10:00', end: '10:50', cpt: '90834' },
    { id: 'w11', clientId: 'c4', start: '14:00', end: '14:50', cpt: '90834' },
    { id: 'w12', clientId: 'c7', start: '15:00', end: '15:50', cpt: '90834' },
  ],
  5: [ // Fri
    { id: 'w13', clientId: 'c6', start: '09:00', end: '09:50', cpt: '90834' },
    { id: 'w14', clientId: 'c3', start: '13:00', end: '13:50', cpt: '90837' },
  ],
  6: [ // Sat — TODAY
    { id: 's1', clientId: 'c1', start: '10:00', end: '10:50', cpt: '90834' },
    { id: 's2', clientId: 'c2', start: '11:00', end: '11:50', cpt: '90834' },
    { id: 's3', clientId: 'c3', start: '13:00', end: '13:50', cpt: '90837' },
    { id: 's4', clientId: 'c4', start: '14:00', end: '14:50', cpt: '90834' },
    { id: 's5', clientId: 'c5', start: '15:30', end: '16:20', cpt: '90834' },
  ],
};

const TASKS = [
  { id: 't1', kind: 'note', label: 'Progress note: Jane Doe — Apr 22', due: 'Overdue', clientId: 'c1' },
  { id: 't2', kind: 'note', label: 'Progress note: Mary Johnson — Apr 18', due: 'Overdue', clientId: 'c3' },
  { id: 't3', kind: 'note', label: 'Progress note: Linda Brown — Apr 15', due: 'Overdue', clientId: 'c5' },
  { id: 't4', kind: 'consent', label: 'Sign Informed Consent — Sarah Miller', due: 'This week', clientId: 'c7' },
  { id: 't5', kind: 'billing', label: 'Send superbill — Mary Johnson', due: 'This week', clientId: 'c3' },
];

const CPT_CODES = [
  { code: '90791', desc: 'Psychiatric diagnostic evaluation', mins: 60 },
  { code: '90832', desc: 'Psychotherapy, 30 min', mins: 30 },
  { code: '90834', desc: 'Psychotherapy, 45 min', mins: 45 },
  { code: '90837', desc: 'Psychotherapy, 60 min', mins: 60 },
  { code: '90846', desc: 'Family therapy without patient, 50 min', mins: 50 },
  { code: '90847', desc: 'Family therapy with patient, 50 min', mins: 50 },
  { code: '90853', desc: 'Group psychotherapy', mins: 60 },
];

// Pre-existing session w/ a substantial note for Jane Doe — opens in editor
const SAMPLE_NOTE = {
  id: 's1',
  clientId: 'c1',
  date: '2026-04-25',
  start: '10:00',
  end: '10:50',
  cpt: '90834',
  icd10: 'F41.1',
  feeCents: 18000,
  paid: 0,
  format: 'DAP',
  signed: false,
  body: `Data:
Client arrived on time, oriented x3, mood reported as "tense, kind of foggy." Affect congruent, restricted range. Reported continued difficulty falling asleep (avg ~45 min sleep latency, 4–5 nights/wk) and persistent worry about workplace performance review scheduled next week. Denied SI/HI. Reported using diaphragmatic breathing 2x this week with partial relief; missed homework log on 3 days.

Assessment:
Symptoms consistent with ongoing GAD, mild–moderate severity (GAD-7 = 11, down from 13 last session). Cognitive distortions today centered on catastrophizing ("if I get any feedback I'll be put on a PIP"). Therapeutic alliance strong; client engaged in cognitive restructuring exercise in-session. Sleep onset insomnia secondary to anxious rumination; sleep hygiene partially implemented.

Plan:
1. Continue weekly individual psychotherapy.
2. Assign thought record (3 entries) focused on workplace catastrophizing.
3. Review sleep hygiene checklist; add stimulus-control instructions (bed = sleep only).
4. Re-administer GAD-7 in 2 weeks.
5. Next session: Fri 5/2 at 10:00.`,
};

Object.assign(window, {
  CLIENTS, TODAY_APPTS, WEEK_APPTS, TASKS, CPT_CODES, SAMPLE_NOTE,
});
