// note.jsx — Progress Note editor (the polish target)
// Mirrors SimplePractice's progress note flow: structured DAP fields,
// session metadata sidebar, sign & lock, amendments.

const { useState: nuS, useMemo: nuM, useEffect: nuE, useRef: nuR } = React;

function ProgressNote({ session, onClose, density }) {
  const c = CLIENTS.find((x) => x.id === session.clientId);
  const cpt = CPT_CODES.find((x) => x.code === (session.useSample ? SAMPLE_NOTE.cpt : '90834'));

  // Form state
  const [date, setDate] = nuS(session.useSample ? SAMPLE_NOTE.date : '2026-04-25');
  const [start, setStart] = nuS(session.useSample ? SAMPLE_NOTE.start : (session.start || '10:00'));
  const [end, setEnd] = nuS(session.useSample ? SAMPLE_NOTE.end : (session.end || '10:50'));
  const [cptCode, setCptCode] = nuS(session.useSample ? SAMPLE_NOTE.cpt : (session.cpt || '90834'));
  const [icd10, setIcd10] = nuS(session.useSample ? SAMPLE_NOTE.icd10 : 'F41.1');
  const [feeStr, setFeeStr] = nuS(session.useSample ? '180.00' : '180.00');
  const [paid, setPaid] = nuS(false);
  const [format, setFormat] = nuS('DAP');

  // Body parsed into DAP fields when sample
  const [data, setData] = nuS(session.useSample
    ? `Client arrived on time, oriented x3, mood reported as "tense, kind of foggy." Affect congruent, restricted range. Reported continued difficulty falling asleep (avg ~45 min sleep latency, 4–5 nights/wk) and persistent worry about workplace performance review scheduled next week. Denied SI/HI. Reported using diaphragmatic breathing 2x this week with partial relief; missed homework log on 3 days.`
    : '');
  const [assessment, setAssessment] = nuS(session.useSample
    ? `Symptoms consistent with ongoing GAD, mild–moderate severity (GAD-7 = 11, down from 13 last session). Cognitive distortions today centered on catastrophizing ("if I get any feedback I'll be put on a PIP"). Therapeutic alliance strong; client engaged in cognitive restructuring exercise in-session. Sleep onset insomnia secondary to anxious rumination; sleep hygiene partially implemented.`
    : '');
  const [plan, setPlan] = nuS(session.useSample
    ? `1. Continue weekly individual psychotherapy.\n2. Assign thought record (3 entries) focused on workplace catastrophizing.\n3. Review sleep hygiene checklist; add stimulus-control instructions (bed = sleep only).\n4. Re-administer GAD-7 in 2 weeks.\n5. Next session: Fri 5/2 at 10:00.`
    : '');
  const [freeText, setFreeText] = nuS('');

  // Sign state
  const [signed, setSigned] = nuS(false);
  const [signedAt, setSignedAt] = nuS(null);
  const [showSignModal, setShowSignModal] = nuS(false);

  // Amendments
  const [amendments, setAmendments] = nuS([]);
  const [amendDraft, setAmendDraft] = nuS('');
  const [showAmendForm, setShowAmendForm] = nuS(false);

  // Saved indicator
  const [lastSaved, setLastSaved] = nuS('Just now');

  // Duration calc
  const duration = nuM(() => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const m = eh * 60 + em - (sh * 60 + sm);
    return m > 0 ? m : null;
  }, [start, end]);

  function handleSign() {
    setSigned(true);
    setSignedAt(new Date());
    setShowSignModal(false);
  }

  function handleAddAmendment() {
    if (!amendDraft.trim()) return;
    setAmendments([...amendments, { id: 'a' + Date.now(), body: amendDraft.trim(), at: new Date(), by: 'Dr. Robin Hale, LCSW' }]);
    setAmendDraft('');
    setShowAmendForm(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.canvas }}>
      {/* Sticky header */}
      <div style={{
        padding: '14px 28px', background: T.surface,
        borderBottom: `0.5px solid ${T.hairline}`,
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ border: 0, background: 'transparent', color: T.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }}>
          <Icon name="chevL" size={12} /> {c.first} {c.last}
        </button>
        <div style={{ width: 1, height: 18, background: T.hairline }} />
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 600, color: T.ink }}>Progress Note</div>
          <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>{date} · {start}–{end} · {cpt?.desc}</div>
        </div>
        <div style={{ flex: 1 }} />
        {signed
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.muted }}>
              <Icon name="check" size={13} color={T.success} /> Auto-saved · Signed {signedAt?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          : <span style={{ fontSize: 12, color: T.muted }}>Auto-saved · {lastSaved}</span>}
        <Btn variant="secondary" onClick={onClose}>Close</Btn>
        {!signed && <Btn variant="secondary">Save Draft</Btn>}
        {!signed && <Btn icon="lock" onClick={() => setShowSignModal(true)}>Sign & Lock</Btn>}
        {signed && (
          <Btn variant="secondary" icon="edit" onClick={() => setShowAmendForm(true)}>Add Amendment</Btn>
        )}
      </div>

      {/* Locked banner */}
      {signed && (
        <div style={{ padding: '12px 28px', background: T.successSoft, borderBottom: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Icon name="lock" size={16} color={T.success} />
          <div style={{ flex: 1, fontSize: 13, color: T.ink }}>
            <strong style={{ color: T.success }}>Signed by Dr. Robin Hale, LCSW</strong>
            <span style={{ color: T.body }}> on {signedAt?.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}. Clinical fields are locked. Use amendments to record corrections.</span>
          </div>
        </div>
      )}

      {/* Body — two columns */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>

          {/* LEFT — note body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Format toggle */}
            <Card padding={0} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Note format</span>
              <div style={{ display: 'flex', background: T.canvas2, borderRadius: 7, padding: 2, border: `0.5px solid ${T.hairline}` }}>
                {['DAP', 'SOAP', 'Free text'].map((f) => (
                  <button key={f} onClick={() => !signed && setFormat(f)} disabled={signed} style={{
                    height: 26, padding: '0 12px', border: 0,
                    background: format === f ? '#fff' : 'transparent',
                    color: format === f ? T.ink : T.muted,
                    fontSize: 12, fontWeight: 600, borderRadius: 5,
                    cursor: signed ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: format === f ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    opacity: signed ? 0.6 : 1,
                  }}>{f}</button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: T.muted }}>
                {duration ? `${duration} min` : '—'} · ${feeStr}
              </span>
            </Card>

            {/* DAP fields */}
            {format === 'DAP' && (
              <>
                <NoteField
                  label="Data"
                  hint="Observable behaviors, mental status, what was reported and discussed"
                  value={data} onChange={setData} signed={signed}
                  rows={6}
                />
                <NoteField
                  label="Assessment"
                  hint="Clinical interpretation, progress toward goals, response to interventions"
                  value={assessment} onChange={setAssessment} signed={signed}
                  rows={5}
                />
                <NoteField
                  label="Plan"
                  hint="Next steps, homework, frequency, referrals"
                  value={plan} onChange={setPlan} signed={signed}
                  rows={6}
                />
              </>
            )}

            {format === 'SOAP' && (
              <>
                <NoteField label="Subjective" hint="Client's reported experience" value="" onChange={() => {}} signed={signed} rows={4} />
                <NoteField label="Objective" hint="Observable data, mental status exam" value="" onChange={() => {}} signed={signed} rows={4} />
                <NoteField label="Assessment" hint="Clinical interpretation" value="" onChange={() => {}} signed={signed} rows={4} />
                <NoteField label="Plan" hint="Next steps, homework, frequency" value="" onChange={() => {}} signed={signed} rows={4} />
              </>
            )}

            {format === 'Free text' && (
              <NoteField label="Note" hint="Free-form session note" value={freeText} onChange={setFreeText} signed={signed} rows={20} />
            )}

            {/* Amendments */}
            {(signed && (amendments.length > 0 || showAmendForm)) && (
              <Card padding={0}>
                <div style={{ padding: '14px 20px', borderBottom: `0.5px solid ${T.hairline}` }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 600, color: T.ink, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="edit" size={14} color={T.muted} /> Amendments
                    <Pill tone="neutral">{amendments.length}</Pill>
                  </h3>
                </div>
                <div>
                  {amendments.map((a, i) => (
                    <div key={a.id} style={{ padding: '14px 20px', borderBottom: i < amendments.length - 1 || showAmendForm ? `0.5px solid ${T.divider}` : 'none' }}>
                      <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 6 }}>
                        Amendment #{i + 1} · Signed by <strong style={{ color: T.body }}>{a.by}</strong> on {a.at.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <p style={{ margin: 0, fontSize: 13.5, color: T.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{a.body}</p>
                    </div>
                  ))}
                  {showAmendForm && (
                    <div style={{ padding: '14px 20px', background: T.canvas2 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 6 }}>New amendment</label>
                      <textarea value={amendDraft} onChange={(e) => setAmendDraft(e.target.value)} rows={4} placeholder="Describe the correction or addition. This will be appended to the note with your signature and timestamp." style={{
                        width: '100%', boxSizing: 'border-box', padding: 12, border: `0.5px solid ${T.hairline}`, borderRadius: 7, background: '#fff',
                        fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.55, color: T.ink, outline: 'none', resize: 'vertical',
                      }} />
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Btn icon="lock" onClick={handleAddAmendment} disabled={!amendDraft.trim()}>Sign Amendment</Btn>
                        <Btn variant="ghost" onClick={() => { setShowAmendForm(false); setAmendDraft(''); }}>Cancel</Btn>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT — metadata sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
            {/* Session details */}
            <Card padding={0}>
              <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.hairline}` }}>
                <h3 style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Session details</h3>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Date" type="date" value={date} onChange={setDate} disabled={signed} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Input label="Start" type="time" value={start} onChange={setStart} disabled={signed} />
                  <Input label="End" type="time" value={end} onChange={setEnd} disabled={signed} />
                </div>
                <div style={{ fontSize: 11.5, color: T.muted, marginTop: -4 }}>
                  Duration: <strong style={{ color: T.body }}>{duration ? `${duration} min` : '—'}</strong>
                </div>
              </div>
            </Card>

            {/* Diagnoses & billing */}
            <Card padding={0}>
              <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.hairline}` }}>
                <h3 style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Diagnoses & billing</h3>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Select label="CPT Code" value={cptCode} onChange={setCptCode} disabled={signed}
                  options={CPT_CODES.map((c) => ({ value: c.code, label: `${c.code} — ${c.desc}` }))} />
                <Input label="ICD-10 codes" value={icd10} onChange={setIcd10} disabled={signed} placeholder="F41.1, F32.1" />
                <Input label="Fee" prefix="$" value={feeStr} onChange={setFeeStr} disabled={signed} type="number" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.body, cursor: signed ? 'default' : 'pointer' }}>
                  <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} disabled={signed} />
                  Mark as paid
                </label>
              </div>
            </Card>

            {/* Client snapshot */}
            <Card padding={0}>
              <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.hairline}` }}>
                <h3 style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Client</h3>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar initials={c.initials} color={c.color} size={40} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.first} {c.last}</div>
                    <div style={{ fontSize: 11.5, color: T.muted }}>DOB {c.dob}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.body, lineHeight: 1.6 }}>
                  <div><strong style={{ color: T.muted, fontWeight: 500 }}>Dx</strong> &nbsp; {c.dx}</div>
                  <div><strong style={{ color: T.muted, fontWeight: 500 }}>Phone</strong> &nbsp; {c.phone}</div>
                  <div><strong style={{ color: T.muted, fontWeight: 500 }}>Last</strong> &nbsp; {c.lastSession}</div>
                </div>
              </div>
            </Card>

            {/* Insert from previous note */}
            {!signed && (
              <Card>
                <h3 style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick actions</h3>
                <button style={ghostBtn}><Icon name="doc" size={13} color={T.primary} /> Copy from last note</button>
                <button style={ghostBtn}><Icon name="clipboard" size={13} color={T.primary} /> Apply DAP template</button>
                <button style={ghostBtn}><Icon name="chart" size={13} color={T.primary} /> Administer GAD-7</button>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Sign modal */}
      {showSignModal && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(31,58,54,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowSignModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: 460, background: '#fff', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="lock" size={18} color={T.primary} />
              </div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 600, color: T.ink }}>Sign and lock note?</h3>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ margin: '0 0 14px', fontSize: 13.5, color: T.body, lineHeight: 1.6 }}>
                You're about to finalize this progress note for <strong>{c.first} {c.last}</strong> ({date}). Once signed:
              </p>
              <ul style={{ margin: '0 0 18px', paddingLeft: 18, fontSize: 13, color: T.body, lineHeight: 1.7 }}>
                <li>Clinical fields will be locked</li>
                <li>Changes can only be made via dated, append-only amendments</li>
                <li>Your signature, credentials, and timestamp will be recorded</li>
              </ul>
              <div style={{ padding: 12, background: T.canvas2, borderRadius: 7, fontSize: 12.5, color: T.body }}>
                Signing as <strong style={{ color: T.ink }}>Dr. Robin Hale, LCSW</strong> · NPI 1234567890
              </div>
            </div>
            <div style={{ padding: '14px 24px', background: T.canvas2, borderTop: `0.5px solid ${T.hairline}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setShowSignModal(false)}>Cancel</Btn>
              <Btn icon="lock" onClick={handleSign}>Sign & Lock</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ghostBtn = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '8px 0', border: 0, background: 'transparent',
  color: T.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', textAlign: 'left',
};

function NoteField({ label, hint, value, onChange, signed, rows = 5 }) {
  return (
    <Card padding={0}>
      <div style={{ padding: '12px 18px 10px', borderBottom: `0.5px solid ${T.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: -0.1 }}>{label}</h3>
          <span style={{ fontSize: 11.5, color: T.muted }}>{hint}</span>
        </div>
      </div>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={rows} readOnly={signed}
        style={{
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '14px 18px', border: 0, outline: 'none', resize: 'vertical',
          fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.65, color: T.ink,
          background: signed ? T.canvas2 : '#fff', borderRadius: '0 0 10px 10px',
        }}
      />
    </Card>
  );
}

function Input({ label, value, onChange, disabled, type = 'text', prefix, placeholder }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: T.muted, marginBottom: 4 }}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 32, padding: prefix ? '0 10px 0 10px' : '0 10px',
        borderRadius: 7, border: `0.5px solid ${T.hairline}`,
        background: disabled ? T.canvas2 : '#fff',
      }}>
        {prefix && <span style={{ color: T.muted, fontSize: 13, marginRight: 4 }}>{prefix}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder}
          style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontSize: 13, color: T.ink, fontFamily: 'inherit', minWidth: 0 }} />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options, disabled }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: T.muted, marginBottom: 4 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{
        width: '100%', height: 32, padding: '0 10px',
        borderRadius: 7, border: `0.5px solid ${T.hairline}`,
        background: disabled ? T.canvas2 : '#fff',
        fontFamily: 'inherit', fontSize: 13, color: T.ink, outline: 'none',
        appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%236E8581' d='M0 0h10L5 6z'/></svg>")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 26,
      }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

Object.assign(window, { ProgressNote });
