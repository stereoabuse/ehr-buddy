import PDFDocument from 'pdfkit'
import { dialog, app } from 'electron'
import { createWriteStream } from 'fs'
import { join } from 'path'
import * as clinicianRepo from '../db/repos/clinician'
import * as clientsRepo from '../db/repos/clients'
import * as sessionsRepo from '../db/repos/sessions'
import type { Session, Client, Clinician } from '../../shared/types'
import { practiceUsDateString } from '../../shared/date'

const CPT_LABELS: Record<string, string> = {
  '90791': 'Psychiatric Diagnostic Evaluation',
  '90832': 'Individual Psychotherapy (30 min)',
  '90834': 'Individual Psychotherapy (45 min)',
  '90837': 'Individual Psychotherapy (60 min)',
  '90846': 'Family Therapy without Patient (50 min)',
  '90847': 'Family Therapy with Patient (50 min)',
  '90853': 'Group Psychotherapy'
}

interface SuperbillArgs {
  clientId: string
  fromDate: string
  toDate: string
}

export async function generateSuperbill(args: SuperbillArgs): Promise<string | null> {
  const clinician = clinicianRepo.get()
  const client = clientsRepo.get(args.clientId)
  if (!client) throw new Error('Client not found')
  if (!clinician) throw new Error('Clinician profile not set up')

  const sessions = sessionsRepo
    .listByClient(args.clientId)
    .filter((s) => s.session_date >= args.fromDate && s.session_date <= args.toDate)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))

  if (sessions.length === 0) throw new Error('No sessions in the selected date range')

  const defaultName = `superbill-${client.last_name}-${args.fromDate}-to-${args.toDate}.pdf`
  const result = await dialog.showSaveDialog({
    title: 'Save Superbill PDF',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })

  if (result.canceled || !result.filePath) return null

  await writePdf(result.filePath, clinician, client, sessions)
  console.log(`[superbill] saved to ${result.filePath}`)
  return result.filePath
}

function writePdf(
  filePath: string,
  clinician: Clinician,
  client: Client,
  sessions: Session[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const stream = createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.pipe(stream)

    const left = 50
    const pageWidth = 612
    const right = pageWidth - 50
    const usable = right - left

    let y = 50

    // ── Header ──────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11)
    doc.text(clinician.full_name + (clinician.credentials ? `, ${clinician.credentials}` : ''), left, y)
    y += 14

    doc.font('Helvetica').fontSize(9)
    if (clinician.practice_name) { doc.text(clinician.practice_name, left, y); y += 12 }
    if (clinician.address_line1) { doc.text(clinician.address_line1, left, y); y += 12 }
    if (clinician.address_line2) { doc.text(clinician.address_line2, left, y); y += 12 }
    const cityLine = [clinician.city, clinician.state, clinician.postal_code].filter(Boolean).join(', ')
    if (cityLine) { doc.text(cityLine, left, y); y += 12 }
    if (clinician.phone) { doc.text(clinician.phone, left, y); y += 12 }
    if (clinician.email) { doc.text(clinician.email, left, y); y += 12 }

    // Title top-right
    doc.font('Helvetica-Bold').fontSize(16)
    doc.text('Superbill', right - 120, 50, { width: 120, align: 'right' })
    doc.font('Helvetica').fontSize(9)
    doc.text(practiceUsDateString(), right - 120, 70, { width: 120, align: 'right' })

    y += 8
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke()
    y += 12

    // ── Client / Clinician credentials ──────────────────────────
    const credX = left + usable / 2 + 20

    doc.font('Helvetica-Bold').fontSize(11)
    doc.text(`${client.first_name} ${client.last_name}`, left, y)
    y += 16

    const infoStartY = y
    doc.font('Helvetica').fontSize(9)

    // Left column — client info
    if (client.dob) { doc.text(`Client DOB: ${client.dob}`, left, y); y += 12 }
    if (client.phone) { doc.text(`Client Phone: ${client.phone}`, left, y); y += 12 }

    // Collect unique diagnosis codes
    const dxCodes = [...new Set(
      sessions
        .map((s) => s.icd10_codes)
        .filter(Boolean)
        .flatMap((codes) => codes!.split(',').map((c) => c.trim()))
    )]
    if (dxCodes.length > 0) {
      doc.text(`Diagnosis Code(s): ${dxCodes.join(', ')}`, left, y)
      y += 12
    }

    // Right column — clinician credentials
    let cy = infoStartY
    doc.text(`Clinician: ${clinician.full_name}${clinician.credentials ? ', ' + clinician.credentials : ''}`, credX, cy, { width: right - credX, align: 'right' })
    cy += 12
    if (clinician.tax_id) {
      doc.text(`Practice EIN: ${clinician.tax_id}`, credX, cy, { width: right - credX, align: 'right' })
      cy += 12
    }
    if (clinician.npi) {
      doc.text(`Practice NPI: ${clinician.npi}`, credX, cy, { width: right - credX, align: 'right' })
      cy += 12
    }
    if (clinician.license_number) {
      doc.text(`License No.: ${clinician.license_number}`, credX, cy, { width: right - credX, align: 'right' })
      cy += 12
    }

    y = Math.max(y, cy) + 10
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke()
    y += 8

    // ── Service table ───────────────────────────────────────────
    const cols = {
      date: { x: left, w: 72 },
      desc: { x: left + 72, w: 210 },
      dx:   { x: left + 282, w: 72 },
      fee:  { x: left + 354, w: 80 },
      paid: { x: left + 434, w: usable - 434 + left }
    }

    // Header row
    doc.font('Helvetica-Bold').fontSize(8)
    const headerY = y
    drawCell(doc, 'Service Date', cols.date.x, headerY, cols.date.w)
    drawCell(doc, 'Service Description', cols.desc.x, headerY, cols.desc.w)
    drawCell(doc, 'Dx Code', cols.dx.x, headerY, cols.dx.w)
    drawCell(doc, 'Fee', cols.fee.x, headerY, cols.fee.w)
    drawCell(doc, 'Paid', cols.paid.x, headerY, cols.paid.w)
    y = headerY + 16

    // Header underline
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke()
    y += 4

    // Data rows
    doc.font('Helvetica').fontSize(8)
    let totalFee = 0
    let totalPaid = 0

    for (const s of sessions) {
      // Check for page break
      if (y > 700) {
        doc.addPage()
        y = 50
      }

      const cptLabel = CPT_LABELS[s.cpt_code] ?? s.cpt_code
      const desc = `${cptLabel} (${s.cpt_code}) — $${(s.fee_cents / 100).toFixed(2)}`
      const fee = `$${(s.fee_cents / 100).toFixed(2)}`
      const paid = s.paid === 1 ? fee : '$0.00'
      const dx = s.icd10_codes ?? ''

      totalFee += s.fee_cents
      if (s.paid === 1) totalPaid += s.fee_cents

      drawCell(doc, s.session_date, cols.date.x, y, cols.date.w)
      drawCell(doc, desc, cols.desc.x, y, cols.desc.w)
      drawCell(doc, dx, cols.dx.x, y, cols.dx.w)
      drawCell(doc, fee, cols.fee.x, y, cols.fee.w)
      drawCell(doc, paid, cols.paid.x, y, cols.paid.w)
      y += 14

      // Thin separator
      doc.moveTo(left, y).lineTo(right, y).lineWidth(0.25).strokeColor('#cccccc').stroke()
      doc.strokeColor('#000000')
      y += 4
    }

    // ── Totals ──────────────────────────────────────────────────
    y += 4
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor('#000000').stroke()
    y += 8

    doc.font('Helvetica-Bold').fontSize(9)
    const totX = cols.fee.x - 80
    doc.text('Total Fees:', totX, y, { width: 80, align: 'right' })
    doc.text(`$${(totalFee / 100).toFixed(2)}`, cols.fee.x, y, { width: cols.fee.w })
    y += 14
    doc.text('Total Paid:', totX, y, { width: 80, align: 'right' })
    doc.text(`$${(totalPaid / 100).toFixed(2)}`, cols.fee.x, y, { width: cols.fee.w })
    y += 14

    const balance = totalFee - totalPaid
    doc.text('Balance Due:', totX, y, { width: 80, align: 'right' })
    doc.text(`$${(balance / 100).toFixed(2)}`, cols.fee.x, y, { width: cols.fee.w })
    y += 24

    // ── Disclaimer ──────────────────────────────────────────────
    doc.font('Helvetica').fontSize(7.5).fillColor('#666666')
    doc.text(
      'This document is not a claim form. It is provided for the client\'s personal records ' +
        'and/or for submission to their insurance company for possible reimbursement.',
      left,
      y,
      { width: usable, align: 'center' }
    )

    doc.end()
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawCell(doc: any, text: string, x: number, y: number, w: number): void {
  doc.text(text, x + 2, y, { width: w - 4 })
}
