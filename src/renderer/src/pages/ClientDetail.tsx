import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ClientInput, Session } from '@shared/types'
import type { SuperbillArgs } from '@shared/api-types'
import { CPT_CODES } from '@shared/cpt-codes'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { Tabs } from '../components/Tabs'
import { Disclosure } from '../components/Disclosure'

const EMPTY: ClientInput = {
  first_name: '', last_name: '', dob: null,
  address_line1: null, address_line2: null, city: null, state: null, postal_code: null,
  phone: null, email: null,
  emergency_name: null, emergency_phone: null, emergency_relationship: null,
  insurance_carrier: null, insurance_member_id: null, insurance_group_id: null,
  insurance_plan_holder_name: null, insurance_plan_holder_dob: null
}

type TabId = 'info' | 'sessions' | 'superbill'

export default function ClientDetail() {
  const { id } = useParams<{ id?: string }>()
  const isNew = !id
  const [tab, setTab] = useState<TabId>('info')

  const clientQuery = useQuery({ queryKey: ['clients', id], queryFn: () => window.api.clients.get(id!), enabled: !isNew })
  const sessionsQuery = useQuery({ queryKey: ['sessions', 'byClient', id], queryFn: () => window.api.sessions.listByClient(id!), enabled: !isNew })

  if (!isNew && clientQuery.isLoading) return <p className="text-slate-500">Loading…</p>

  const displayName = clientQuery.data ? `${clientQuery.data.first_name} ${clientQuery.data.last_name}` : 'New Client'

  // running balance
  const unpaid = (sessionsQuery.data ?? []).filter((s) => s.paid === 0)
  const balance = unpaid.reduce((sum, s) => sum + s.fee_cents, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/clients" className="text-sm text-blue-700 hover:underline">← Back to clients</Link>
        <div className="mt-2 flex items-center justify-between">
          <h2 className="text-3xl font-semibold">{isNew ? 'New Client' : displayName}</h2>
          {!isNew && balance > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              Balance: ${(balance / 100).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'info', label: 'Client Info' },
          { id: 'sessions', label: 'Sessions', disabled: isNew },
          { id: 'superbill', label: 'Superbill', disabled: isNew }
        ]}
        active={tab}
        onChange={(t) => setTab(t as TabId)}
      />

      {tab === 'info' && <InfoForm clientId={id} />}
      {tab === 'sessions' && !isNew && <SessionsPanel clientId={id!} sessions={sessionsQuery.data ?? []} />}
      {tab === 'superbill' && !isNew && <SuperbillPanel clientId={id!} sessions={sessionsQuery.data ?? []} />}
    </div>
  )
}

/* ─── Client Info ───────────────────────────────────────────────── */

function InfoForm({ clientId }: { clientId: string | undefined }) {
  const isNew = !clientId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const clientQuery = useQuery({ queryKey: ['clients', clientId], queryFn: () => window.api.clients.get(clientId!), enabled: !isNew })
  const [form, setForm] = useState<ClientInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => { if (clientQuery.data) setForm(clientQuery.data) }, [clientQuery.data])

  const save = useMutation({
    mutationFn: (input: ClientInput) => window.api.clients.upsert(input),
    onSuccess: (client) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.setQueryData(['clients', client.id], client)
      if (isNew) navigate(`/clients/${client.id}`)
    }
  })

  const del = useMutation({
    mutationFn: (cid: string) => window.api.clients.delete(cid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); navigate('/clients') }
  })

  function update<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.first_name.trim()) errs.first_name = 'Required'
    if (!form.last_name.trim()) errs.last_name = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    save.mutate(form)
  }

  function handleDelete() {
    if (!clientId) return
    if (confirm(`Delete ${form.first_name} ${form.last_name}? They will be hidden from the client list.`))
      del.mutate(clientId)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Section title="Basics">
        <Field label="First name" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} error={errors.first_name} required />
        <Field label="Last name" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} error={errors.last_name} required />
        <Field label="Date of birth" type="date" value={form.dob ?? ''} onChange={(e) => update('dob', e.target.value || null)} />
      </Section>

      <Section title="Contact">
        <Field label="Address line 1" value={form.address_line1 ?? ''} onChange={(e) => update('address_line1', e.target.value || null)} className="sm:col-span-2" />
        <Field label="Address line 2" value={form.address_line2 ?? ''} onChange={(e) => update('address_line2', e.target.value || null)} className="sm:col-span-2" />
        <Field label="City" value={form.city ?? ''} onChange={(e) => update('city', e.target.value || null)} />
        <Field label="State" value={form.state ?? ''} onChange={(e) => update('state', e.target.value || null)} />
        <Field label="Postal code" value={form.postal_code ?? ''} onChange={(e) => update('postal_code', e.target.value || null)} />
        <Field label="Phone" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value || null)} />
        <Field label="Email" type="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value || null)} className="sm:col-span-2" />
      </Section>

      <Disclosure title="Emergency Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" value={form.emergency_name ?? ''} onChange={(e) => update('emergency_name', e.target.value || null)} />
          <Field label="Phone" value={form.emergency_phone ?? ''} onChange={(e) => update('emergency_phone', e.target.value || null)} />
          <Field label="Relationship" value={form.emergency_relationship ?? ''} onChange={(e) => update('emergency_relationship', e.target.value || null)} />
        </div>
      </Disclosure>

      <Disclosure title="Insurance">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Carrier" value={form.insurance_carrier ?? ''} onChange={(e) => update('insurance_carrier', e.target.value || null)} />
          <Field label="Member ID" value={form.insurance_member_id ?? ''} onChange={(e) => update('insurance_member_id', e.target.value || null)} />
          <Field label="Group ID" value={form.insurance_group_id ?? ''} onChange={(e) => update('insurance_group_id', e.target.value || null)} />
          <Field label="Plan holder name" value={form.insurance_plan_holder_name ?? ''} onChange={(e) => update('insurance_plan_holder_name', e.target.value || null)} />
          <Field label="Plan holder DOB" type="date" value={form.insurance_plan_holder_dob ?? ''} onChange={(e) => update('insurance_plan_holder_dob', e.target.value || null)} />
        </div>
      </Disclosure>

      {save.error && <p className="text-red-600">Save failed: {String(save.error)}</p>}
      {save.isSuccess && !isNew && <p className="text-green-700">Saved.</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/clients')}>Cancel</Button>
        {!isNew && <Button type="button" variant="danger" onClick={handleDelete} className="ml-auto">Delete</Button>}
      </div>
    </form>
  )
}

/* ─── Sessions ──────────────────────────────────────────────────── */

function SessionsPanel({ clientId, sessions }: { clientId: string; sessions: Session[] }) {
  const totalFee = sessions.reduce((s, x) => s + x.fee_cents, 0)
  const totalPaid = sessions.filter((s) => s.paid === 1).reduce((s, x) => s + x.fee_cents, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          {' · '}Fees: ${(totalFee / 100).toFixed(2)}
          {' · '}Paid: ${(totalPaid / 100).toFixed(2)}
          {' · '}Balance: <span className="font-semibold">${((totalFee - totalPaid) / 100).toFixed(2)}</span>
        </div>
        <Link to={`/clients/${clientId}/sessions/new`}><Button>+ New Session</Button></Link>
      </div>

      {sessions.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-500">No sessions yet.</p>
          <Link to={`/clients/${clientId}/sessions/new`} className="mt-4 inline-block"><Button>+ Add the first session</Button></Link>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">CPT</th>
                <th className="px-4 py-3 font-medium">Fee</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessions.map((s) => {
                const cpt = CPT_CODES.find((c) => c.code === s.cpt_code)
                const hasNote = !!s.note_body && s.note_body.replace(/Data:|Assessment:|Plan:/g, '').trim().length > 0
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/clients/${clientId}/sessions/${s.id}`} className="font-medium text-blue-700 hover:underline">{s.session_date}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.start_time}–{s.end_time}</td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">
                      {s.cpt_code}{cpt && <span className="ml-1 font-sans text-xs text-slate-500">{cpt.description}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">${(s.fee_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.paid === 1 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {s.paid === 1 ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasNote ? <span className="text-green-600" title="Note written">✓</span> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Superbill ─────────────────────────────────────────────────── */

function SuperbillPanel({ clientId, sessions }: { clientId: string; sessions: Session[] }) {
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)

  const [fromDate, setFromDate] = useState(firstOfMonth.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<string | null>(null)

  const inRange = sessions.filter((s) => s.session_date >= fromDate && s.session_date <= toDate)
  const totalFee = inRange.reduce((sum, s) => sum + s.fee_cents, 0)
  const totalPaid = inRange.filter((s) => s.paid === 1).reduce((sum, s) => sum + s.fee_cents, 0)

  const gen = useMutation({
    mutationFn: (args: SuperbillArgs) => window.api.superbill.generate(args),
    onSuccess: (result) => setStatus(result ? `Saved to ${result.path}` : 'Cancelled'),
    onError: (err) => setStatus(`Error: ${String(err)}`)
  })

  return (
    <div className="space-y-6">
      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Date Range</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Field label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </fieldset>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Preview</h4>
        <p className="mt-2 text-slate-700">
          <span className="font-semibold">{inRange.length}</span> session{inRange.length !== 1 ? 's' : ''}
          {' · '}Total: <span className="font-semibold">${(totalFee / 100).toFixed(2)}</span>
          {' · '}Paid: <span className="font-semibold">${(totalPaid / 100).toFixed(2)}</span>
          {' · '}Balance: <span className="font-semibold">${((totalFee - totalPaid) / 100).toFixed(2)}</span>
        </p>
      </div>

      {status && <p className={status.startsWith('Error') ? 'text-red-600' : 'text-green-700'}>{status}</p>}

      <Button onClick={() => { setStatus(null); gen.mutate({ clientId, fromDate, toDate }) }} disabled={gen.isPending || inRange.length === 0}>
        {gen.isPending ? 'Generating…' : 'Generate PDF'}
      </Button>
    </div>
  )
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
      <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
