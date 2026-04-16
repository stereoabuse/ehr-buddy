import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import type { NoteFormat, SessionInput } from '@shared/types'
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

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function SessionEditor() {
  const { clientId, sessionId } = useParams<{ clientId: string; sessionId?: string }>()
  const isNew = !sessionId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const clinicianQuery = useQuery({ queryKey: ['clinician'], queryFn: () => window.api.clinician.get() })
  const clientQuery = useQuery({ queryKey: ['clients', clientId], queryFn: () => window.api.clients.get(clientId!), enabled: !!clientId })
  const sessionQuery = useQuery({ queryKey: ['sessions', sessionId], queryFn: () => window.api.sessions.get(sessionId!), enabled: !isNew })

  const defaultFees = useMemo<Record<string, number>>(() => {
    return clinicianQuery.data?.default_fees_json ? JSON.parse(clinicianQuery.data.default_fees_json) : {}
  }, [clinicianQuery.data])

  const [form, setForm] = useState<SessionInput>({
    client_id: clientId ?? '',
    session_date: today(),
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

  useEffect(() => {
    if (sessionQuery.data) {
      setForm(sessionQuery.data)
      setFeeDollarStr((sessionQuery.data.fee_cents / 100).toString())
    }
  }, [sessionQuery.data])

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

  const del = useMutation({
    mutationFn: (id: string) => window.api.sessions.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      navigate(`/clients/${clientId}`)
    }
  })

  function doSave(andClose: boolean) {
    const errs: Record<string, string> = {}
    if (!form.session_date) errs.session_date = 'Required'
    if (!form.start_time) errs.start_time = 'Required'
    if (!form.end_time) errs.end_time = 'Required'
    if (!form.cpt_code) errs.cpt_code = 'Required'
    if (duration == null && form.start_time && form.end_time) errs.end_time = 'End must be after start'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const d = parseFloat(feeDollarStr)
    const fee_cents = isNaN(d) ? 0 : Math.round(d * 100)
    save.mutate({ ...form, fee_cents }, {
      onSuccess: () => {
        if (andClose) navigate(`/clients/${clientId}`)
      }
    })
  }

  function handleDelete() {
    if (!sessionId) return
    if (confirm('Delete this session? This cannot be undone.')) del.mutate(sessionId)
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

      {/* ── When ──────────────────────────────────── */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
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

      {/* ── Note (PRIMARY — above billing) ────────── */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Session Note</legend>
        <div className="mb-3 flex gap-2">
          {(['DAP', 'FREE'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleNoteFormatChange(fmt)}
              className={`px-4 py-2 rounded-md border text-sm font-medium ${
                form.note_format === fmt
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {fmt === 'DAP' ? 'DAP' : 'Free form'}
            </button>
          ))}
        </div>
        <textarea
          value={form.note_body ?? ''}
          onChange={(e) => updateForm('note_body', e.target.value || null)}
          rows={20}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Start typing your session note…"
        />
      </fieldset>

      {/* ── Billing ───────────────────────────────── */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Billing</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">CPT code</span>
            <select
              value={form.cpt_code}
              onChange={(e) => handleCptChange(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select…</option>
              {CPT_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
              ))}
            </select>
            {errors.cpt_code && <span className="mt-1 block text-sm text-red-600">{errors.cpt_code}</span>}
          </label>

          <Field label="ICD-10 codes" placeholder="F41.1, F32.1" value={form.icd10_codes ?? ''} onChange={(e) => updateForm('icd10_codes', e.target.value || null)} />

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fee (USD)</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-slate-500">$</span>
              <input type="number" step="0.01" min="0" value={feeDollarStr} onChange={(e) => setFeeDollarStr(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </label>

          <label className="flex items-center gap-2 pt-7">
            <input type="checkbox" checked={form.paid === 1} onChange={(e) => updateForm('paid', e.target.checked ? 1 : 0)} className="h-5 w-5 rounded border-slate-300" />
            <span className="text-sm font-medium text-slate-700">Paid</span>
          </label>
        </div>
      </fieldset>

      {save.error && <p className="text-red-600">Save failed: {String(save.error)}</p>}
      {save.isSuccess && <p className="text-green-700">Saved.</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
        <Button onClick={() => doSave(true)}>Save & Close</Button>
        <Button variant="secondary" onClick={() => doSave(false)}>Save</Button>
        <Button type="button" variant="secondary" onClick={() => navigate(`/clients/${clientId}`)}>Cancel</Button>
        {!isNew && (
          <Button type="button" variant="danger" onClick={handleDelete} className="ml-auto">Delete</Button>
        )}
      </div>
    </div>
  )
}
