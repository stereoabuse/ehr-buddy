// chart.jsx — Client chart (Overview / Sessions / Billing / Documents tabs)

const { useState: cuS } = React;

function ClientChart({ clientId, onOpenSession, onBack, density }) {
  const c = CLIENTS.find((x) => x.id === clientId);
  const [tab, setTab] = cuS('overview');
  const D = DENSITY[density];

  // Synthetic session history for this client
  const sessions = [
    { id: 'h1', date: '2026-04-22', start: '10:00', end: '10:50', cpt: '90834', fee: 18000, paid: 0, signed: true,  noted: true },
    { id: 'h2', date: '2026-04-15', start: '10:00', end: '10:50', cpt: '90834', fee: 18000, paid: 1, signed: true,  noted: true },
    { id: 'h3', date: '2026-04-08', start: '10:00', end: '10:50', cpt: '90834', fee: 18000, paid: 1, signed: true,  noted: true },
    { id: 'h4', date: '2026-04-01', start: '10:00', end: '10:50', cpt: '90834', fee: 18000, paid: 1, signed: true,  noted: true },
    { id: 'h5', date: '2026-03-25', start: '10:00', end: '10:50', cpt: '90834', fee: 18000, paid: 1, signed: true,  noted: true },
    { id: 'h6', date: '2026-03-18', start: '10:00', end: '10:50', cpt: '90834', fee: 18000, paid: 1, signed: true,  noted: true },
  ];

  const documents = [
    { id: 'd1', type: 'consent', label: 'Informed Consent (signed 2026-01-08)', file: 'consent_jane_doe.pdf', size: '184 KB', uploaded: '2026-01-08' },
    { id: 'd2', type: 'intake',  label: 'Intake Questionnaire',                file: 'intake_jane_doe.pdf',  size: '97 KB',  uploaded: '2026-01-08' },
    { id: 'd3', type: 'roi',     label: 'ROI — Dr. Patel (PCP)',               file: 'roi_patel.pdf',         size: '112 KB', uploaded: '2026-02-14' },
  ];

  const totalFees = sessions.reduce((s, x) => s + x.fee, 0);
  const totalPaid = sessions.filter((x) => x.paid === 1).reduce((s, x) => s + x.fee, 0);
  const balance = totalFees - totalPaid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Client header */}
      <div style={{
        padding: '20px 28px', background: T.surface,
        borderBottom: `0.5px solid ${T.hairline}`,
      }}>
        <button onClick={onBack} style={{ border: 0, background: 'transparent', color: T.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: 8 }}>
          <Icon name="chevL" size={12} /> All clients
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar initials={c.initials} color={c.color} size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: -0.4 }}>
                {c.first} {c.last}
              </h2>
              <Pill tone={c.status === 'Active' ? 'success' : 'neutral'}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'Active' ? T.success : T.faint, display: 'inline-block', marginRight: 2 }} />
                {c.status}
              </Pill>
              {c.balance > 0 && <Pill tone="danger">Balance {fmtMoney(c.balance)}</Pill>}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 18, fontSize: 13, color: T.muted }}>
              <span>DOB {c.dob}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="phone" size={13} />{c.phone}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="mail" size={13} />{c.email}</span>
              <span>{c.dx}</span>
            </div>
          </div>
          <Btn variant="secondary" icon="edit">Edit</Btn>
          <Btn icon="plus" onClick={() => onOpenSession({ clientId: c.id, isNew: true })}>New Session</Btn>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 18, marginBottom: -20 }}>
          {[
            { id: 'overview',  label: 'Overview' },
            { id: 'sessions',  label: 'Sessions', count: sessions.length },
            { id: 'billing',   label: 'Billing' },
            { id: 'documents', label: 'Documents', count: documents.length },
            { id: 'measures',  label: 'Measures' },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '10px 14px 12px', border: 0, background: 'transparent',
                color: active ? T.ink : T.muted, fontSize: 13, fontWeight: 600,
                borderBottom: `2px solid ${active ? T.primary : 'transparent'}`,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginBottom: -1,
              }}>
                {t.label}
                {t.count != null && (
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 500, background: T.canvas2, padding: '1px 7px', borderRadius: 999, border: `0.5px solid ${T.hairline}` }}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {tab === 'overview' && (
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <h4 style={{ margin: '0 0 14px', fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contact</h4>
              <Field label="Phone" value={c.phone} />
              <Field label="Email" value={c.email} />
              <Field label="Address" value="124 Maple St, Brookline, MA 02446" />
            </Card>
            <Card>
              <h4 style={{ margin: '0 0 14px', fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Clinical</h4>
              <Field label="Diagnosis" value={c.dx} />
              <Field label="Started care" value="January 8, 2026" />
              <Field label="Cadence" value="Weekly · Fridays 10:00 AM" />
            </Card>
            <Card>
              <h4 style={{ margin: '0 0 14px', fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Insurance</h4>
              <Field label="Carrier" value="Self-pay" />
              <Field label="Default rate" value="$180.00 / 45-min session" />
            </Card>
            <Card>
              <h4 style={{ margin: '0 0 14px', fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Emergency contact</h4>
              <Field label="Name" value="Margaret Doe (mother)" />
              <Field label="Phone" value="(555) 201-9911" />
            </Card>
          </div>
        )}

        {tab === 'sessions' && (
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Card padding={0}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', borderBottom: `0.5px solid ${T.hairline}` }}>
                <div style={{ fontSize: 12, color: T.muted }}>
                  {sessions.length} sessions · Fees {fmtMoney(totalFees)} · Paid {fmtMoney(totalPaid)} · <strong style={{ color: balance > 0 ? T.danger : T.success }}>Balance {fmtMoney(balance)}</strong>
                </div>
                <div style={{ flex: 1 }} />
                <Btn size="sm" icon="plus" onClick={() => onOpenSession({ clientId: c.id, isNew: true })}>New Session</Btn>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: D.bodyFs }}>
                <thead>
                  <tr style={{ background: T.canvas2 }}>
                    {['Date', 'Time', 'CPT', 'Fee', 'Paid', 'Signed', 'Note'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: D.cellPad, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `0.5px solid ${T.hairline}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => {
                    const cpt = CPT_CODES.find((x) => x.code === s.cpt);
                    const isFirst = i === 0;
                    return (
                      <tr key={s.id} onClick={() => onOpenSession({ clientId: c.id, sessionId: s.id, useSample: isFirst })} style={{ cursor: 'pointer', borderBottom: i < sessions.length - 1 ? `0.5px solid ${T.divider}` : 'none' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = T.canvas2}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                        <td style={{ padding: D.cellPad, fontWeight: 600, color: T.primary, fontVariantNumeric: 'tabular-nums' }}>{s.date}</td>
                        <td style={{ padding: D.cellPad, color: T.body, fontVariantNumeric: 'tabular-nums' }}>{s.start}–{s.end}</td>
                        <td style={{ padding: D.cellPad, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12, color: T.body }}>
                          {s.cpt} <span style={{ color: T.muted, fontFamily: 'inherit', fontSize: 11.5 }}>{cpt?.desc}</span>
                        </td>
                        <td style={{ padding: D.cellPad, color: T.body, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(s.fee)}</td>
                        <td style={{ padding: D.cellPad }}>
                          {s.paid
                            ? <Pill tone="success">Paid</Pill>
                            : <Pill tone="danger">Unpaid</Pill>}
                        </td>
                        <td style={{ padding: D.cellPad }}>
                          {s.signed
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.success, fontSize: 12, fontWeight: 600 }}><Icon name="lock" size={12} /> Signed</span>
                            : <span style={{ color: T.faint }}>—</span>}
                        </td>
                        <td style={{ padding: D.cellPad }}>
                          {s.noted
                            ? <Icon name="check" size={15} color={T.success} />
                            : <span style={{ color: T.faint }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {tab === 'billing' && (
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Outstanding balance</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 600, color: balance > 0 ? T.danger : T.success, letterSpacing: -0.6 }}>
                {fmtMoney(balance)}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: T.muted }}>
                {balance > 0 ? `1 unpaid session` : 'All caught up'}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <Btn icon="pdf">Generate Superbill</Btn>
                <Btn variant="secondary">Mark all paid</Btn>
              </div>
            </Card>
          </div>
        )}

        {tab === 'documents' && (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Card padding={0}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', borderBottom: `0.5px solid ${T.hairline}` }}>
                <div style={{ fontSize: 12, color: T.muted }}>{documents.length} documents</div>
                <div style={{ flex: 1 }} />
                <Btn size="sm" icon="paperclip">Upload Document</Btn>
              </div>
              <div>
                {documents.map((d, i) => (
                  <div key={d.id} style={{
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    borderBottom: i < documents.length - 1 ? `0.5px solid ${T.divider}` : 'none',
                  }}>
                    <div style={{ width: 36, height: 44, borderRadius: 4, background: T.canvas2, border: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="doc" size={18} color={T.muted} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{d.label}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{d.file} · {d.size} · Uploaded {d.uploaded}</div>
                    </div>
                    <Pill tone="primary">{d.type}</Pill>
                    <Btn size="sm" variant="ghost" icon="download">Download</Btn>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === 'measures' && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Card>
              <h4 style={{ margin: '0 0 14px', fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600, color: T.ink }}>GAD-7 score over time</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 160, padding: '20px 0' }}>
                {[15, 14, 13, 13, 12, 11].map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${(v / 21) * 100}%`, background: T.primary, borderRadius: '4px 4px 0 0', opacity: 0.4 + (i * 0.1) }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: T.body, fontWeight: 600 }}>{v}</div>
                    <div style={{ fontSize: 10.5, color: T.muted }}>{['3/18','3/25','4/1','4/8','4/15','4/22'][i]}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>Trending down · last administered 2026-04-22</div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: `0.5px solid ${T.divider}`, fontSize: 13 }}>
      <div style={{ width: 130, color: T.muted, flexShrink: 0 }}>{label}</div>
      <div style={{ color: T.ink, flex: 1 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { ClientChart });
