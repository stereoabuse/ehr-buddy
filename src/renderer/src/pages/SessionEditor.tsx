import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import type { NoteFormat, Session, SessionInput } from '@shared/types'
import { CPT_CODES } from '@shared/cpt-codes'
import { Button } from '../components/Button'
import { Field } from '../components/Field'

const DAP_SCAFFOLDING = 'Data:\n\n\nAssessment:\n\n\nPlan:\n'

function calcDuration(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null
  const minutes = eh * 60 + em - (sh * 60 + sm)
  return minutes > 0 ? minutes : null
}

function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatSignedAt(iso: string): string {
  return new Date(iso).toLocaleString()
}

export default function SessionEditor() {
  const { clientId, sessionId } = useParams<{ clientId: string; sessionId?: string }>()
  const isNew = !sessionId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const clinicianQuery = useQuery({ queryKey: ['clinician'], queryFn: () => window.api.clinician.get() })
  const clientQuery = useQuery({ queryKey: ['clients', clientId], queryFn: () => window.api.clients.get(clientId!), enabled: !!clientId })
  const sessionQuery = useQuery({ queryKey: ['sessions', sessionId], queryFn: () => window.api.sessions.get(sessionId!), enabled: !isNew })
  const amendmentsQuery = useQuery({
    queryKey: ['sessions', sessionId, 'amendments'],
    queryFn: () => window.api.sessions.listAmendments(sessionId!),
    enabled: !isNew
  })

  const defaultFees = useMemo<Record<string, number>>(() => {
    return clinicianQuery.data?.default_fees_json ? JSON.parse(clinicianQuery.data.default_fees_json) : {}
  }, [clinicianQuery.data])

  const [form, setForm] = useState<SessionInput>({
    client_id: clientId ?? '',
    session_date: todayLocal(),
    start_time: '',
    end_time: '',
    cpt_code: '',
    icd10_codes: null,
    fee_cents: 0,
    paid: 0,
    note_format: 'DAP',
    note_body: DAP_SCAFFOLDING
  })
  const [feeDollarStr, setFeeDollarStr] = useState('0')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [amendmentDraft, setAmendmentDraft] = useState('')
  const [signError, setSignError] = useState<string | null>(null)
  const [amendError, setAmendError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionQuery.data) {
      setForm({
        client_id: sessionQuery.data.client_id,
        session_date: sessionQuery.data.session_date,
        start_time: sessionQuery.data.start_time,
        end_time: sessionQuery.data.end_time,
        cpt_code: sessionQuery.data.cpt_code,
        icd10_codes: sessionQuery.data.icd10_codes,
        fee_cents: sessionQuery.data.fee_cents,
        paid: sessionQuery.data.paid,
        note_format: sessionQuery.data.note_format,
        note_body: sessionQuery.data.note_body,
        id: sessionQuery.data.id
      })
      setFeeDollarStr((sessionQuery.data.fee_cents / 100).toString())
    }
  }, [sessionQuery.data])

  const session: Session | undefined = sessionQuery.data ?? undefined
  const isSigned = !!session?.signed_at
  const duration = useMemo(() => calcDuration(form.start_time, form.end_time), [form.start_time, form.end_time])

  function updateForm<K extends keyof SessionInput>(key: K, value: SessionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleCptChange(code: string) {
    setForm((f) => {
      const defaultFee = defaultFees[code]
      if (f.fee_cents === 0 && defaultFee != null) {
        setFeeDollarStr((defaultFee / 100).toString())
        return { ...f, cpt_code: code, fee_cents: defaultFee }
      }
      return { ...f, cpt_code: code }
    })
  }

  function handleNoteFormatChange(format: NoteFormat) {
    setForm((f) => {
      const note_body = format === 'DAP' && (!f.note_body || f.note_body.trim() === '') ? DAP_SCAFFOLDING : f.note_body
      return { ...f, note_format: format, note_body }
    })
  }

  const save = useMutation({
    mutationFn: (input: SessionInput) => window.api.sessions.upsert(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
    }
  })

  const sign = useMutation({
    mutationFn: () => {
      const body = form.note_body ?? ''
      if (!sessionId) throw new Error('Save the session before signing.')
      return window.api.sessions.sign({
        id: sessionId,
        body,
        note_format: form.note_format ?? 'DAP'
      })
    },
    onSuccess: () => {
      setSignError(null)
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (err) => setSignError(String(err))
  })

  const addAmendment = useMutation({
    mutationFn: (body: string) =>
      window.api.sessions.addAmendment({ session_id: sessionId!, body }),
    onSuccess: () => {
      setAmendmentDraft('')
      setAmendError(null)
      qc.invalidateQueries({ queryKey: ['sessions', sessionId, 'amendments'] })
    },
    onError: (err) => setAmendError(String(err))
  })

  const del = useMutation({
    mutationFn: (id: string) => window.api.sessions.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      navigate(`/clients/${clientId}`)
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

  function doSave(andClose: boolean) {
    if (!validate()) return
    const d = parseFloat(feeDollarStr)
    const fee_cents = isNaN(d) ? 0 : Math.round(d * 100)
    save.mutate({ ...form, fee_cents }, {
      onSuccess: (saved) => {
        if (isNew) {
          // Move into edit mode for the saved session so subsequent saves /
          // sign-off operate on the persisted row.
          navigate(`/clients/${clientId}/sessions/${saved.id}`, { replace: true })
        } else if (andClose) {
          navigate(`/clients/${clientId}`)
        }
      }
    })
  }

  async function doSign() {
    if (!validate()) return
    if (isNew) {
      // Persist first, then sign in the same flow.
      const d = parseFloat(feeDollarStr)
      const fee_cents = isNaN(d) ? 0 : Math.round(d * 100)
      try {
        const saved = await save.mutateAsync({ ...form, fee_cents })
        navigate(`/clients/${clientId}/sessions/${saved.id}`, { replace: true })
        await window.api.sessions.sign({
          id: saved.id,
          body: form.note_body ?? '',
          note_format: form.note_format ?? 'DAP'
        })
        qc.invalidateQueries({ queryKey: ['sessions'] })
        setSignError(null)
      } catch (err) {
        setSignError(String(err))
      }
      return
    }
    // Existing session — make sure latest body is persisted before signing.
    const d = parseFloat(feeDollarStr)
    const fee_cents = isNaN(d) ? 0 : Math.round(d * 100)
    try {
      await save.mutateAsync({ ...form, fee_cents })
      await sign.mutateAsync()
    } catch (err) {
      setSignError(String(err))
    }
  }

  function handleDelete() {
    if (!sessionId) return
    if (confirm('Delete this session? This cannot be undone.')) del.mutate(sessionId)
  }

  function handleAddAmendment() {
    const trimmed = amendmentDraft.trim()
    if (!trimmed) {
      setAmendError('Amendment cannot be empty')
      return
    }
    addAmendment.mutate(trimmed)
  }

  const clientName = clientQuery.data ? `${clientQuery.data.first_name} ${clientQuery.data.last_name}` : 'client'

  if (!isNew && sessionQuery.isLoading) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <button type="button" onClick={() => navigate(`/clients/${clientId}`)} className="text-sm text-blue-700 hover:underline">
          ← Back to {clientName}
        </button>
        <h2 className="mt-2 text-3xl font-semibold">{isNew ? 'New Session' : 'Edit Session'}</h2>
      </div>

      {isSigned && session && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-green-700">✓</span>
            <div>
              <p className="font-semibold text-green-900">
                Signed by {session.signed_by_name}
                {session.signed_by_credentials ? `, ${session.signed_by_credentials}` : ''}
              </p>
              <p className="text-sm text-green-800">
                on {formatSignedAt(session.signed_at!)} — clinical fields are locked. Add an amendment to record changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── When ──────────────────────────────────── */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-6" disabled={isSigned}>
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">When</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date" type="date" value={form.session_date} onChange={(e) => updateForm('session_date', e.target.value)} error={errors.session_date} required />
          <Field label="Start time" type="time" value={form.start_time} onChange={(e) => updateForm('start_time', e.target.value)} error={errors.start_time} required />
          <Field label="End time" type="time" value={form.end_time} onChange={(e) => updateForm('end_time', e.target.value)} error={errors.end_time} required />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Duration: {duration != null ? <span className="font-semibold">{duration} min</span> : <span className="text-slate-400">—</span>}
        </p>
      </fieldset>

      {/* ── Note ──────────────────────────────────── */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Session Note</legend>
        <div className="mb-3 flex gap-2">
          {(['DAP', 'FREE'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleNoteFormatChange(fmt)}
              disabled={isSigned}
              className={`px-4 py-2 rounded-md border text-sm font-medium ${
                form.note_format === fmt
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {fmt === 'DAP' ? 'DAP' : 'Free form'}
            </button>
          ))}
        </div>
        <textarea
          value={form.note_body ?? ''}
          onChange={(e) => updateForm('note_body', e.target.value || null)}
          rows={20}
          readOnly={isSigned}
          className={`block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            isSigned ? 'bg-slate-50 text-slate-700' : ''
          }`}
          placeholder="Start typing your session note…"
        />
      </fieldset>

      {/* ── Amendments ────────────────────────────── */}
      {isSigned && (
        <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
          <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Amendments</legend>

          {amendmentsQuery.data && amendmentsQuery.data.length > 0 && (
            <ul className="mb-6 space-y-4">
              {amendmentsQuery.data.map((a) => (
                <li key={a.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 text-xs text-slate-500">
                    Signed by {a.signed_by_name}
                    {a.signed_by_credentials ? `, ${a.signed_by_credentials}` : ''}
                    {' · '}
                    {formatSignedAt(a.signed_at)}
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800">{a.body}</p>
                </li>
              ))}
            </ul>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">New amendment</span>
            <textarea
              value={amendmentDraft}
              onChange={(e) => setAmendmentDraft(e.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Describe the correction or addition…"
            />
          </label>

          {amendError && <p className="mt-2 text-sm text-red-600">{amendError}</p>}

          <div className="mt-3">
            <Button
              onClick={handleAddAmendment}
              disabled={addAmendment.isPending || !amendmentDraft.trim()}
            >
              {addAmendment.isPending ? 'Signing…' : 'Sign Amendment'}
            </Button>
          </div>
        </fieldset>
      )}

      {/* ── Billing (no Paid checkbox — toggle from the sessions table) ── */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Billing</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">CPT code</span>
            <select
              value={form.cpt_code}
              onChange={(e) => handleCptChange(e.target.value)}
              required
              disabled={isSigned}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
            >
              <option value="">Select…</option>
              {CPT_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
              ))}
            </select>
            {errors.cpt_code && <span className="mt-1 block text-sm text-red-600">{errors.cpt_code}</span>}
          </label>

          <Field
            label="ICD-10 codes"
            placeholder="F41.1, F32.1"
            value={form.icd10_codes ?? ''}
            onChange={(e) => updateForm('icd10_codes', e.target.value || null)}
            disabled={isSigned}
          />

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fee (USD)</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={feeDollarStr}
                onChange={(e) => setFeeDollarStr(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {isSigned && (
              <p className="mt-1 text-xs text-slate-500">
                Fee can still be adjusted post-sign (billing correction).
              </p>
            )}
          </label>
        </div>
      </fieldset>

      {save.error && <p className="text-red-600">Save failed: {String(save.error)}</p>}
      {signError && <p className="text-red-600">Sign failed: {signError}</p>}
      {save.isSuccess && <p className="text-green-700">Saved.</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
        <Button onClick={() => doSave(true)}>Save & Close</Button>
        <Button variant="secondary" onClick={() => doSave(false)}>Save</Button>
        {!isSigned && (
          <Button
            variant="primary"
            onClick={doSign}
            disabled={sign.isPending || save.isPending}
          >
            {sign.isPending || save.isPending ? 'Signing…' : 'Sign & Lock Note'}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => navigate(`/clients/${clientId}`)}>Cancel</Button>
        {!isNew && !isSigned && (
          <Button type="button" variant="danger" onClick={handleDelete} className="ml-auto">Delete</Button>
        )}
      </div>
    </div>
  )
}
