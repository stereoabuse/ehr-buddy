// Structured progress note schema. Stored as JSON inside session.note_body
// when session.note_format === 'STRUCTURED'. Shared between renderer (form
// rendering) and main process (PDF export) — keep it dependency-free.
//
// Versioning: bump `schemaVersion` if you change the shape; older saved notes
// are passed through `parseStructuredNote` which fills missing fields with
// defaults so old data keeps loading.

import type { NoteFormat } from './types'

export interface StructuredObservations {
  cognitive_functioning: string
  affect: string
  mood: string
  interpersonal: string
  functional_status: string
}

export interface StructuredTreatmentPlan {
  objective_1: string
  objective_2: string
  additional_notes: string
}

export type Recommendation = 'continue' | 'change' | 'terminate' | null

export interface StructuredNote {
  schemaVersion: 1
  overall_notes: string
  observations: StructuredObservations
  risk_factors: string[]
  risk_factors_other: string
  medications: string
  current_functioning: string
  content_discussed: string
  interventions: string[]
  interventions_other: string
  treatment_plan: StructuredTreatmentPlan
  plan: string
  recommendation: Recommendation
}

// SimplePractice Standard Progress Note dropdowns. The form also offers a
// "Custom…" escape hatch per field: the typed text is stored as-is in the
// same string field, so values outside these lists are valid. Leaving the
// field empty is the way to skip.
export const OBSERVATION_OPTIONS: Record<keyof StructuredObservations, string[]> = {
  cognitive_functioning: ['Oriented/Alert', 'Disorganized', 'Preoccupied', 'Circumstantial'],
  affect: ['Appropriate', 'Inappropriate', 'Labile', 'Constricted', 'Blunted', 'Flat'],
  mood: ['Euthymic', 'Depressed', 'Dysphoric', 'Anxious', 'Angry', 'Euphoric'],
  interpersonal: ['Interactive', 'Intermittently Interactive', 'Guarded', 'Withdrawn', 'Hostile'],
  functional_status: ['Intact', 'Impaired', 'Variably Impaired']
}

export const OBSERVATION_LABELS: Record<keyof StructuredObservations, string> = {
  cognitive_functioning: 'Cognitive functioning',
  affect: 'Affect',
  mood: 'Mood',
  interpersonal: 'Interpersonal',
  functional_status: 'Functional status'
}

export const RISK_FACTOR_OPTIONS: { id: string; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'suicidal_ideation', label: 'Suicidal Ideation' },
  { id: 'homicidal_ideation', label: 'Homicidal Ideation' },
  { id: 'other', label: 'Other' }
]

export const INTERVENTION_OPTIONS: { id: string; label: string }[] = [
  { id: 'cognitive_challenging', label: 'Cognitive Challenging' },
  { id: 'cognitive_refocusing', label: 'Cognitive Refocusing' },
  { id: 'cognitive_reframing', label: 'Cognitive Reframing' },
  { id: 'communication_skills', label: 'Communication Skills' },
  { id: 'dbt', label: 'DBT' },
  { id: 'exploration_coping', label: 'Exploration of Coping Patterns' },
  { id: 'exploration_emotions', label: 'Exploration of Emotions' },
  { id: 'exploration_relationships', label: 'Exploration of Relationship Patterns' },
  { id: 'guided_imagery', label: 'Guided Imagery' },
  { id: 'interactive_feedback', label: 'Interactive Feedback' },
  { id: 'interpersonal_resolutions', label: 'Interpersonal Resolutions' },
  { id: 'mindfulness_training', label: 'Mindfulness Training' },
  { id: 'preventative_services', label: 'Preventative Services' },
  { id: 'other', label: 'Other' }
]

export const RECOMMENDATION_OPTIONS: { id: Exclude<Recommendation, null>; label: string }[] = [
  { id: 'continue', label: 'Continue Current Therapeutic Focus' },
  { id: 'change', label: 'Change Treatment Goals or Objectives' },
  { id: 'terminate', label: 'Terminate Treatment' }
]

/** A fresh, fully-owned empty note. Use this (not EMPTY_STRUCTURED_NOTE) whenever
 *  the result may be mutated — every nested object/array is newly allocated. */
export function createEmptyStructuredNote(): StructuredNote {
  return {
    schemaVersion: 1,
    overall_notes: '',
    observations: {
      cognitive_functioning: '',
      affect: '',
      mood: '',
      interpersonal: '',
      functional_status: ''
    },
    risk_factors: [],
    risk_factors_other: '',
    medications: '',
    current_functioning: '',
    content_discussed: '',
    interventions: [],
    interventions_other: '',
    treatment_plan: { objective_1: '', objective_2: '', additional_notes: '' },
    plan: '',
    recommendation: null
  }
}

/** Canonical empty note for read-only/comparison use. Do not mutate; call
 *  createEmptyStructuredNote() for a mutable copy. */
export const EMPTY_STRUCTURED_NOTE: StructuredNote = createEmptyStructuredNote()

/** Coerce an arbitrary stored value to a string, defaulting non-strings (and
 *  null/undefined) to ''. Keeps parseStructuredNote's "forgiving" contract for
 *  nested fields, which would otherwise leak non-string type lies. */
function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Parse a stored note body as a structured note. Forgiving: missing fields
 *  fall back to defaults, malformed JSON returns the empty note. */
export function parseStructuredNote(body: string | null | undefined): StructuredNote {
  if (!body) return createEmptyStructuredNote()
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return createEmptyStructuredNote()
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return createEmptyStructuredNote()
  }
  const r = raw as Partial<StructuredNote>
  return {
    schemaVersion: 1,
    overall_notes: typeof r.overall_notes === 'string' ? r.overall_notes : '',
    observations: {
      cognitive_functioning: asString(r.observations?.cognitive_functioning),
      affect: asString(r.observations?.affect),
      mood: asString(r.observations?.mood),
      interpersonal: asString(r.observations?.interpersonal),
      functional_status: asString(r.observations?.functional_status)
    },
    risk_factors: Array.isArray(r.risk_factors) ? r.risk_factors.filter((x) => typeof x === 'string') : [],
    risk_factors_other: typeof r.risk_factors_other === 'string' ? r.risk_factors_other : '',
    medications: typeof r.medications === 'string' ? r.medications : '',
    current_functioning: typeof r.current_functioning === 'string' ? r.current_functioning : '',
    content_discussed: typeof r.content_discussed === 'string' ? r.content_discussed : '',
    interventions: Array.isArray(r.interventions) ? r.interventions.filter((x) => typeof x === 'string') : [],
    interventions_other: typeof r.interventions_other === 'string' ? r.interventions_other : '',
    treatment_plan: {
      objective_1: asString(r.treatment_plan?.objective_1),
      objective_2: asString(r.treatment_plan?.objective_2),
      additional_notes: asString(r.treatment_plan?.additional_notes)
    },
    plan: typeof r.plan === 'string' ? r.plan : '',
    recommendation:
      r.recommendation === 'continue' ||
      r.recommendation === 'change' ||
      r.recommendation === 'terminate'
        ? r.recommendation
        : null
  }
}

export function serializeStructuredNote(note: StructuredNote): string {
  return JSON.stringify(note)
}

/** Build a STRUCTURED note from legacy DAP/FREE body — body becomes overall_notes. */
export function fromLegacyBody(body: string | null | undefined): StructuredNote {
  return { ...createEmptyStructuredNote(), overall_notes: (body ?? '').trim() }
}

/** Heuristic for "this note has been written in" — works across all formats. */
export function noteHasContent(format: NoteFormat, body: string | null | undefined): boolean {
  if (!body) return false
  if (format === 'STRUCTURED') {
    const n = parseStructuredNote(body)
    return Boolean(
      n.overall_notes.trim() ||
        n.medications.trim() ||
        n.current_functioning.trim() ||
        n.content_discussed.trim() ||
        n.plan.trim() ||
        n.treatment_plan.objective_1.trim() ||
        n.treatment_plan.objective_2.trim() ||
        n.treatment_plan.additional_notes.trim() ||
        n.observations.cognitive_functioning.trim() ||
        n.observations.affect.trim() ||
        n.observations.mood.trim() ||
        n.observations.interpersonal.trim() ||
        n.observations.functional_status.trim() ||
        n.risk_factors.length > 0 ||
        n.interventions.length > 0 ||
        n.recommendation !== null
    )
  }
  // Legacy DAP/FREE: anything beyond the empty scaffolding markers counts.
  return body.replace(/Data:|Assessment:|Plan:/g, '').trim().length > 0
}
