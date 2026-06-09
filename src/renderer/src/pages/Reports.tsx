import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ReportArgs } from '@shared/api-types'
import { practiceDateString, practiceYearStartString } from '@shared/date'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { Field } from '../components/Field'

export default function Reports() {
  const [fromDate, setFromDate] = useState(practiceYearStartString)
  const [toDate, setToDate] = useState(practiceDateString)
  const [includeArchived, setIncludeArchived] = useState(false)
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

  const busy = pdfMut.isPending || csvMut.isPending
  const isError = status?.startsWith('Error') ?? false

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          Reports
        </h2>
        <p className="mt-1 text-base text-muted">
          Generate income reports and session detail exports for tax or bookkeeping.
        </p>
      </div>

      <Card padding={0}>
        <div
          className="px-[18px] py-3.5"
          style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
        >
          <h3 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
            Date range
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 px-[18px] py-4">
          <Field label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Field label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="px-[18px] pb-4">
          <label className="flex cursor-pointer items-center gap-2 text-base text-body">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Include sessions for archived clients
          </label>
          <p className="mt-1.5 mb-0 text-sm text-muted">
            Off by default. Turn this on for tax or year-end reports so income from clients archived
            mid-year is still counted.
          </p>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card>
          <h3 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
            Income summary (PDF)
          </h3>
          <p className="mt-1 text-sm text-muted">
            Clinician header, per-client totals, CPT breakdown, grand totals. For your records or an accountant.
          </p>
          <div className="mt-4">
            <Btn
              icon="pdf"
              onClick={() => { setStatus(null); pdfMut.mutate({ fromDate, toDate, includeArchived }) }}
              disabled={busy}
            >
              {pdfMut.isPending ? 'Generating…' : 'Generate PDF'}
            </Btn>
          </div>
        </Card>

        <Card>
          <h3 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
            Session detail (CSV)
          </h3>
          <p className="mt-1 text-sm text-muted">
            One row per session: date, client, CPT, ICD-10, fee, paid. Opens in Excel or Google Sheets.
          </p>
          <div className="mt-4">
            <Btn
              icon="download"
              variant="secondary"
              onClick={() => { setStatus(null); csvMut.mutate({ fromDate, toDate, includeArchived }) }}
              disabled={busy}
            >
              {csvMut.isPending ? 'Exporting…' : 'Export CSV'}
            </Btn>
          </div>
        </Card>
      </div>

      {status && (
        <p className={`mt-4 text-sm ${isError ? 'text-danger' : 'text-success'}`}>
          {status}
        </p>
      )}
    </div>
  )
}
