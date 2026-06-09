import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import type { Session, SessionInput } from '@shared/types'
import { practiceDateString } from '@shared/date'
import { CPT_CODES } from '@shared/cpt-codes'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { Pill } from '../components/Pill'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Icd10Picker, parseIcd10String, serializeIcd10List } from '../components/Icd10Picker'
import { Modal } from '../components/Modal'
import { useUnsavedChangesGuard } from '../lib/useUnsavedChangesGuard'
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog'
import { initialsOf } from '../lib/format'
import { avatarColorFor } from '../lib/avatar'
import { invalidateSessionDerivedQueries } from '../lib/query'
import {
  EMPTY_STRUCTURED_NOTE,
  INTERVENTION_OPTIONS,
  OBSERVATION_OPTIONS,
  RECOMMENDATION_OPTIONS,
  RISK_FACTOR_OPTIONS,
  fromLegacyBody,
  noteHasContent,
  parseStructuredNote,
  serializeStructuredNote,
  type Recommendation,
  type StructuredNote
} from '@shared/structured-note'

function calcDuration(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null
  const minutes = eh * 60 + em - (sh * 60 + sm)
  return minutes > 0 ? minutes : null
}

function sessionSnapshot(form: SessionInput, feeDollarStr: string): string {
  return JSON.stringify({ ...form, feeDollarStr })
}

function makeInitialForm(clientId: string | undefined): SessionInput {
  return {
    client_id: clientId ?? '',
    session_date: practiceDateString(),
    start_time: '',
    end_time: '',
    cpt_code: '',
    icd10_codes: null,
    fee_cents: 0,
    paid: 0,
    note_format: 'STRUCTURED',
    note_body: serializeStructuredNote(EMPTY_STRUCTURED_NOTE)
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function formatLongTimestamp(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })
}

export default function SessionEditor() {
  const { clientId, sessionId } = useParams<{ clientId: string; sessionId?: string }>()
  const isNew = !sessionId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const clinicianQuery = useQuery({ queryKey: ['clinician'], queryFn: () => window.api.clinician.get() })
  const clientQuery = useQuery({
    queryKey: ['clients', clientId],
    queryFn: () => window.api.clients.get(clientId!),
    enabled: !!clientId
  })
  const sessionQuery = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => window.api.sessions.get(sessionId!),
    enabled: !isNew
  })
  const amendmentsQuery = useQuery({
    queryKey: ['sessions', sessionId, 'amendments'],
    queryFn: () => window.api.sessions.listAmendments(sessionId!),
    enabled: !isNew
  })
  const lastSessionQuery = useQuery({
    queryKey: ['sessions', 'byClient', clientId],
    queryFn: () => window.api.sessions.listByClient(clientId!),
    enabled: !!clientId
  })

  const defaultFees = useMemo<Record<string, number>>(() => {
    return clinicianQuery.data?.default_fees_json ? JSON.parse(clinicianQuery.data.default_fees_json) : {}
  }, [clinicianQuery.data])

  const [form, setForm] = useState<SessionInput>(() => makeInitialForm(clientId))
  const [baseline, setBaseline] = useState<string>(() =>
    sessionSnapshot(makeInitialForm(clientId), '0')
  )
  const [feeDollarStr, setFeeDollarStr] = useState('0')
  const isDirty = sessionSnapshot(form, feeDollarStr) !== baseline
  const { blocker, bypass } = useUnsavedChangesGuard(isDirty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [amendmentDraft, setAmendmentDraft] = useState('')
  const [showAmendForm, setShowAmendForm] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [amendError, setAmendError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  // Hydrate from server. Auto-converts unsigned legacy DAP/FREE → STRUCTURED
  // (legacy body becomes Overall Notes). Signed legacy notes stay as-is and
  // render in read-only legacy mode.
  useEffect(() => {
    const s = sessionQuery.data
    if (!s) return
    const isLegacy = s.note_format !== 'STRUCTURED'
    const isSignedNote = !!s.signed_at
    let next: SessionInput
    if (isLegacy && !isSignedNote) {
      const migrated = fromLegacyBody(s.note_body)
      next = {
        client_id: s.client_id,
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        cpt_code: s.cpt_code,
        icd10_codes: s.icd10_codes,
        fee_cents: s.fee_cents,
        paid: s.paid,
        note_format: 'STRUCTURED',
        note_body: serializeStructuredNote(migrated),
        id: s.id
      }
    } else {
      next = {
        client_id: s.client_id,
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        cpt_code: s.cpt_code,
        icd10_codes: s.icd10_codes,
        fee_cents: s.fee_cents,
        paid: s.paid,
        note_format: s.note_format,
        note_body: s.note_body,
        id: s.id
      }
    }
    const feeStr = (s.fee_cents / 100).toString()
    setForm(next)
    setFeeDollarStr(feeStr)
    setBaseline(sessionSnapshot(next, feeStr))
  }, [sessionQuery.data])

  const session: Session | undefined = sessionQuery.data ?? undefined
  const isSigned = !!session?.signed_at
  const isLegacySigned = isSigned && session?.note_format !== 'STRUCTURED'

  const billingDirty = useMemo(() => {
    if (!isSigned || !session) return false
    const d = parseFloat(feeDollarStr)
    const feeCents = isNaN(d) ? 0 : Math.round(d * 100)
    return feeCents !== session.fee_cents || form.paid !== session.paid
  }, [isSigned, session, feeDollarStr, form.paid])

  function doSaveBilling(): void {
    const d = parseFloat(feeDollarStr)
    const fee_cents = isNaN(d) ? 0 : Math.round(d * 100)
    save.mutate({ ...form, fee_cents })
  }
  const duration = useMemo(() => calcDuration(form.start_time, form.end_time), [form.start_time, form.end_time])
  const cpt = useMemo(() => CPT_CODES.find((c) => c.code === form.cpt_code), [form.cpt_code])

  const note = useMemo<StructuredNote>(
    () => (form.note_format === 'STRUCTURED' ? parseStructuredNote(form.note_body) : EMPTY_STRUCTURED_NOTE),
    [form.note_format, form.note_body]
  )

  function updateNote(partial: Partial<StructuredNote>): void {
    const next = { ...note, ...partial }
    setForm((f) => ({ ...f, note_body: serializeStructuredNote(next) }))
  }

  function updateObservation(field: keyof StructuredNote['observations'], value: string): void {
    updateNote({ observations: { ...note.observations, [field]: value } })
  }

  function toggleArrayValue(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  const lastSession = useMemo(() => {
    const list = lastSessionQuery.data ?? []
    return list
      .filter((s) => s.id !== sessionId)
      .sort((a, b) => b.session_date.localeCompare(a.session_date))[0]
  }, [lastSessionQuery.data, sessionId])

  function updateForm<K extends keyof SessionInput>(key: K, value: SessionInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleCptChange(code: string): void {
    setForm((f) => {
      const defaultFee = defaultFees[code]
      if (f.fee_cents === 0 && defaultFee != null) {
        setFeeDollarStr((defaultFee / 100).toString())
        return { ...f, cpt_code: code, fee_cents: defaultFee }
      }
      return { ...f, cpt_code: code }
    })
  }

  const save = useMutation({
    mutationFn: (input: SessionInput) => window.api.sessions.upsert(input),
    onSuccess: () => {
      setSavedAt(new Date())
      invalidateSessionDerivedQueries(qc)
    }
  })

  const sign = useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error('Save the session before signing.')
      return window.api.sessions.sign({
        id: sessionId,
        body: form.note_body ?? '',
        note_format: form.note_format ?? 'STRUCTURED'
      })
    },
    onSuccess: () => {
      setSignError(null)
      setShowSignModal(false)
      invalidateSessionDerivedQueries(qc)
    },
    onError: (err) => setSignError(String(err))
  })

  const addAmendment = useMutation({
    mutationFn: (body: string) =>
      window.api.sessions.addAmendment({ session_id: sessionId!, body }),
    onSuccess: () => {
      setAmendmentDraft('')
      setAmendError(null)
      setShowAmendForm(false)
      qc.invalidateQueries({ queryKey: ['sessions', sessionId, 'amendments'] })
    },
    onError: (err) => setAmendError(String(err))
  })

  const exportPdf = useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error('Save and sign the note before exporting.')
      return window.api.notes.exportPdf({ sessionId })
    },
    onSuccess: () => setExportError(null),
    onError: (err) => setExportError(String(err))
  })

  const del = useMutation({
    mutationFn: (id: string) => window.api.sessions.delete(id),
    onSuccess: () => {
      invalidateSessionDerivedQueries(qc)
      bypass(() => navigate(`/clients/${clientId}`, { replace: true }))
    }
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.session_date) errs.session_date = 'Required'
    if (!form.start_time) errs.start_time = 'Required'
    if (!form.end_time) errs.end_time = 'Required'
    if (!form.cpt_code) errs.cpt_code = 'Required'
    if (duration == null && form.start_time && form.end_time) errs.end_time = 'End must be after start'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function doSave(andClose: boolean): void {
    if (!validate()) return
    const d = parseFloat(feeDollarStr)
    const fee_cents = isNaN(d) ? 0 : Math.round(d * 100)
    save.mutate({ ...form, fee_cents }, {
      onSuccess: (saved) => {
        setBaseline(sessionSnapshot({ ...form, fee_cents, id: saved.id }, feeDollarStr))
        if (isNew) {
          bypass(() => navigate(`/clients/${clientId}/sessions/${saved.id}`, { replace: true }))
        } else if (andClose) {
          bypass(() => navigate(`/clients/${clientId}`))
        }
      }
    })
  }

  async function doSign(): Promise<void> {
    if (!validate()) {
      setSignError('Fix the highlighted fields before signing.')
      return
    }
    const d = parseFloat(feeDollarStr)
    const fee_cents = isNaN(d) ? 0 : Math.round(d * 100)
    try {
      if (isNew) {
        const saved = await save.mutateAsync({ ...form, fee_cents })
        setBaseline(sessionSnapshot({ ...form, fee_cents, id: saved.id }, feeDollarStr))
        bypass(() => navigate(`/clients/${clientId}/sessions/${saved.id}`, { replace: true }))
        await window.api.sessions.sign({
          id: saved.id,
          body: form.note_body ?? '',
          note_format: form.note_format ?? 'STRUCTURED'
        })
        invalidateSessionDerivedQueries(qc)
        setSignError(null)
        setShowSignModal(false)
      } else {
        await save.mutateAsync({ ...form, fee_cents })
        setBaseline(sessionSnapshot({ ...form, fee_cents }, feeDollarStr))
        await sign.mutateAsync()
      }
    } catch (err) {
      setSignError(String(err))
    }
  }

  function copyFromLastNote(): void {
    if (!lastSession) return
    if (lastSession.note_format === 'STRUCTURED') {
      const last = parseStructuredNote(lastSession.note_body)
      // Replace, but keep the user's draft warning if anything's been entered.
      const noteHasAnything =
        note.overall_notes ||
        note.plan ||
        note.medications ||
        note.content_discussed ||
        note.current_functioning
      if (noteHasAnything && !confirm("Replace the current note with the previous session's structured note?")) return
      setForm((f) => ({ ...f, note_body: serializeStructuredNote(last) }))
    } else {
      // Legacy: drop the body into Overall Notes.
      const overall = (lastSession.note_body ?? '').trim()
      if (!overall) return
      if (note.overall_notes && !confirm('Replace the current Overall Notes with the previous session?')) return
      updateNote({ overall_notes: overall })
    }
  }

  function handleDelete(): void {
    if (!sessionId) return
    if (confirm('Delete this session? This cannot be undone.')) del.mutate(sessionId)
  }

  function handleAddAmendment(): void {
    const trimmed = amendmentDraft.trim()
    if (!trimmed) {
      setAmendError('Amendment cannot be empty')
      return
    }
    addAmendment.mutate(trimmed)
  }

  if (!isNew && sessionQuery.isLoading) {
    return <div className="px-7 py-10 text-center text-base text-muted">Loading…</div>
  }

  const client = clientQuery.data
  const clientName = client ? `${client.first_name} ${client.last_name}` : 'Client'
  const hasAmendments = (amendmentsQuery.data ?? []).length > 0
  const formatLabel = isLegacySigned ? (session!.note_format === 'DAP' ? 'DAP (legacy)' : 'Free text (legacy)') : 'Structured'

  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-3.5rem)] flex-col bg-canvas">
      {/* Sticky header */}
      <div
        className="flex flex-shrink-0 items-center gap-4 bg-surface px-7 py-3.5"
        style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
      >
        <button
          type="button"
          onClick={() => navigate(`/clients/${clientId}`)}
          className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm font-semibold text-primary hover:text-primary-dark"
        >
          <Icon name="chevL" size={12} /> {clientName}
        </button>
        <div className="h-[18px] w-px" style={{ background: 'var(--color-hairline)' }} />
        <div>
          <div
            className="text-lg font-semibold text-ink"
            style={{ fontFamily: 'var(--font-head)' }}
          >
            {isNew ? 'New session note' : 'Progress note'}
          </div>
          <div className="mt-px text-sm text-muted">
            {form.session_date || '—'}
            {form.start_time && form.end_time ? ` · ${form.start_time}–${form.end_time}` : ''}
            {cpt ? ` · ${cpt.description}` : ''}
            {' · '}{formatLabel}
          </div>
        </div>
        <div className="flex-1" />

        <SaveStatus isSigned={isSigned} signedAt={session?.signed_at ?? null} savedAt={savedAt} pending={save.isPending} />

        {isSigned && billingDirty && (
          <Btn onClick={doSaveBilling} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save billing'}
          </Btn>
        )}
        {!isSigned && (
          <Btn variant="secondary" onClick={() => doSave(false)} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Draft'}
          </Btn>
        )}
        {!isSigned && (
          <Btn
            icon="lock"
            onClick={() => {
              if (!validate()) {
                setSignError('Fix the highlighted fields before signing.')
                return
              }
              if (!noteHasContent(form.note_format ?? 'STRUCTURED', form.note_body)) {
                setSignError('Cannot sign an empty note.')
                return
              }
              setSignError(null)
              setShowSignModal(true)
            }}
            disabled={save.isPending || sign.isPending}
          >
            Sign &amp; Lock
          </Btn>
        )}
        {isSigned && !showAmendForm && (
          <Btn variant="secondary" icon="edit" onClick={() => setShowAmendForm(true)}>
            Add Amendment
          </Btn>
        )}
        {isSigned && (
          <Btn
            variant="secondary"
            icon="download"
            onClick={() => exportPdf.mutate()}
            disabled={exportPdf.isPending}
          >
            {exportPdf.isPending ? 'Exporting…' : 'Export PDF'}
          </Btn>
        )}
      </div>

      {/* Locked banner */}
      {isSigned && session?.signed_at && (
        <div
          className="flex flex-shrink-0 items-center gap-2.5 bg-success-soft px-7 py-3"
          style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
        >
          <Icon name="lock" size={16} className="text-success" />
          <div className="flex-1 text-base text-ink">
            <strong className="text-success">
              Signed by {session.signed_by_name}
              {session.signed_by_credentials ? `, ${session.signed_by_credentials}` : ''}
            </strong>
            <span className="text-body">
              {' '}on {formatLongTimestamp(session.signed_at)}. Clinical fields are locked. Use amendments to record corrections.
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto px-7 py-7">
        <div
          className="mx-auto grid max-w-[1180px] items-start gap-6"
          style={{ gridTemplateColumns: '1fr 320px' }}
        >
          {/* LEFT — note */}
          <div className="flex flex-col gap-4">
            {isLegacySigned ? (
              <LegacyNoteCard format={session!.note_format} body={session!.note_body ?? ''} />
            ) : (
              <StructuredNoteForm
                note={note}
                signed={isSigned}
                onChangeText={(field, value) => updateNote({ [field]: value } as Partial<StructuredNote>)}
                onChangeObservation={updateObservation}
                onToggleRiskFactor={(id) => updateNote({ risk_factors: toggleArrayValue(note.risk_factors, id) })}
                onChangeRiskFactorOther={(value) => updateNote({ risk_factors_other: value })}
                onToggleIntervention={(id) =>
                  updateNote({ interventions: toggleArrayValue(note.interventions, id) })
                }
                onChangeInterventionOther={(value) => updateNote({ interventions_other: value })}
                onChangeTreatmentPlan={(field, value) =>
                  updateNote({ treatment_plan: { ...note.treatment_plan, [field]: value } })
                }
                onChangeRecommendation={(value) => updateNote({ recommendation: value })}
              />
            )}

            {/* Amendments */}
            {isSigned && (hasAmendments || showAmendForm) && (
              <Card padding={0}>
                <div
                  className="flex items-center gap-2 px-5 py-3.5"
                  style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
                >
                  <Icon name="edit" size={14} className="text-muted" />
                  <h3
                    className="m-0 text-md font-semibold text-ink"
                    style={{ fontFamily: 'var(--font-head)' }}
                  >
                    Amendments
                  </h3>
                  <Pill tone="neutral">{amendmentsQuery.data?.length ?? 0}</Pill>
                </div>
                <div>
                  {(amendmentsQuery.data ?? []).map((a, i, arr) => (
                    <div
                      key={a.id}
                      className="px-5 py-3.5"
                      style={{ borderBottom: i < arr.length - 1 || showAmendForm ? '0.5px solid var(--color-divider)' : 'none' }}
                    >
                      <div className="mb-1.5 text-[11.5px] text-muted">
                        Amendment #{i + 1} · Signed by{' '}
                        <strong className="text-body">
                          {a.signed_by_name}
                          {a.signed_by_credentials ? `, ${a.signed_by_credentials}` : ''}
                        </strong>{' '}
                        on {formatTimestamp(a.signed_at)}
                      </div>
                      <p className="m-0 whitespace-pre-wrap text-base leading-[1.55] text-ink">{a.body}</p>
                    </div>
                  ))}
                  {showAmendForm && (
                    <div className="bg-canvas-2 px-5 py-3.5">
                      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.4px] text-muted">
                        New amendment
                      </label>
                      <textarea
                        value={amendmentDraft}
                        onChange={(e) => setAmendmentDraft(e.target.value)}
                        rows={4}
                        placeholder="Describe the correction or addition. This will be appended to the note with your signature and timestamp."
                        className="block w-full resize-y rounded-md bg-surface p-3 text-base leading-[1.55] text-ink outline-none"
                        style={{ border: '0.5px solid var(--color-hairline)' }}
                      />
                      {amendError && <p className="mt-2 text-sm text-danger">{amendError}</p>}
                      <div className="mt-2.5 flex items-center gap-2">
                        <Btn
                          icon="lock"
                          onClick={handleAddAmendment}
                          disabled={!amendmentDraft.trim() || addAmendment.isPending}
                        >
                          {addAmendment.isPending ? 'Signing…' : 'Sign Amendment'}
                        </Btn>
                        <Btn
                          variant="ghost"
                          onClick={() => {
                            setShowAmendForm(false)
                            setAmendmentDraft('')
                            setAmendError(null)
                          }}
                        >
                          Cancel
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {save.error && <p className="text-sm text-danger">Save failed: {String(save.error)}</p>}
            {signError && <p className="text-sm text-danger">Sign failed: {signError}</p>}
            {exportError && <p className="text-sm text-danger">Export failed: {exportError}</p>}

            {!isNew && !isSigned && (
              <div className="pt-2">
                <Btn type="button" variant="danger" onClick={handleDelete}>
                  Delete session
                </Btn>
              </div>
            )}
          </div>

          {/* RIGHT — sticky sidebar */}
          <div className="sticky top-0 flex flex-col gap-4">
            <Card padding={0}>
              <SectionHeader>Session details</SectionHeader>
              <div className="flex flex-col gap-3 p-4">
                <SmallInput
                  label="Date"
                  type="date"
                  value={form.session_date}
                  onChange={(v) => updateForm('session_date', v)}
                  disabled={isSigned}
                  error={errors.session_date}
                />
                <div className="grid grid-cols-2 gap-2">
                  <SmallInput
                    label="Start"
                    type="time"
                    value={form.start_time}
                    onChange={(v) => updateForm('start_time', v)}
                    disabled={isSigned}
                    error={errors.start_time}
                  />
                  <SmallInput
                    label="End"
                    type="time"
                    value={form.end_time}
                    onChange={(v) => updateForm('end_time', v)}
                    disabled={isSigned}
                    error={errors.end_time}
                  />
                </div>
                <div className="-mt-1 text-[11.5px] text-muted">
                  Duration: <strong className="text-body">{duration ? `${duration} min` : '—'}</strong>
                </div>
              </div>
            </Card>

            <Card padding={0}>
              <SectionHeader>Diagnoses &amp; billing</SectionHeader>
              <div className="flex flex-col gap-3 p-4">
                <SmallSelect
                  label="CPT Code"
                  value={form.cpt_code}
                  onChange={handleCptChange}
                  disabled={isSigned}
                  options={[
                    { value: '', label: 'Select…' },
                    ...CPT_CODES.map((c) => ({ value: c.code, label: `${c.code} — ${c.description}` }))
                  ]}
                  error={errors.cpt_code}
                />
                <Icd10Picker
                  label="ICD-10 codes"
                  value={parseIcd10String(form.icd10_codes)}
                  onChange={(next) => updateForm('icd10_codes', serializeIcd10List(next))}
                  disabled={isSigned}
                />
                <SmallInput
                  label="Fee"
                  type="number"
                  prefix="$"
                  value={feeDollarStr}
                  onChange={(v) => setFeeDollarStr(v)}
                  disabled={false}
                />
                <label className="flex items-center gap-2 text-base text-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.paid === 1}
                    onChange={(e) => updateForm('paid', e.target.checked ? 1 : 0)}
                    disabled={false}
                  />
                  Mark as paid
                </label>
              </div>
            </Card>

            {client && (
              <Card padding={0}>
                <SectionHeader>Client</SectionHeader>
                <div className="p-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${clientId}`)}
                    className="mb-3 flex w-full items-center gap-3 rounded text-left hover:opacity-90"
                  >
                    <Avatar
                      initials={initialsOf(client.first_name, client.last_name)}
                      color={avatarColorFor(client.id)}
                      size={40}
                    />
                    <div>
                      <div className="text-md font-semibold text-ink">
                        {client.first_name} {client.last_name}
                      </div>
                      {client.dob && <div className="text-[11.5px] text-muted">DOB {client.dob}</div>}
                    </div>
                  </button>
                  <div className="text-sm leading-[1.6] text-body">
                    {form.icd10_codes && <SnapshotRow label="Dx" value={form.icd10_codes} />}
                    {client.phone && <SnapshotRow label="Phone" value={client.phone} />}
                    {lastSession && <SnapshotRow label="Last" value={lastSession.session_date} />}
                  </div>
                </div>
              </Card>
            )}

            {!isSigned && lastSession && (
              <Card>
                <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-muted">
                  Quick actions
                </h3>
                <button
                  type="button"
                  onClick={copyFromLastNote}
                  className="flex w-full items-center gap-2 border-0 bg-transparent py-2 text-left text-base font-semibold text-primary hover:text-primary-dark"
                >
                  <Icon name="paperclip" size={13} />
                  Copy from last note ({lastSession.session_date})
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Sign & Lock modal */}
      {showSignModal && (
        <Modal onClose={() => setShowSignModal(false)} labelledBy="sign-modal-title" width={460}>
            <div
              className="flex items-center gap-3 px-6 py-5"
              style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
                <Icon name="lock" size={18} className="text-primary" />
              </div>
              <h3
                id="sign-modal-title"
                className="m-0 text-lg font-semibold text-ink"
                style={{ fontFamily: 'var(--font-head)' }}
              >
                Sign and lock note?
              </h3>
            </div>
            <div className="px-6 py-6">
              <p className="m-0 mb-3.5 text-base leading-[1.6] text-body">
                You're about to finalize this progress note for <strong>{clientName}</strong> ({form.session_date}). Once signed:
              </p>
              <ul className="m-0 mb-4 list-disc pl-5 text-base leading-[1.7] text-body">
                <li>Clinical fields will be locked</li>
                <li>Changes can only be made via dated, append-only amendments</li>
                <li>Your signature, credentials, and timestamp will be recorded</li>
              </ul>
              {clinicianQuery.data ? (
                <div className="rounded-md bg-canvas-2 p-3 text-sm text-body">
                  Signing as{' '}
                  <strong className="text-ink">
                    {clinicianQuery.data.full_name}
                    {clinicianQuery.data.credentials ? `, ${clinicianQuery.data.credentials}` : ''}
                  </strong>
                  {clinicianQuery.data.npi ? ` · NPI ${clinicianQuery.data.npi}` : ''}
                </div>
              ) : (
                <div className="rounded-md bg-warn-soft p-3 text-sm text-warn">
                  Set up your clinician profile before signing.
                </div>
              )}
              {signError && <p className="mt-3 text-sm text-danger">{signError}</p>}
            </div>
            <div
              className="flex justify-end gap-2.5 bg-canvas-2 px-6 py-3.5"
              style={{ borderTop: '0.5px solid var(--color-hairline)' }}
            >
              <Btn variant="secondary" onClick={() => setShowSignModal(false)}>
                Cancel
              </Btn>
              <Btn icon="lock" onClick={doSign} disabled={!clinicianQuery.data || sign.isPending || save.isPending}>
                {sign.isPending || save.isPending ? 'Signing…' : 'Sign & Lock'}
              </Btn>
            </div>
        </Modal>
      )}

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  )
}

/* ─── Structured form ───────────────────────────────────────────── */

interface StructuredFormProps {
  note: StructuredNote
  signed: boolean
  onChangeText: (field: 'overall_notes' | 'medications' | 'current_functioning' | 'content_discussed' | 'plan', value: string) => void
  onChangeObservation: (field: keyof StructuredNote['observations'], value: string) => void
  onToggleRiskFactor: (id: string) => void
  onChangeRiskFactorOther: (value: string) => void
  onToggleIntervention: (id: string) => void
  onChangeInterventionOther: (value: string) => void
  onChangeTreatmentPlan: (field: keyof StructuredNote['treatment_plan'], value: string) => void
  onChangeRecommendation: (value: Recommendation) => void
}

function StructuredNoteForm({
  note,
  signed,
  onChangeText,
  onChangeObservation,
  onToggleRiskFactor,
  onChangeRiskFactorOther,
  onToggleIntervention,
  onChangeInterventionOther,
  onChangeTreatmentPlan,
  onChangeRecommendation
}: StructuredFormProps) {
  const riskOtherChecked = note.risk_factors.includes('other')
  const interventionsOtherChecked = note.interventions.includes('other')

  return (
    <div className="flex flex-col gap-4">
      <NoteCard>
        <FieldLabel>Overall Notes</FieldLabel>
        <TextArea value={note.overall_notes} onChange={(v) => onChangeText('overall_notes', v)} signed={signed} />
      </NoteCard>

      <NoteCard>
        <SectionTitle>Observations</SectionTitle>
        <div className="flex flex-col gap-3">
          <SelectField
            label="Cognitive Functioning"
            value={note.observations.cognitive_functioning}
            options={OBSERVATION_OPTIONS.cognitive_functioning}
            onChange={(v) => onChangeObservation('cognitive_functioning', v)}
            signed={signed}
          />
          <SelectField
            label="Affect"
            value={note.observations.affect}
            options={OBSERVATION_OPTIONS.affect}
            onChange={(v) => onChangeObservation('affect', v)}
            signed={signed}
          />
          <SelectField
            label="Mood"
            value={note.observations.mood}
            options={OBSERVATION_OPTIONS.mood}
            onChange={(v) => onChangeObservation('mood', v)}
            signed={signed}
          />
          <SelectField
            label="Interpersonal"
            value={note.observations.interpersonal}
            options={OBSERVATION_OPTIONS.interpersonal}
            onChange={(v) => onChangeObservation('interpersonal', v)}
            signed={signed}
          />
          <SelectField
            label="Functional Status"
            value={note.observations.functional_status}
            options={OBSERVATION_OPTIONS.functional_status}
            onChange={(v) => onChangeObservation('functional_status', v)}
            signed={signed}
          />
        </div>
      </NoteCard>

      <NoteCard>
        <SectionTitle>Risk Factors</SectionTitle>
        <CheckboxGroup
          options={RISK_FACTOR_OPTIONS}
          selected={note.risk_factors}
          onToggle={onToggleRiskFactor}
          signed={signed}
        />
        {riskOtherChecked && (
          <div className="mt-2">
            <LineField
              label="Other (specify)"
              value={note.risk_factors_other}
              onChange={onChangeRiskFactorOther}
              signed={signed}
            />
          </div>
        )}
      </NoteCard>

      <NoteCard>
        <FieldLabel>Medications</FieldLabel>
        <TextArea value={note.medications} onChange={(v) => onChangeText('medications', v)} signed={signed} />
      </NoteCard>

      <NoteCard>
        <FieldLabel>Current Functioning, Symptoms, or Impairments</FieldLabel>
        <TextArea value={note.current_functioning} onChange={(v) => onChangeText('current_functioning', v)} signed={signed} />
      </NoteCard>

      <NoteCard>
        <FieldLabel>Content or Topics Discussed</FieldLabel>
        <TextArea value={note.content_discussed} onChange={(v) => onChangeText('content_discussed', v)} signed={signed} />
      </NoteCard>

      <NoteCard>
        <SectionTitle>Interventions</SectionTitle>
        <CheckboxGroup
          options={INTERVENTION_OPTIONS}
          selected={note.interventions}
          onToggle={onToggleIntervention}
          signed={signed}
        />
        {interventionsOtherChecked && (
          <div className="mt-2">
            <LineField
              label="Other (specify)"
              value={note.interventions_other}
              onChange={onChangeInterventionOther}
              signed={signed}
            />
          </div>
        )}
      </NoteCard>

      <NoteCard>
        <SectionTitle>Treatment Plan Progress</SectionTitle>
        <div className="flex flex-col gap-3">
          <LineField label="Objective 1" value={note.treatment_plan.objective_1} onChange={(v) => onChangeTreatmentPlan('objective_1', v)} signed={signed} />
          <LineField label="Objective 2" value={note.treatment_plan.objective_2} onChange={(v) => onChangeTreatmentPlan('objective_2', v)} signed={signed} />
          <div>
            <FieldLabel>Additional Notes Regarding Goals and Objectives</FieldLabel>
            <TextArea value={note.treatment_plan.additional_notes} onChange={(v) => onChangeTreatmentPlan('additional_notes', v)} signed={signed} rows={4} />
          </div>
        </div>
      </NoteCard>

      <NoteCard>
        <FieldLabel>Plan</FieldLabel>
        <TextArea value={note.plan} onChange={(v) => onChangeText('plan', v)} signed={signed} />
      </NoteCard>

      <NoteCard>
        <SectionTitle>Recommendation</SectionTitle>
        <div className="flex flex-col gap-2">
          {RECOMMENDATION_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-2 text-base text-ink ${signed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                name="recommendation"
                value={opt.id}
                checked={note.recommendation === opt.id}
                onChange={() => onChangeRecommendation(opt.id)}
                disabled={signed}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </NoteCard>
    </div>
  )
}

/* ─── Form primitives (local) ───────────────────────────────────── */

function NoteCard({ children }: { children: React.ReactNode }) {
  return <Card padding={18}>{children}</Card>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-3 text-md font-semibold text-ink"
      style={{ fontFamily: 'var(--font-head)' }}
    >
      {children}
    </h3>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-base font-medium text-body">{children}</div>
}

function TextArea({
  value,
  onChange,
  signed,
  rows = 5
}: {
  value: string
  onChange: (v: string) => void
  signed: boolean
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={signed}
      rows={rows}
      placeholder="Begin typing here…"
      className="block w-full resize-y rounded-md p-3 text-base leading-[1.55] text-ink outline-none placeholder:text-faint"
      style={{
        border: '0.5px solid var(--color-hairline)',
        background: signed ? 'var(--color-canvas-2)' : 'var(--color-surface)'
      }}
    />
  )
}

function LineField({
  label,
  value,
  onChange,
  signed
}: {
  label: string
  value: string
  onChange: (v: string) => void
  signed: boolean
}) {
  return (
    <label className="block">
      <div className="mb-1 text-base text-body">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={signed}
        className="block h-9 w-full rounded-md px-3 text-base text-ink outline-none"
        style={{
          border: '0.5px solid var(--color-hairline)',
          background: signed ? 'var(--color-canvas-2)' : 'var(--color-surface)'
        }}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  signed
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  signed: boolean
}) {
  // Forgiving: if a saved value isn't in the options, render it as the
  // selected entry so it doesn't silently disappear.
  const knownValues = new Set(options)
  const showFallback = value !== '' && !knownValues.has(value)
  return (
    <label className="block">
      <div className="mb-1 text-base text-body">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={signed}
        className="block h-9 w-full rounded-md px-3 text-base text-ink outline-none"
        style={{
          border: '0.5px solid var(--color-hairline)',
          background: signed ? 'var(--color-canvas-2)' : 'var(--color-surface)'
        }}
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        {showFallback && (
          <option value={value}>{value} (legacy)</option>
        )}
      </select>
    </label>
  )
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
  signed
}: {
  options: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  signed: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={`flex items-center gap-2 text-base text-ink ${signed ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.id)}
            onChange={() => onToggle(opt.id)}
            disabled={signed}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

/* ─── Legacy signed note display ────────────────────────────────── */

function LegacyNoteCard({ format, body }: { format: string; body: string }) {
  return (
    <Card padding={0}>
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
      >
        <h3
          className="m-0 text-md font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)' }}
        >
          Note ({format})
        </h3>
        <Pill tone="neutral">Legacy format</Pill>
      </div>
      <div className="px-5 py-4">
        <p className="m-0 whitespace-pre-wrap text-base leading-[1.6] text-ink">
          {body || <span className="text-faint">(empty)</span>}
        </p>
      </div>
    </Card>
  )
}

/* ─── Header subcomponents ──────────────────────────────────────── */

function SaveStatus({
  isSigned,
  signedAt,
  savedAt,
  pending
}: {
  isSigned: boolean
  signedAt: string | null
  savedAt: Date | null
  pending: boolean
}) {
  if (isSigned && signedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted">
        <Icon name="check" size={13} className="text-success" /> Signed {formatTimestamp(signedAt)}
      </span>
    )
  }
  if (pending) return <span className="text-sm text-muted">Saving…</span>
  if (savedAt) return <span className="text-sm text-muted">Saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
  return <span className="text-sm text-faint">Unsaved</span>
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-3.5"
      style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
    >
      <h3 className="m-0 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-muted">
        {children}
      </h3>
    </div>
  )
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-12 shrink-0 font-medium text-muted">{label}</span>
      <span className="text-body">{value}</span>
    </div>
  )
}

function SmallInput({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
  prefix,
  placeholder,
  error
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  type?: string
  prefix?: string
  placeholder?: string
  error?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-muted">{label}</span>
      <div
        className={`flex h-8 items-center rounded-md ${disabled ? 'bg-canvas-2' : 'bg-surface'}`}
        style={{ border: '0.5px solid var(--color-hairline)', padding: '0 10px' }}
      >
        {prefix && <span className="mr-1 text-base text-muted">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none"
        />
      </div>
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  )
}

function SmallSelect({
  label,
  value,
  onChange,
  disabled,
  options,
  error
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  options: { value: string; label: string }[]
  error?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`block h-8 w-full rounded-md text-base text-ink outline-none ${disabled ? 'bg-canvas-2' : 'bg-surface'}`}
        style={{ border: '0.5px solid var(--color-hairline)', padding: '0 10px' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  )
}
