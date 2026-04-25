import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClinicianInput } from '@shared/types'
import { CPT_CODES } from '@shared/cpt-codes'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinician'] })
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
    const default_fees: Record<string, number> = {}
    for (const [cpt, str] of Object.entries(feeStrings)) {
      const d = parseFloat(str)
      if (!isNaN(d) && d > 0) default_fees[cpt] = Math.round(d * 100)
    }
    save.mutate({ ...form, default_fees })
  }

  if (clinicianQuery.isLoading) {
    return <div className="px-7 py-10 text-center text-base text-muted">Loading…</div>
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          Clinician profile
        </h2>
        <p className="mt-1 text-base text-muted">Your identity and default session fees.</p>
      </div>

      <div className="flex flex-col gap-4">
        <Section title="Identity">
          <Field label="Full name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} error={errors.full_name} required />
          <Field label="Credentials" placeholder="e.g., LCSW, PhD" value={form.credentials ?? ''} onChange={(e) => update('credentials', e.target.value || null)} />
          <Field label="NPI" value={form.npi ?? ''} onChange={(e) => update('npi', e.target.value || null)} />
          <Field label="License number" value={form.license_number ?? ''} onChange={(e) => update('license_number', e.target.value || null)} />
          <Field label="Tax ID" placeholder="EIN recommended" value={form.tax_id ?? ''} onChange={(e) => update('tax_id', e.target.value || null)} />
          <Field label="Practice name" value={form.practice_name ?? ''} onChange={(e) => update('practice_name', e.target.value || null)} />
        </Section>

        <Section title="Contact">
          <Field label="Address line 1" value={form.address_line1 ?? ''} onChange={(e) => update('address_line1', e.target.value || null)} className="col-span-2" />
          <Field label="Address line 2" value={form.address_line2 ?? ''} onChange={(e) => update('address_line2', e.target.value || null)} className="col-span-2" />
          <Field label="City" value={form.city ?? ''} onChange={(e) => update('city', e.target.value || null)} />
          <Field label="State" value={form.state ?? ''} onChange={(e) => update('state', e.target.value || null)} />
          <Field label="Postal code" value={form.postal_code ?? ''} onChange={(e) => update('postal_code', e.target.value || null)} />
          <Field label="Phone" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value || null)} />
          <Field label="Email" type="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value || null)} className="col-span-2" />
        </Section>

        <Card padding={0}>
          <div
            className="px-[18px] py-3.5"
            style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
          >
            <h3 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
              Default fees
            </h3>
            <p className="mt-1 text-sm text-muted">
              These prefill in new sessions. Per-session overrides are allowed.
            </p>
          </div>
          <div>
            {CPT_CODES.map((cpt, i, arr) => (
              <div
                key={cpt.code}
                className="flex items-center gap-4 px-[18px] py-3"
                style={{ borderBottom: i < arr.length - 1 ? '0.5px solid var(--color-divider)' : 'none' }}
              >
                <div className="flex-1">
                  <div
                    className="text-sm font-semibold text-ink"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  >
                    {cpt.code}
                  </div>
                  <div className="text-sm text-muted">{cpt.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base text-muted">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={feeStrings[cpt.code] ?? ''}
                    onChange={(e) =>
                      setFeeStrings((prev) => ({ ...prev, [cpt.code]: e.target.value }))
                    }
                    className="h-9 w-28 rounded-md px-3 text-right text-base text-ink outline-none"
                    style={{ border: '0.5px solid var(--color-hairline)', background: 'var(--color-surface)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {save.error && <p className="mt-4 text-sm text-danger">Save failed: {String(save.error)}</p>}
      {save.isSuccess && <p className="mt-4 text-sm text-success">Saved.</p>}

      <div
        className="mt-6 flex items-center gap-3 pt-4"
        style={{ borderTop: '0.5px solid var(--color-hairline)' }}
      >
        <Btn type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Btn>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding={0}>
      <div
        className="px-[18px] py-3.5"
        style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
      >
        <h3 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4 px-[18px] py-4">{children}</div>
    </Card>
  )
}
