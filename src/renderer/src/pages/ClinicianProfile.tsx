import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClinicianInput } from '@shared/types'
import { CPT_CODES } from '@shared/cpt-codes'
import { Button } from '../components/Button'
import { Field } from '../components/Field'

const EMPTY: ClinicianInput = {
  full_name: '',
  credentials: null,
  npi: null,
  license_number: null,
  tax_id: null,
  practice_name: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  phone: null,
  email: null,
  default_fees: {}
}

export default function ClinicianProfile() {
  const qc = useQueryClient()
  const clinicianQuery = useQuery({
    queryKey: ['clinician'],
    queryFn: () => window.api.clinician.get()
  })

  const [form, setForm] = useState<ClinicianInput>(EMPTY)
  const [feeStrings, setFeeStrings] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (clinicianQuery.data) {
      const c = clinicianQuery.data
      const feeCents: Record<string, number> = c.default_fees_json
        ? JSON.parse(c.default_fees_json)
        : {}
      const strings: Record<string, string> = {}
      for (const [cpt, cents] of Object.entries(feeCents)) {
        strings[cpt] = (cents / 100).toString()
      }
      setFeeStrings(strings)
      setForm({
        full_name: c.full_name,
        credentials: c.credentials,
        npi: c.npi,
        license_number: c.license_number,
        tax_id: c.tax_id,
        practice_name: c.practice_name,
        address_line1: c.address_line1,
        address_line2: c.address_line2,
        city: c.city,
        state: c.state,
        postal_code: c.postal_code,
        phone: c.phone,
        email: c.email,
        default_fees: feeCents
      })
    }
  }, [clinicianQuery.data])

  const save = useMutation({
    mutationFn: (input: ClinicianInput) => window.api.clinician.upsert(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinician'] })
    }
  })

  function update<K extends keyof ClinicianInput>(key: K, value: ClinicianInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      setErrors({ full_name: 'Required' })
      return
    }
    setErrors({})
    // Convert fee strings to cents on save
    const default_fees: Record<string, number> = {}
    for (const [cpt, str] of Object.entries(feeStrings)) {
      const d = parseFloat(str)
      if (!isNaN(d) && d > 0) default_fees[cpt] = Math.round(d * 100)
    }
    save.mutate({ ...form, default_fees })
  }

  if (clinicianQuery.isLoading) return <p className="text-slate-500">Loading…</p>

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold">Clinician Profile</h2>
        <p className="mt-1 text-slate-500">Your identity and default session fees</p>
      </div>

      <Section title="Identity">
        <Field label="Full name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} error={errors.full_name} required />
        <Field label="Credentials" placeholder="e.g., LCSW, PhD" value={form.credentials ?? ''} onChange={(e) => update('credentials', e.target.value || null)} />
        <Field label="NPI" value={form.npi ?? ''} onChange={(e) => update('npi', e.target.value || null)} />
        <Field label="License number" value={form.license_number ?? ''} onChange={(e) => update('license_number', e.target.value || null)} />
        <Field label="Tax ID" placeholder="EIN recommended" value={form.tax_id ?? ''} onChange={(e) => update('tax_id', e.target.value || null)} />
        <Field label="Practice name" value={form.practice_name ?? ''} onChange={(e) => update('practice_name', e.target.value || null)} />
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

      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Default Fees</legend>
        <p className="mb-4 text-sm text-slate-500">
          These prefill in new sessions. Per-session overrides are allowed.
        </p>
        <div className="divide-y divide-slate-100">
          {CPT_CODES.map((cpt) => (
              <div key={cpt.code} className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <div className="font-mono text-sm font-semibold">{cpt.code}</div>
                  <div className="text-sm text-slate-600">{cpt.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={feeStrings[cpt.code] ?? ''}
                    onChange={(e) =>
                      setFeeStrings((prev) => ({ ...prev, [cpt.code]: e.target.value }))
                    }
                    className="w-28 rounded-md border border-slate-300 px-3 py-2 text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
          ))}
        </div>
      </fieldset>

      {save.error && <p className="text-red-600">Save failed: {String(save.error)}</p>}
      {save.isSuccess && <p className="text-green-700">Saved.</p>}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
      <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
