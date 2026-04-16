import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ReportArgs } from '@shared/api-types'
import { Button } from '../components/Button'
import { Field } from '../components/Field'

function janFirst(): string {
  return `${new Date().getFullYear()}-01-01`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function Reports() {
  const [fromDate, setFromDate] = useState(janFirst)
  const [toDate, setToDate] = useState(todayStr)
  const [status, setStatus] = useState<string | null>(null)

  const pdfMut = useMutation({
    mutationFn: (args: ReportArgs) => window.api.reports.incomePdf(args),
    onSuccess: (r) => setStatus(r ? `Income report saved to ${r.path}` : 'Cancelled'),
    onError: (e) => setStatus(`Error: ${String(e)}`)
  })

  const csvMut = useMutation({
    mutationFn: (args: ReportArgs) => window.api.reports.csv(args),
    onSuccess: (r) => setStatus(r ? `CSV saved to ${r.path}` : 'Cancelled'),
    onError: (e) => setStatus(`Error: ${String(e)}`)
  })

  function handlePdf() {
    setStatus(null)
    pdfMut.mutate({ fromDate, toDate })
  }

  function handleCsv() {
    setStatus(null)
    csvMut.mutate({ fromDate, toDate })
  }

  const busy = pdfMut.isPending || csvMut.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold">Reports</h2>
        <p className="mt-1 text-slate-500">Generate income reports and session detail exports for tax or bookkeeping</p>
      </div>

      <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Date Range</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Field label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">Income Summary (PDF)</h3>
          <p className="mt-1 text-sm text-slate-500">
            Clinician header, per-client totals, CPT breakdown, grand totals. Good for your records or an accountant.
          </p>
          <div className="mt-4">
            <Button onClick={handlePdf} disabled={busy}>
              {pdfMut.isPending ? 'Generating…' : 'Generate PDF'}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">Session Detail (CSV)</h3>
          <p className="mt-1 text-sm text-slate-500">
            One row per session: date, client, CPT, ICD-10, fee, paid. Opens in Excel or Google Sheets.
          </p>
          <div className="mt-4">
            <Button onClick={handleCsv} disabled={busy}>
              {csvMut.isPending ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </div>

      {status && (
        <p className={`text-sm ${status.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
          {status}
        </p>
      )}
    </div>
  )
}
