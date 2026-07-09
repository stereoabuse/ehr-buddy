import PDFDocument from 'pdfkit'
import { dialog, app } from 'electron'
import { createWriteStream } from 'fs'
import { join } from 'path'
import * as clinicianRepo from '../db/repos/clinician'
import * as clientsRepo from '../db/repos/clients'
import * as sessionsRepo from '../db/repos/sessions'
import type { Session, SessionAmendment, Client, Clinician } from '../../shared/types'
import { CPT_CODES } from '../../shared/cpt-codes'
import {
  parseStructuredNote,
  OBSERVATION_LABELS,
  RISK_FACTOR_OPTIONS,
  INTERVENTION_OPTIONS,
  RECOMMENDATION_OPTIONS,
  type StructuredNote,
  type StructuredObservations
} from '../../shared/structured-note'
import { recordSessionOutput } from '../session-outputs'

interface NotePdfArgs {
  sessionId: string
}

const PAGE_TOP = 50
const PAGE_BOTTOM = 740
const LEFT = 50
const PAGE_WIDTH = 612
const RIGHT = PAGE_WIDTH - 50
const USABLE = RIGHT - LEFT

const CPT_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  CPT_CODES.map((c) => [c.code, c.description])
)

export async function generateNotePdf(args: NotePdfArgs): Promise<string | null> {
  const session = sessionsRepo.get(args.sessionId)
  if (!session) throw new Error('Session not found')
  if (!session.signed_at) throw new Error('Only signed notes can be exported.')

  const client = clientsRepo.get(session.client_id)
  if (!client) throw new Error('Client not found')

  const clinician = clinicianRepo.get()
  if (!clinician) throw new Error('Clinician profile not set up')

  const amendments = sessionsRepo.listAmendments(session.id)

  const defaultName = `note-${client.last_name}-${session.session_date}.pdf`
  const result = await dialog.showSaveDialog({
    title: 'Export Progress Note',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })

  if (result.canceled || !result.filePath) return null

  await writePdf(result.filePath, clinician, client, session, amendments)
  console.log(`[note-pdf] saved to ${result.filePath}`)
  recordSessionOutput(result.filePath)
  return result.filePath
}

function writePdf(
  filePath: string,
  clinician: Clinician,
  client: Client,
  session: Session,
  amendments: SessionAmendment[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const stream = createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.pipe(stream)

    const ctx: RenderCtx = { doc, y: PAGE_TOP }

    renderHeader(ctx, clinician)
    renderSessionInfo(ctx, client, session)
    renderNoteBody(ctx, session)
    renderSignatureBlock(ctx, clinician, {
      name: session.signed_by_name,
      credentials: session.signed_by_credentials,
      signedAt: session.signed_at!
    })

    for (let i = 0; i < amendments.length; i += 1) {
      renderAmendment(ctx, clinician, amendments[i], i + 1)
    }

    doc.end()
  })
}

type PDFDoc = InstanceType<typeof PDFDocument>

interface RenderCtx {
  doc: PDFDoc
  y: number
}

function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y + needed > PAGE_BOTTOM) {
    ctx.doc.addPage()
    ctx.y = PAGE_TOP
  }
}

function renderHeader(ctx: RenderCtx, clinician: Clinician): void {
  const { doc } = ctx
  doc.font('Helvetica-Bold').fontSize(11)
  doc.text(
    clinician.full_name + (clinician.credentials ? `, ${clinician.credentials}` : ''),
    LEFT,
    ctx.y
  )
  ctx.y += 14

  doc.font('Helvetica').fontSize(9)
  if (clinician.practice_name) { doc.text(clinician.practice_name, LEFT, ctx.y); ctx.y += 12 }
  if (clinician.address_line1) { doc.text(clinician.address_line1, LEFT, ctx.y); ctx.y += 12 }
  if (clinician.address_line2) { doc.text(clinician.address_line2, LEFT, ctx.y); ctx.y += 12 }
  const cityLine = [clinician.city, clinician.state, clinician.postal_code].filter(Boolean).join(', ')
  if (cityLine) { doc.text(cityLine, LEFT, ctx.y); ctx.y += 12 }
  if (clinician.phone) { doc.text(clinician.phone, LEFT, ctx.y); ctx.y += 12 }
  if (clinician.email) { doc.text(clinician.email, LEFT, ctx.y); ctx.y += 12 }

  // Title top-right
  doc.font('Helvetica-Bold').fontSize(16)
  doc.text('Progress Note', RIGHT - 160, PAGE_TOP, { width: 160, align: 'right' })

  ctx.y += 8
  doc.moveTo(LEFT, ctx.y).lineTo(RIGHT, ctx.y).lineWidth(0.5).stroke()
  ctx.y += 14
}

function renderSessionInfo(ctx: RenderCtx, client: Client, session: Session): void {
  const { doc } = ctx
  doc.font('Helvetica-Bold').fontSize(11)
  doc.text(`${client.first_name} ${client.last_name}`, LEFT, ctx.y)
  ctx.y += 16

  doc.font('Helvetica').fontSize(9)
  if (client.dob) {
    doc.text(`DOB: ${client.dob}`, LEFT, ctx.y)
    ctx.y += 12
  }

  const dateLine = formatSessionDateTime(session)
  doc.text(`Session: ${dateLine}`, LEFT, ctx.y)
  ctx.y += 12

  const cptDesc = CPT_DESCRIPTIONS[session.cpt_code] ?? session.cpt_code
  doc.text(`CPT: ${session.cpt_code} — ${cptDesc}`, LEFT, ctx.y)
  ctx.y += 12

  if (session.icd10_codes) {
    doc.text(`Diagnosis: ${session.icd10_codes}`, LEFT, ctx.y)
    ctx.y += 12
  }

  ctx.y += 4
  doc.moveTo(LEFT, ctx.y).lineTo(RIGHT, ctx.y).lineWidth(0.5).stroke()
  ctx.y += 14
}

function renderNoteBody(ctx: RenderCtx, session: Session): void {
  if (session.note_format === 'STRUCTURED') {
    renderStructuredNote(ctx, parseStructuredNote(session.note_body))
  } else {
    renderSection(ctx, 'Note', session.note_body ?? '')
  }
}

function renderStructuredNote(ctx: RenderCtx, note: StructuredNote): void {
  if (note.overall_notes.trim()) {
    renderSection(ctx, 'Overall Notes', note.overall_notes)
  }

  const observationLines = observationLines_(note.observations)
  if (observationLines.length > 0) {
    renderSection(ctx, 'Observations', observationLines.join('\n'))
  }

  const riskLine = riskFactorLine_(note.risk_factors, note.risk_factors_other)
  if (riskLine) renderSection(ctx, 'Risk Factors', riskLine)

  if (note.medications.trim()) renderSection(ctx, 'Medications', note.medications)
  if (note.current_functioning.trim()) renderSection(ctx, 'Current Functioning', note.current_functioning)
  if (note.content_discussed.trim()) renderSection(ctx, 'Content Discussed', note.content_discussed)

  const interventionLine = interventionsLine_(note.interventions, note.interventions_other)
  if (interventionLine) renderSection(ctx, 'Interventions', interventionLine)

  const tpLines = treatmentPlanLines_(note.treatment_plan)
  if (tpLines.length > 0) renderSection(ctx, 'Treatment Plan', tpLines.join('\n'))

  if (note.plan.trim()) renderSection(ctx, 'Plan', note.plan)

  if (note.recommendation) {
    const label = RECOMMENDATION_OPTIONS.find((r) => r.id === note.recommendation)?.label
    if (label) renderSection(ctx, 'Recommendation', label)
  }
}

function observationLines_(obs: StructuredObservations): string[] {
  const out: string[] = []
  const keys: (keyof StructuredObservations)[] = [
    'cognitive_functioning',
    'affect',
    'mood',
    'interpersonal',
    'functional_status'
  ]
  for (const k of keys) {
    const v = obs[k]?.trim()
    if (v) out.push(`${OBSERVATION_LABELS[k]}: ${v}`)
  }
  return out
}

function riskFactorLine_(ids: string[], other: string): string {
  if (ids.length === 0) return ''
  const labels = ids
    .map((id) => {
      const opt = RISK_FACTOR_OPTIONS.find((o) => o.id === id)
      if (!opt) return id
      if (opt.id === 'other' && other.trim()) return `Other: ${other.trim()}`
      return opt.label
    })
    .filter(Boolean)
  return labels.join(', ')
}

function interventionsLine_(ids: string[], other: string): string {
  if (ids.length === 0) return ''
  const labels = ids
    .map((id) => {
      const opt = INTERVENTION_OPTIONS.find((o) => o.id === id)
      if (!opt) return id
      if (opt.id === 'other' && other.trim()) return `Other: ${other.trim()}`
      return opt.label
    })
    .filter(Boolean)
  return labels.join(', ')
}

function treatmentPlanLines_(
  tp: { objective_1: string; objective_2: string; additional_notes: string }
): string[] {
  const out: string[] = []
  if (tp.objective_1.trim()) out.push(`Objective 1: ${tp.objective_1.trim()}`)
  if (tp.objective_2.trim()) out.push(`Objective 2: ${tp.objective_2.trim()}`)
  if (tp.additional_notes.trim()) out.push(`Additional Notes: ${tp.additional_notes.trim()}`)
  return out
}

function renderSection(ctx: RenderCtx, title: string, body: string): void {
  ensureSpace(ctx, 40)
  const { doc } = ctx

  doc.font('Helvetica-Bold').fontSize(10)
  doc.text(title, LEFT, ctx.y, { width: USABLE })
  ctx.y = doc.y + 2

  doc.font('Helvetica').fontSize(10)
  doc.text(body, LEFT, ctx.y, { width: USABLE })
  ctx.y = doc.y + 10
}

interface SignatureLines {
  name: string | null
  credentials: string | null
  signedAt: string
}

function renderSignatureBlock(ctx: RenderCtx, clinician: Clinician, sig: SignatureLines): void {
  // Approx height: optional image (60) + 4 text lines (~14 each) + padding
  ensureSpace(ctx, 130)
  const { doc } = ctx

  ctx.y += 6
  doc.font('Helvetica-Bold').fontSize(9).text('Signed by:', LEFT, ctx.y)
  ctx.y += 14

  if (clinician.signature_image_base64) {
    try {
      const buf = Buffer.from(clinician.signature_image_base64, 'base64')
      doc.image(buf, LEFT, ctx.y, { fit: [180, 60] })
      ctx.y += 64
    } catch (err) {
      console.warn('[note-pdf] failed to render signature image, falling back to text-only', err)
    }
  }

  doc.font('Helvetica').fontSize(10)
  const nameLine = [sig.name ?? '', sig.credentials ? `, ${sig.credentials}` : ''].join('')
  if (nameLine.trim()) {
    doc.text(nameLine, LEFT, ctx.y)
    ctx.y += 13
  }
  if (clinician.license_number) {
    doc.text(`License No.: ${clinician.license_number}`, LEFT, ctx.y)
    ctx.y += 13
  }
  doc.text(`Date signed: ${formatLongTimestamp(sig.signedAt)}`, LEFT, ctx.y)
  ctx.y += 14
}

function renderAmendment(
  ctx: RenderCtx,
  clinician: Clinician,
  amendment: SessionAmendment,
  index: number
): void {
  ensureSpace(ctx, 60)
  const { doc } = ctx

  ctx.y += 6
  doc.moveTo(LEFT, ctx.y).lineTo(RIGHT, ctx.y).lineWidth(0.5).stroke()
  ctx.y += 10

  doc.font('Helvetica-Bold').fontSize(11)
  doc.text(`Amendment #${index}`, LEFT, ctx.y, { width: USABLE })
  ctx.y = doc.y + 6

  doc.font('Helvetica').fontSize(10)
  doc.text(amendment.body, LEFT, ctx.y, { width: USABLE })
  ctx.y = doc.y + 10

  renderSignatureBlock(ctx, clinician, {
    name: amendment.signed_by_name,
    credentials: amendment.signed_by_credentials,
    signedAt: amendment.signed_at
  })
}

function formatSessionDateTime(session: Session): string {
  const parts: string[] = [session.session_date]
  if (session.start_time && session.end_time) {
    parts.push(`${session.start_time}–${session.end_time}`)
  }
  return parts.join(' · ')
}

function formatLongTimestamp(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })
}
