import PDFDocument from 'pdfkit'
import { dialog, app } from 'electron'
import { createWriteStream } from 'fs'
import { join } from 'path'
import * as clinicianRepo from '../db/repos/clinician'
import * as sessionsRepo from '../db/repos/sessions'
import { practiceUsDateString } from '../../shared/date'
import { recordSessionOutput } from '../session-outputs'

const CPT_LABELS: Record<string, string> = {
  '90791': 'Psychiatric Diagnostic Evaluation',
  '90832': 'Individual Psychotherapy (30 min)',
  '90834': 'Individual Psychotherapy (45 min)',
  '90837': 'Individual Psychotherapy (60 min)',
  '90846': 'Family Therapy without Patient (50 min)',
  '90847': 'Family Therapy with Patient (50 min)',
  '90853': 'Group Psychotherapy'
}

interface ReportArgs {
  fromDate: string
  toDate: string
  includeArchived?: boolean
}

export async function generateTaxReport(args: ReportArgs): Promise<string | null> {
  const clinician = clinicianRepo.get()
  if (!clinician) throw new Error('Clinician profile not set up')

  const sessions = sessionsRepo.allInRange(args.fromDate, args.toDate, args.includeArchived ?? false)
  if (sessions.length === 0) throw new Error('No sessions in the selected date range')

  const defaultName = `income-report-${args.fromDate}-to-${args.toDate}.pdf`
  const result = await dialog.showSaveDialog({
    title: 'Save Income Report PDF',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (result.canceled || !result.filePath) return null

  await writePdf(result.filePath, clinician, sessions, args)
  console.log(`[tax-report] saved to ${result.filePath}`)
  recordSessionOutput(result.filePath)
  return result.filePath
}

function writePdf(
  filePath: string,
  clinician: any,
  sessions: any[],
  args: ReportArgs
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const stream = createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.pipe(stream)

    const L = 50
    const R = 562
    const W = R - L
    let y = 50

    // ── Header ──────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(16)
    doc.text('Income Report', L, y, { width: W, align: 'center' })
    y += 24

    doc.font('Helvetica').fontSize(10)
    doc.text(
      `${clinician.full_name}${clinician.credentials ? ', ' + clinician.credentials : ''}`,
      L, y, { width: W, align: 'center' }
    )
    y += 14

    const details = [
      clinician.tax_id ? `EIN: ${clinician.tax_id}` : null,
      clinician.npi ? `NPI: ${clinician.npi}` : null,
      clinician.license_number ? `License: ${clinician.license_number}` : null
    ].filter(Boolean).join('  ·  ')
    if (details) {
      doc.fontSize(9).text(details, L, y, { width: W, align: 'center' })
      y += 14
    }

    doc.fontSize(9).text(`Period: ${args.fromDate} to ${args.toDate}`, L, y, { width: W, align: 'center' })
    y += 14

    doc.fontSize(9).text(
      args.includeArchived ? 'Scope: all clients, including archived' : 'Scope: active clients only',
      L, y, { width: W, align: 'center' }
    )
    y += 20

    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).stroke()
    y += 16

    // ── Per-client summary ──────────────────────
    doc.font('Helvetica-Bold').fontSize(11)
    doc.text('Summary by Client', L, y)
    y += 16

    // aggregate
    const byClient = new Map<string, { name: string; count: number; fees: number; paid: number }>()
    for (const s of sessions) {
      const key = s.client_id
      const existing = byClient.get(key)
      const paidAmt = s.paid === 1 ? s.fee_cents : 0
      if (existing) {
        existing.count++
        existing.fees += s.fee_cents
        existing.paid += paidAmt
      } else {
        byClient.set(key, {
          name: `${s.client_first_name} ${s.client_last_name}`,
          count: 1,
          fees: s.fee_cents,
          paid: paidAmt
        })
      }
    }

    // table header
    const clientCols = [
      { label: 'Client', x: L, w: 180 },
      { label: 'Sessions', x: L + 180, w: 70 },
      { label: 'Total Fees', x: L + 250, w: 90 },
      { label: 'Total Paid', x: L + 340, w: 90 },
      { label: 'Balance', x: L + 430, w: W - 430 }
    ]

    doc.font('Helvetica-Bold').fontSize(8)
    for (const col of clientCols) doc.text(col.label, col.x + 2, y, { width: col.w - 4 })
    y += 14
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).stroke()
    y += 4

    let grandFees = 0, grandPaid = 0, grandCount = 0
    doc.font('Helvetica').fontSize(8)
    for (const c of byClient.values()) {
      doc.text(c.name, clientCols[0].x + 2, y, { width: clientCols[0].w - 4 })
      doc.text(String(c.count), clientCols[1].x + 2, y, { width: clientCols[1].w - 4 })
      doc.text(`$${(c.fees / 100).toFixed(2)}`, clientCols[2].x + 2, y, { width: clientCols[2].w - 4 })
      doc.text(`$${(c.paid / 100).toFixed(2)}`, clientCols[3].x + 2, y, { width: clientCols[3].w - 4 })
      doc.text(`$${((c.fees - c.paid) / 100).toFixed(2)}`, clientCols[4].x + 2, y, { width: clientCols[4].w - 4 })
      y += 14
      grandFees += c.fees
      grandPaid += c.paid
      grandCount += c.count
    }

    y += 2
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).stroke()
    y += 4
    doc.font('Helvetica-Bold').fontSize(8)
    doc.text('TOTAL', clientCols[0].x + 2, y, { width: clientCols[0].w - 4 })
    doc.text(String(grandCount), clientCols[1].x + 2, y, { width: clientCols[1].w - 4 })
    doc.text(`$${(grandFees / 100).toFixed(2)}`, clientCols[2].x + 2, y, { width: clientCols[2].w - 4 })
    doc.text(`$${(grandPaid / 100).toFixed(2)}`, clientCols[3].x + 2, y, { width: clientCols[3].w - 4 })
    doc.text(`$${((grandFees - grandPaid) / 100).toFixed(2)}`, clientCols[4].x + 2, y, { width: clientCols[4].w - 4 })
    y += 30

    // ── CPT breakdown ───────────────────────────
    doc.font('Helvetica-Bold').fontSize(11)
    doc.text('Breakdown by Service Type', L, y)
    y += 16

    const byCpt = new Map<string, { count: number; revenue: number }>()
    for (const s of sessions) {
      const existing = byCpt.get(s.cpt_code)
      if (existing) {
        existing.count++
        existing.revenue += s.fee_cents
      } else {
        byCpt.set(s.cpt_code, { count: 1, revenue: s.fee_cents })
      }
    }

    const cptCols = [
      { label: 'CPT', x: L, w: 60 },
      { label: 'Description', x: L + 60, w: 250 },
      { label: 'Sessions', x: L + 310, w: 70 },
      { label: 'Revenue', x: L + 380, w: W - 380 }
    ]

    doc.font('Helvetica-Bold').fontSize(8)
    for (const col of cptCols) doc.text(col.label, col.x + 2, y, { width: col.w - 4 })
    y += 14
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).stroke()
    y += 4

    doc.font('Helvetica').fontSize(8)
    for (const [code, data] of byCpt) {
      doc.text(code, cptCols[0].x + 2, y, { width: cptCols[0].w - 4 })
      doc.text(CPT_LABELS[code] ?? code, cptCols[1].x + 2, y, { width: cptCols[1].w - 4 })
      doc.text(String(data.count), cptCols[2].x + 2, y, { width: cptCols[2].w - 4 })
      doc.text(`$${(data.revenue / 100).toFixed(2)}`, cptCols[3].x + 2, y, { width: cptCols[3].w - 4 })
      y += 14
    }

    y += 10
    doc.font('Helvetica').fontSize(7.5).fillColor('#666666')
    doc.text(
      `Generated by EHR Buddy on ${practiceUsDateString()}`,
      L, y, { width: W, align: 'center' }
    )

    doc.end()
  })
}
