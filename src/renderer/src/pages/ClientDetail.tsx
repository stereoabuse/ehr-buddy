import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Client, ClientDocument, ClientInput, DocType, Session } from '@shared/types'
import type { SuperbillArgs } from '@shared/api-types'
import { CPT_CODES } from '@shared/cpt-codes'
import { practiceDateString, practiceMonthStartString } from '@shared/date'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { Pill } from '../components/Pill'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Field } from '../components/Field'
import { Tabs } from '../components/Tabs'
import { Disclosure } from '../components/Disclosure'
import { PaidToggle } from '../components/PaidToggle'
import { fmtMoney, initialsOf } from '../lib/format'
import { avatarColorFor } from '../lib/avatar'
import { noteHasContent } from '../lib/structured-note'
import { invalidateSessionDerivedQueries } from '../lib/query'

const EMPTY: ClientInput = {
  first_name: '', last_name: '', dob: null,
  address_line1: null, address_line2: null, city: null, state: null, postal_code: null,
  phone: null, email: null,
  emergency_name: null, emergency_phone: null, emergency_relationship: null,
  insurance_carrier: null, insurance_member_id: null, insurance_group_id: null,
  insurance_plan_holder_name: null, insurance_plan_holder_dob: null
}

type TabId = 'overview' | 'sessions' | 'billing' | 'documents'

const DOC_TYPE_LABELS: Record<DocType, string> = {
  consent: 'Consent',
  roi: 'Release of Information',
  intake: 'Intake',
  other: 'Other'
}

export default function ClientDetail() {
  const { id } = useParams<{ id?: string }>()
  if (!id) return <NewClientView />
  return <ClientChartView clientId={id} />
}

/* ─── New client mode ───────────────────────────────────────────── */

function NewClientView() {
  return (
    <div className="mx-auto max-w-3xl">
      <h2
        className="mb-5 text-2xl font-semibold text-ink"
        style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
      >
        New Client
      </h2>
      <Card>
        <InfoForm clientId={undefined} onDone={undefined} />
      </Card>
    </div>
  )
}

/* ─── Chart view ────────────────────────────────────────────────── */

function ClientChartView({ clientId }: { clientId: string }) {
  const navigate = useNavigate()
  const clientQuery = useQuery({ queryKey: ['clients', clientId], queryFn: () => window.api.clients.get(clientId) })
  const sessionsQuery = useQuery({ queryKey: ['sessions', 'byClient', clientId], queryFn: () => window.api.sessions.listByClient(clientId) })

  const [tab, setTab] = useState<TabId>('overview')
  const [editing, setEditing] = useState(false)

  const docsQuery = useQuery({
    queryKey: ['documents', clientId],
    queryFn: () => window.api.documents.list(clientId)
  })

  if (clientQuery.isLoading) {
    return <div className="px-7 py-10 text-center text-base text-muted">Loading…</div>
  }
  if (!clientQuery.data) {
    return <div className="px-7 py-10 text-center text-base text-danger">Client not found.</div>
  }

  const client = clientQuery.data
  const sessions = sessionsQuery.data ?? []
  const docs = docsQuery.data ?? []

  const unpaid = sessions.filter((s) => s.paid === 0)
  const balance = unpaid.reduce((sum, s) => sum + s.fee_cents, 0)
  const lastDx = sessions.length > 0
    ? (sessions[0]!.icd10_codes?.split(',')[0]?.trim() ?? null)
    : null
  const earliestDate = sessions.length > 0
    ? sessions.reduce((min, s) => s.session_date < min ? s.session_date : min, sessions[0]!.session_date)
    : null

  const fullName = `${client.first_name} ${client.last_name}`
  const isActive = client.active === 1

  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header card */}
      <div
        className="bg-surface px-7 pt-5"
        style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
      >
        <button
          onClick={() => navigate('/clients')}
          className="mb-2 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm font-semibold text-primary hover:text-primary-dark"
        >
          <Icon name="chevL" size={12} /> All clients
        </button>
        <div className="flex items-center gap-[18px]">
          <Avatar
            initials={initialsOf(client.first_name, client.last_name)}
            color={avatarColorFor(client.id)}
            size={56}
          />
          <div className="flex-1">
            <div className="flex items-baseline gap-2.5">
              <h2
                className="m-0 text-2xl font-semibold text-ink"
                style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
              >
                {fullName}
              </h2>
              <Pill tone={isActive ? 'success' : 'neutral'}>
                <span
                  className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: isActive ? 'var(--color-success)' : 'var(--color-faint)' }}
                />
                {isActive ? 'Active' : 'Inactive'}
              </Pill>
              {balance > 0 && <Pill tone="danger">Balance {fmtMoney(balance)}</Pill>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-[18px] text-base text-muted">
              {client.dob && <span>DOB {client.dob}</span>}
              {client.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="phone" size={13} />
                  {client.phone}
                </span>
              )}
              {client.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="mail" size={13} />
                  {client.email}
                </span>
              )}
              {lastDx && <span>{lastDx}</span>}
            </div>
          </div>
          {tab === 'overview' && !editing && (
            <Btn variant="secondary" icon="edit" onClick={() => setEditing(true)}>
              Edit
            </Btn>
          )}
          <Btn icon="plus" onClick={() => navigate(`/clients/${clientId}/sessions/new`)}>
            Progress Note
          </Btn>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'sessions', label: 'Sessions', count: sessions.length },
              { id: 'billing', label: 'Billing' },
              { id: 'documents', label: 'Documents', count: docs.length }
            ]}
            active={tab}
            onChange={(t) => {
              setTab(t as TabId)
              setEditing(false)
            }}
          />
        </div>
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-auto px-7 py-7">
        {tab === 'overview' && (editing ? (
          <div className="mx-auto max-w-3xl">
            <Card>
              <InfoForm
                clientId={clientId}
                onDone={() => setEditing(false)}
              />
            </Card>
          </div>
        ) : (
          <OverviewPanel client={client} lastDx={lastDx} earliestSessionDate={earliestDate} />
        ))}
        {tab === 'sessions' && <SessionsPanel clientId={clientId} sessions={sessions} />}
        {tab === 'billing' && <BillingPanel clientId={clientId} sessions={sessions} />}
        {tab === 'documents' && <DocumentsPanel clientId={clientId} docs={docs} />}
      </div>
    </div>
  )
}

/* ─── Overview ──────────────────────────────────────────────────── */

function OverviewPanel({
  client,
  lastDx,
  earliestSessionDate
}: {
  client: Client
  lastDx: string | null
  earliestSessionDate: string | null
}) {
  const fullAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.state, client.postal_code].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ')

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-4">
      <Card>
        <SectionLabel>Contact</SectionLabel>
        <FieldRow label="Phone" value={client.phone} />
        <FieldRow label="Email" value={client.email} />
        <FieldRow label="Address" value={fullAddress || null} />
      </Card>

      <Card>
        <SectionLabel>Clinical</SectionLabel>
        <FieldRow label="Diagnosis" value={lastDx} />
        <FieldRow label="Started care" value={earliestSessionDate} />
      </Card>

      <Card>
        <SectionLabel>Insurance</SectionLabel>
        <FieldRow label="Carrier" value={client.insurance_carrier ?? 'Self-pay'} />
        <FieldRow label="Member ID" value={client.insurance_member_id} />
        <FieldRow label="Group" value={client.insurance_group_id} />
        <FieldRow label="Plan holder" value={client.insurance_plan_holder_name} />
      </Card>

      <Card>
        <SectionLabel>Emergency contact</SectionLabel>
        <FieldRow label="Name" value={client.emergency_name} />
        <FieldRow label="Phone" value={client.emergency_phone} />
        <FieldRow label="Relationship" value={client.emergency_relationship} />
      </Card>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-3.5 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-muted">
      {children}
    </h4>
  )
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div
      className="flex py-2 text-base"
      style={{ borderBottom: '0.5px solid var(--color-divider)' }}
    >
      <div className="w-[130px] shrink-0 text-muted">{label}</div>
      <div className="flex-1 text-ink">{value || <span className="text-faint">—</span>}</div>
    </div>
  )
}

/* ─── Sessions ──────────────────────────────────────────────────── */

function SessionsPanel({ clientId, sessions }: { clientId: string; sessions: Session[] }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const togglePaid = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: 0 | 1 }) => window.api.sessions.setPaid(id, paid),
    onSuccess: () => invalidateSessionDerivedQueries(qc)
  })

  const totalFee = sessions.reduce((s, x) => s + x.fee_cents, 0)
  const totalPaid = sessions.filter((s) => s.paid === 1).reduce((s, x) => s + x.fee_cents, 0)
  const balance = totalFee - totalPaid

  return (
    <div className="mx-auto max-w-[1100px]">
      <Card padding={0}>
        <div
          className="flex items-center px-[18px] py-3.5"
          style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
        >
          <div className="text-sm text-muted">
            {sessions.length} session{sessions.length === 1 ? '' : 's'} · Fees {fmtMoney(totalFee)} · Paid {fmtMoney(totalPaid)} ·{' '}
            <strong className={balance > 0 ? 'text-danger' : 'text-success'}>
              Balance {fmtMoney(balance)}
            </strong>
          </div>
          <div className="flex-1" />
          <Btn size="sm" icon="plus" onClick={() => navigate(`/clients/${clientId}/sessions/new`)}>
            Progress Note
          </Btn>
        </div>

        {sessions.length === 0 ? (
          <div className="px-5 py-10 text-center text-base text-muted">No sessions yet.</div>
        ) : (
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="bg-canvas-2">
                {['Date', 'Time', 'CPT', 'Fee', 'Paid', 'Signed', 'Note'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-muted"
                    style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const cpt = CPT_CODES.find((c) => c.code === s.cpt_code)
                const hasNote = noteHasContent(s.note_format, s.note_body)
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/clients/${clientId}/sessions/${s.id}`)}
                    className="cursor-pointer bg-surface hover:bg-canvas-2"
                    style={{ borderBottom: i < sessions.length - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
                  >
                    <td className="px-3 py-2.5 font-semibold text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {s.session_date}
                    </td>
                    <td className="px-3 py-2.5 text-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {s.start_time}–{s.end_time}
                    </td>
                    <td className="px-3 py-2.5 text-body">
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                        {s.cpt_code}
                      </span>
                      {cpt && <span className="ml-1.5 text-sm text-muted">{cpt.description}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(s.fee_cents)}
                    </td>
                    <td className="px-3 py-2.5">
                      <PaidToggle
                        paid={s.paid}
                        onToggle={() => togglePaid.mutate({ id: s.id, paid: s.paid === 1 ? 0 : 1 })}
                        pending={togglePaid.isPending}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      {s.signed_at ? (
                        <span
                          className="inline-flex items-center gap-1 text-sm font-semibold text-success"
                          title={`Signed by ${s.signed_by_name ?? '?'} on ${new Date(s.signed_at).toLocaleString()}`}
                        >
                          <Icon name="lock" size={12} /> Signed
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {hasNote ? (
                        <Icon name="check" size={15} className="text-success" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

/* ─── Billing (with Superbill folded in) ────────────────────────── */

function BillingPanel({ clientId, sessions }: { clientId: string; sessions: Session[] }) {
  const qc = useQueryClient()
  const unpaid = sessions
    .filter((s) => s.paid === 0)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
  const balance = unpaid.reduce((sum, s) => sum + s.fee_cents, 0)

  function markAllPaid() {
    if (unpaid.length === 0) return
    if (!confirm(`Mark all ${unpaid.length} unpaid session${unpaid.length === 1 ? '' : 's'} as paid?`)) return
    Promise.all(unpaid.map((s) => window.api.sessions.setPaid(s.id, 1))).then(() => {
      invalidateSessionDerivedQueries(qc)
    })
  }

  // Superbill date range — default to current month
  const [fromDate, setFromDate] = useState(practiceMonthStartString)
  const [toDate, setToDate] = useState(practiceDateString)
  const [sbStatus, setSbStatus] = useState<string | null>(null)

  const inRange = useMemo(
    () => sessions.filter((s) => s.session_date >= fromDate && s.session_date <= toDate),
    [sessions, fromDate, toDate]
  )
  const sbTotal = inRange.reduce((sum, s) => sum + s.fee_cents, 0)
  const sbPaid = inRange.filter((s) => s.paid === 1).reduce((sum, s) => sum + s.fee_cents, 0)

  const gen = useMutation({
    mutationFn: (args: SuperbillArgs) => window.api.superbill.generate(args),
    onSuccess: (result) => setSbStatus(result ? `Saved to ${result.path}` : 'Cancelled'),
    onError: (err) => setSbStatus(`Error: ${String(err)}`)
  })

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-4">
      {/* Outstanding balance hero */}
      <Card>
        <SectionLabel>Outstanding balance</SectionLabel>
        <div
          className={`text-[36px] font-semibold ${balance > 0 ? 'text-danger' : 'text-success'}`}
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.6px', marginTop: 6 }}
        >
          {fmtMoney(balance)}
        </div>
        <div className="mt-1 text-base text-muted">
          {balance > 0
            ? `${unpaid.length} unpaid session${unpaid.length === 1 ? '' : 's'}`
            : 'All caught up'}
        </div>
        <div className="mt-4 flex gap-2">
          <Btn variant="secondary" disabled={unpaid.length === 0} onClick={markAllPaid}>
            Mark all paid
          </Btn>
        </div>
      </Card>

      {/* Superbill — folded in from the old separate tab */}
      <Card padding={0}>
        <div
          className="flex items-center px-[18px] py-3.5"
          style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
        >
          <h4 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
            Generate superbill
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-4 px-[18px] py-4">
          <Field label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Field label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="px-[18px] pb-4 text-sm text-muted">
          <span className="font-semibold text-body">{inRange.length}</span> session{inRange.length === 1 ? '' : 's'} ·{' '}
          Total <span className="font-semibold text-body">{fmtMoney(sbTotal)}</span> ·{' '}
          Paid <span className="font-semibold text-body">{fmtMoney(sbPaid)}</span> ·{' '}
          Balance <span className="font-semibold text-body">{fmtMoney(sbTotal - sbPaid)}</span>
        </div>
        {sbStatus && (
          <div
            className={`px-[18px] pb-3 text-sm ${sbStatus.startsWith('Error') ? 'text-danger' : 'text-success'}`}
          >
            {sbStatus}
          </div>
        )}
        <div className="px-[18px] pb-4">
          <Btn
            icon="pdf"
            disabled={gen.isPending || inRange.length === 0}
            onClick={() => {
              setSbStatus(null)
              gen.mutate({ clientId, fromDate, toDate })
            }}
          >
            {gen.isPending ? 'Generating…' : 'Generate Superbill'}
          </Btn>
        </div>
      </Card>

      {/* Per-session unpaid list */}
      {unpaid.length > 0 && (
        <Card padding={0}>
          <div
            className="flex items-center px-[18px] py-3.5"
            style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
          >
            <h4 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
              Unpaid sessions
            </h4>
          </div>
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="bg-canvas-2">
                {['Date', 'CPT', 'Fee', ''].map((h, i) => (
                  <th
                    key={h || `col-${i}`}
                    className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-muted"
                    style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unpaid.map((s, i) => {
                const cpt = CPT_CODES.find((c) => c.code === s.cpt_code)
                return (
                  <tr
                    key={s.id}
                    style={{ borderBottom: i < unpaid.length - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/clients/${clientId}/sessions/${s.id}`}
                        className="font-semibold text-primary hover:text-primary-dark"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {s.session_date}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-body">
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                        {s.cpt_code}
                      </span>
                      {cpt && <span className="ml-1.5 text-sm text-muted">{cpt.description}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(s.fee_cents)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Btn
                        size="sm"
                        variant="secondary"
                        onClick={() => window.api.sessions.setPaid(s.id, 1).then(() => invalidateSessionDerivedQueries(qc))}
                      >
                        Mark paid
                      </Btn>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

/* ─── Documents ─────────────────────────────────────────────────── */

function DocumentsPanel({ clientId, docs }: { clientId: string; docs: ClientDocument[] }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [docType, setDocType] = useState<DocType>('consent')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  function resetForm() {
    setDocType('consent')
    setLabel('')
    setNotes('')
  }

  const upload = useMutation({
    mutationFn: () =>
      window.api.documents.upload({
        clientId,
        doc_type: docType,
        label: label.trim(),
        notes: notes.trim() || null
      }),
    onSuccess: (doc) => {
      if (doc) {
        setStatus(`Uploaded ${doc.label}`)
        resetForm()
        setShowForm(false)
        qc.invalidateQueries({ queryKey: ['documents', clientId] })
      } else {
        setStatus('Cancelled')
      }
    },
    onError: (err) => setStatus(`Error: ${String(err)}`)
  })

  const open = useMutation({
    mutationFn: (id: string) => window.api.documents.open(id),
    onSuccess: (r) => {
      if (!r.ok) setStatus(`Open failed: ${r.error ?? 'unknown error'}`)
    }
  })

  const download = useMutation({
    mutationFn: (id: string) => window.api.documents.download(id),
    onSuccess: (r) => setStatus(r ? `Saved to ${r.path}` : 'Cancelled')
  })

  const del = useMutation({
    mutationFn: (id: string) => window.api.documents.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', clientId] })
  })

  function handleDelete(doc: ClientDocument) {
    if (confirm(`Delete "${doc.label}"? The file will be removed from disk. This cannot be undone.`)) {
      del.mutate(doc.id)
    }
  }

  function handleUpload() {
    if (!label.trim()) {
      setStatus('Label is required')
      return
    }
    setStatus(null)
    upload.mutate()
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <Card padding={0}>
        <div
          className="flex items-center px-[18px] py-3.5"
          style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
        >
          <div className="text-sm text-muted">
            {docs.length} document{docs.length === 1 ? '' : 's'}
          </div>
          <div className="flex-1" />
          {!showForm && (
            <Btn size="sm" icon="paperclip" onClick={() => { setStatus(null); setShowForm(true) }}>
              Upload Document
            </Btn>
          )}
        </div>

        {showForm && (
          <div
            className="border-b bg-canvas-2 px-[18px] py-4"
            style={{ borderColor: 'var(--color-hairline)', borderBottomWidth: '0.5px' }}
          >
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-base font-medium text-body">Type</span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocType)}
                  className="mt-1 block w-full rounded-md bg-surface px-3 py-2 text-base text-ink outline-none focus:ring-1"
                  style={{ border: '0.5px solid var(--color-hairline)' }}
                >
                  {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((t) => (
                    <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Label"
                placeholder="e.g. Informed Consent (signed 2026-01-15)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
              <Field
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-2"
              />
            </div>
            <p className="mt-3 text-sm text-muted">
              Allowed: PDF, PNG, JPG, HEIC. The file is copied into your local app folder.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Btn onClick={handleUpload} disabled={upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Choose File & Upload'}
              </Btn>
              <Btn variant="secondary" onClick={() => { setShowForm(false); resetForm() }}>
                Cancel
              </Btn>
            </div>
          </div>
        )}

        {status && (
          <div
            className={`px-[18px] py-3 text-sm ${status.startsWith('Error') || status.startsWith('Open failed') ? 'text-danger' : 'text-muted'}`}
          >
            {status}
          </div>
        )}

        {docs.length === 0 && !showForm && (
          <div className="px-5 py-10 text-center text-base text-muted">
            No documents yet. Upload signed consents, ROI forms, or intake paperwork here.
          </div>
        )}

        {docs.length > 0 && (
          <div>
            {docs.map((d, i) => (
              <div
                key={d.id}
                className="flex items-center gap-3.5 px-[18px] py-3.5"
                style={{ borderBottom: i < docs.length - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
              >
                <div
                  className="flex h-11 w-9 shrink-0 items-center justify-center rounded bg-canvas-2"
                  style={{ border: '0.5px solid var(--color-hairline)' }}
                >
                  <Icon name="pdf" size={18} className="text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-ink">{d.label}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {d.original_filename ?? d.stored_filename}
                    {d.size_bytes != null && <> · {formatBytes(d.size_bytes)}</>}
                    <> · Uploaded {new Date(d.uploaded_at).toLocaleDateString()}</>
                  </div>
                  {d.notes && <div className="mt-0.5 text-sm text-muted">{d.notes}</div>}
                </div>
                <Pill tone="primary">{DOC_TYPE_LABELS[d.doc_type]}</Pill>
                <div className="flex items-center gap-1">
                  <Btn size="sm" variant="ghost" onClick={() => open.mutate(d.id)}>
                    Open
                  </Btn>
                  <Btn size="sm" variant="ghost" icon="download" onClick={() => download.mutate(d.id)}>
                    Download
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => handleDelete(d)}>
                    Delete
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p className="mt-3 text-sm text-muted">
        Documents are stored locally in your app data folder. The one-click backup includes the database only —
        back up the documents folder separately.
      </p>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/* ─── Info form (editable) ──────────────────────────────────────── */

function InfoForm({
  clientId,
  onDone
}: {
  clientId: string | undefined
  onDone: (() => void) | undefined
}) {
  const isNew = !clientId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const clientQuery = useQuery({
    queryKey: ['clients', clientId],
    queryFn: () => window.api.clients.get(clientId!),
    enabled: !isNew
  })
  const [form, setForm] = useState<ClientInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (clientQuery.data) setForm(clientQuery.data)
  }, [clientQuery.data])

  const save = useMutation({
    mutationFn: (input: ClientInput) => window.api.clients.upsert(input),
    onSuccess: (client) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.setQueryData(['clients', client.id], client)
      if (isNew) navigate(`/clients/${client.id}`)
      else if (onDone) onDone()
    }
  })

  const del = useMutation({
    mutationFn: (cid: string) => window.api.clients.delete(cid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      navigate('/clients')
    }
  })

  const permanentDel = useMutation({
    mutationFn: (args: { id: string; confirmation: string }) =>
      window.api.clients.permanentDelete(args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.removeQueries({ queryKey: ['clients', clientId] })
      navigate('/clients')
    }
  })

  function update<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function persistedFullName() {
    const first = clientQuery.data?.first_name ?? form.first_name
    const last = clientQuery.data?.last_name ?? form.last_name
    return `${first} ${last}`.replace(/\s+/g, ' ').trim()
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
    if (confirm(`Archive ${persistedFullName()}? They will be hidden from the client list.`))
      del.mutate(clientId)
  }

  function handlePermanentDelete() {
    if (!clientId) return
    const fullName = persistedFullName()
    const typed = prompt([
      `Permanently delete ${fullName}?`,
      '',
      'This removes the client, sessions, notes, amendments, billing records, and uploaded documents from this device.',
      'The audit log entry will remain.',
      '',
      `Type ${fullName} to confirm.`
    ].join('\n'))
    if (typed === null) return
    if (typed !== fullName) {
      alert('Permanent delete cancelled. The typed name did not match exactly.')
      return
    }
    if (!confirm(`Last chance: permanently delete ${fullName}? This cannot be undone.`)) return
    permanentDel.mutate({ id: clientId, confirmation: typed })
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

      {save.error && <p className="text-sm text-danger">Save failed: {String(save.error)}</p>}
      {permanentDel.error && (
        <p className="text-sm text-danger">Permanent delete failed: {String(permanentDel.error)}</p>
      )}

      <div className="flex items-center gap-3 pt-4" style={{ borderTop: '0.5px solid var(--color-hairline)' }}>
        <Btn type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Btn>
        <Btn
          type="button"
          variant="secondary"
          onClick={() => {
            if (isNew) navigate('/clients')
            else if (onDone) onDone()
          }}
        >
          Cancel
        </Btn>
        {!isNew && (
          <div className="ml-auto flex items-center gap-2">
            <Btn type="button" variant="danger" onClick={handleDelete} disabled={del.isPending}>
              {del.isPending ? 'Archiving...' : 'Archive'}
            </Btn>
            <Btn
              type="button"
              variant="danger"
              onClick={handlePermanentDelete}
              disabled={permanentDel.isPending}
            >
              {permanentDel.isPending ? 'Deleting...' : 'Delete forever'}
            </Btn>
          </div>
        )}
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset
      className="rounded-lg p-5"
      style={{ border: '0.5px solid var(--color-hairline)', background: 'var(--color-surface)' }}
    >
      <legend className="px-2 text-sm font-semibold uppercase tracking-[0.4px] text-muted">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
