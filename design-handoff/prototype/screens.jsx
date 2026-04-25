// screens.jsx — All EHR Buddy screens (Calendar, Dashboard, ClientList, ClientChart, ProgressNote)

const { useState: uS, useMemo: uM, useEffect: uE } = React;

// Helper
const fmtMoney = (cents) => `$${(cents / 100).toFixed(2)}`;
const findClient = (id) => CLIENTS.find((c) => c.id === id);

// ──────────────────────────────────────────────────────────────
// CALENDAR — week view, SP-style
// ──────────────────────────────────────────────────────────────
function Calendar({ onOpenSession, density }) {
  const [view, setView] = uS('week'); // 'day' | 'week' | 'month'
  const D = DENSITY[density];

  // Sat Apr 25, 2026 — week is Sun Apr 19 → Sat Apr 25
  const days = [
    { idx: 0, name: 'Sun', date: 19 },
    { idx: 1, name: 'Mon', date: 20 },
    { idx: 2, name: 'Tue', date: 21 },
    { idx: 3, name: 'Wed', date: 22 },
    { idx: 4, name: 'Thu', date: 23 },
    { idx: 5, name: 'Fri', date: 24 },
    { idx: 6, name: 'Sat', date: 25, today: true },
  ];

  const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8 AM → 6 PM
  const SLOT_H = 56; // px per hour
  const totalH = HOURS.length * SLOT_H;

  const timeToY = (t) => {
    const [h, m] = t.split(':').map(Number);
    return (h - 8) * SLOT_H + (m / 60) * SLOT_H;
  };

  return (
    <div style={{ padding: 24, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="secondary" size="sm">Today</Btn>
        <button style={{ ...iconBtn, width: 28, height: 28 }}><Icon name="chevL" size={16} color={T.body} /></button>
        <button style={{ ...iconBtn, width: 28, height: 28 }}><Icon name="chevR" size={16} color={T.body} /></button>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600, color: T.ink }}>
          April 19 – 25, 2026
        </h2>
        <div style={{ flex: 1 }} />
        {/* View segmented control */}
        <div style={{
          display: 'flex', background: T.canvas2, borderRadius: 7, padding: 2,
          border: `0.5px solid ${T.hairline}`,
        }}>
          {['day', 'week', 'month'].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              height: 26, padding: '0 12px', border: 0,
              background: view === v ? '#fff' : 'transparent',
              color: view === v ? T.ink : T.muted,
              fontSize: 12, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
              fontFamily: 'inherit', textTransform: 'capitalize',
              boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{v}</button>
          ))}
        </div>
        <Btn icon="plus">New Appointment</Btn>
      </div>

      {/* Grid */}
      <Card padding={0} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Day headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)',
          borderBottom: `0.5px solid ${T.hairline}`, background: T.canvas2,
        }}>
          <div />
          {days.map((d) => (
            <div key={d.idx} style={{
              padding: '12px 10px', textAlign: 'center',
              borderLeft: `0.5px solid ${T.hairline}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{d.name}</div>
              <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: d.today ? T.primary : 'transparent',
                color: d.today ? '#fff' : T.ink,
                fontSize: 14, fontWeight: 600,
              }}>{d.date}</div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)',
            position: 'relative',
          }}>
            {/* Hour labels */}
            <div style={{ position: 'relative', height: totalH, borderRight: `0.5px solid ${T.hairline}` }}>
              {HOURS.map((h) => (
                <div key={h} style={{
                  position: 'absolute', top: (h - 8) * SLOT_H - 7, right: 8,
                  fontSize: 10.5, color: T.muted, fontWeight: 500,
                }}>{((h + 11) % 12) + 1} {h < 12 ? 'AM' : 'PM'}</div>
              ))}
            </div>
            {/* Day columns */}
            {days.map((d) => {
              const appts = WEEK_APPTS[d.idx] || [];
              return (
                <div key={d.idx} style={{
                  position: 'relative', height: totalH,
                  borderLeft: `0.5px solid ${T.hairline}`,
                  background: d.today ? 'rgba(47,122,111,0.025)' : 'transparent',
                }}>
                  {/* Hour lines */}
                  {HOURS.map((h, i) => (
                    <div key={h} style={{
                      position: 'absolute', top: i * SLOT_H, left: 0, right: 0,
                      borderTop: i === 0 ? 'none' : `0.5px solid ${T.divider}`,
                    }} />
                  ))}
                  {/* Now line on today */}
                  {d.today && (
                    <div style={{ position: 'absolute', top: timeToY('14:20'), left: 0, right: 0, zIndex: 5, pointerEvents: 'none' }}>
                      <div style={{ height: 1, background: T.danger }} />
                      <div style={{ position: 'absolute', left: -4, top: -4, width: 9, height: 9, borderRadius: '50%', background: T.danger }} />
                    </div>
                  )}
                  {/* Appointments */}
                  {appts.map((a) => {
                    const c = findClient(a.clientId);
                    const top = timeToY(a.start);
                    const height = timeToY(a.end) - top - 2;
                    return (
                      <div key={a.id} onClick={() => onOpenSession(a)} style={{
                        position: 'absolute', left: 4, right: 4, top, height,
                        background: '#fff',
                        borderLeft: `3px solid ${c.color}`,
                        borderRadius: 5,
                        padding: '5px 8px', fontSize: 11.5, color: T.ink,
                        cursor: 'pointer', overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(40,30,20,0.08), 0 0 0 0.5px rgba(0,0,0,0.06)',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.first} {c.last}
                        </div>
                        <div style={{ color: T.muted, fontSize: 10.5, marginTop: 1 }}>
                          {a.start}–{a.end}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────
function Dashboard({ onNav, onOpenSession }) {
  const unpaidTotal = CLIENTS.reduce((s, c) => s + c.balance, 0);
  const unpaidClients = CLIENTS.filter((c) => c.balance > 0);

  return (
    <div style={{ padding: 28, maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: 6, fontSize: 13, color: T.muted }}>Saturday, April 25, 2026</div>
      <h2 style={{ margin: '0 0 24px', fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: -0.5 }}>
        Good morning, Robin
      </h2>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: "Today's sessions", val: '5', sub: '4 confirmed · 1 tentative', tone: T.primary },
          { label: 'Active clients',   val: CLIENTS.filter((c) => c.status === 'Active').length, sub: '+2 this month', tone: T.ink },
          { label: 'Outstanding',      val: fmtMoney(unpaidTotal), sub: `${unpaidClients.length} clients`, tone: T.danger },
          { label: 'Unsigned notes',   val: '3', sub: 'Older than 24h', tone: T.warn },
        ].map((k) => (
          <Card key={k.label} padding={18}>
            <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k.label}</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 600, color: k.tone, letterSpacing: -0.5 }}>{k.val}</div>
            <div style={{ marginTop: 2, fontSize: 12, color: T.muted }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Today's schedule */}
        <Card padding={0}>
          <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600, color: T.ink }}>Today's schedule</h3>
            <div style={{ flex: 1 }} />
            <button onClick={() => onNav('calendar')} style={{ border: 0, background: 'transparent', color: T.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Open calendar <Icon name="chevR" size={12} />
            </button>
          </div>
          <div>
            {TODAY_APPTS.map((a, i) => {
              const c = findClient(a.clientId);
              const cpt = CPT_CODES.find((x) => x.code === a.cpt);
              return (
                <div key={a.id} onClick={() => onOpenSession(a)} style={{
                  padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  borderBottom: i < TODAY_APPTS.length - 1 ? `0.5px solid ${T.divider}` : 'none',
                  cursor: 'pointer',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.canvas2}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 60, fontSize: 12, color: T.body, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {a.start}
                    <div style={{ fontSize: 10.5, color: T.muted, fontWeight: 400 }}>{a.end}</div>
                  </div>
                  <div style={{ width: 3, alignSelf: 'stretch', background: c.color, borderRadius: 2 }} />
                  <Avatar initials={c.initials} color={c.color} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: T.ink }}>{c.first} {c.last}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{cpt?.desc} · {c.dx}</div>
                  </div>
                  {a.status === 'tentative' && <Pill tone="warn">Tentative</Pill>}
                  <Icon name="chevR" size={16} color={T.faint} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tasks */}
        <Card padding={0}>
          <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600, color: T.ink }}>To-do</h3>
            <div style={{ flex: 1 }} />
            <Pill tone="danger">{TASKS.filter(t => t.due === 'Overdue').length} overdue</Pill>
          </div>
          <div>
            {TASKS.map((t, i) => (
              <div key={t.id} style={{
                padding: '12px 20px', display: 'flex', alignItems: 'flex-start', gap: 12,
                borderBottom: i < TASKS.length - 1 ? `0.5px solid ${T.divider}` : 'none',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, marginTop: 2,
                  border: `1.5px solid ${T.hairline}`, flexShrink: 0, cursor: 'pointer',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.35 }}>{t.label}</div>
                  <div style={{ marginTop: 3 }}>
                    <Pill tone={t.due === 'Overdue' ? 'danger' : 'neutral'}>{t.due}</Pill>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Outstanding balances */}
      <div style={{ marginTop: 16 }}>
        <Card padding={0}>
          <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600, color: T.ink }}>Outstanding balances</h3>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600, color: T.danger, letterSpacing: -0.3 }}>{fmtMoney(unpaidTotal)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {unpaidClients.map((c, i) => (
              <div key={c.id} style={{
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
                borderRight: (i + 1) % 4 !== 0 ? `0.5px solid ${T.divider}` : 'none',
                borderTop: i >= 4 ? `0.5px solid ${T.divider}` : 'none',
              }}>
                <Avatar initials={c.initials} color={c.color} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.first} {c.last}</div>
                  <div style={{ fontSize: 12, color: T.danger, fontWeight: 600 }}>{fmtMoney(c.balance)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// CLIENT LIST
// ──────────────────────────────────────────────────────────────
function ClientList({ onOpenClient, density }) {
  const [search, setSearch] = uS('');
  const [filter, setFilter] = uS('All');
  const D = DENSITY[density];

  const filtered = CLIENTS.filter((c) => {
    if (filter === 'Active' && c.status !== 'Active') return false;
    if (filter === 'Inactive' && c.status !== 'Inactive') return false;
    if (filter === 'Has balance' && c.balance === 0) return false;
    if (search && !`${c.first} ${c.last}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: -0.4 }}>Clients</h2>
        <Pill tone="neutral">{filtered.length}</Pill>
        <div style={{ flex: 1 }} />
        <Btn variant="secondary" icon="download">Export CSV</Btn>
        <Btn icon="plus">Add Client</Btn>
      </div>

      <Card padding={0}>
        {/* Filters */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `0.5px solid ${T.hairline}` }}>
          <div style={{ flex: 1, maxWidth: 360, height: 34, borderRadius: 7, background: T.canvas2, border: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
            <Icon name="search" size={14} color={T.muted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontSize: 13, color: T.ink, fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', background: T.canvas2, borderRadius: 7, padding: 2, border: `0.5px solid ${T.hairline}` }}>
            {['All', 'Active', 'Inactive', 'Has balance'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                height: 26, padding: '0 12px', border: 0,
                background: filter === f ? '#fff' : 'transparent',
                color: filter === f ? T.ink : T.muted,
                fontSize: 12, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: filter === f ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: D.bodyFs }}>
          <thead>
            <tr style={{ background: T.canvas2 }}>
              {['Client', 'Diagnosis', 'Phone', 'Last session', 'Next session', 'Balance', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: D.cellPad, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `0.5px solid ${T.hairline}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} onClick={() => onOpenClient(c.id)} style={{ cursor: 'pointer', borderBottom: i < filtered.length - 1 ? `0.5px solid ${T.divider}` : 'none' }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.canvas2}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                <td style={{ padding: D.cellPad }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={c.initials} color={c.color} size={30} />
                    <div>
                      <div style={{ fontWeight: 600, color: T.ink }}>{c.last}, {c.first}</div>
                      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>DOB {c.dob}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: D.cellPad, color: T.body }}>{c.dx}</td>
                <td style={{ padding: D.cellPad, color: T.body, fontVariantNumeric: 'tabular-nums' }}>{c.phone}</td>
                <td style={{ padding: D.cellPad, color: T.body, fontVariantNumeric: 'tabular-nums' }}>{c.lastSession}</td>
                <td style={{ padding: D.cellPad, color: T.body, fontVariantNumeric: 'tabular-nums' }}>{c.nextSession}</td>
                <td style={{ padding: D.cellPad }}>
                  {c.balance > 0
                    ? <span style={{ color: T.danger, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(c.balance)}</span>
                    : <span style={{ color: T.faint }}>—</span>}
                </td>
                <td style={{ padding: D.cellPad }}>
                  <Pill tone={c.status === 'Active' ? 'success' : 'neutral'}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'Active' ? T.success : T.faint, display: 'inline-block', marginRight: 2 }} />
                    {c.status}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

Object.assign(window, { Calendar, Dashboard, ClientList });
