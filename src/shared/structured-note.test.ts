import { describe, it, expect } from 'vitest'
import {
  EMPTY_STRUCTURED_NOTE,
  parseStructuredNote,
  serializeStructuredNote,
  fromLegacyBody,
  noteHasContent,
  type StructuredNote
} from '@shared/structured-note'

// A fully-populated, well-formed structured note used across round-trip tests.
function fullNote(): StructuredNote {
  return {
    schemaVersion: 1,
    overall_notes: 'Session went well.',
    observations: {
      cognitive_functioning: 'Oriented/Alert',
      affect: 'Appropriate',
      mood: 'Euthymic',
      interpersonal: 'Interactive',
      functional_status: 'Intact'
    },
    risk_factors: ['none'],
    risk_factors_other: 'n/a',
    medications: 'Sertraline 50mg',
    current_functioning: 'Stable',
    content_discussed: 'Coping strategies',
    interventions: ['dbt', 'mindfulness_training'],
    interventions_other: 'breathing',
    treatment_plan: {
      objective_1: 'Reduce anxiety',
      objective_2: 'Improve sleep',
      additional_notes: 'Follow up in 2 weeks'
    },
    plan: 'Weekly sessions',
    recommendation: 'continue'
  }
}

describe('parseStructuredNote', () => {
  it('parses a fully well-formed structured note JSON', () => {
    const note = fullNote()
    const parsed = parseStructuredNote(serializeStructuredNote(note))
    expect(parsed).toEqual(note)
  })

  it('returns the empty default for null input', () => {
    expect(parseStructuredNote(null)).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('returns the empty default for undefined input', () => {
    expect(parseStructuredNote(undefined)).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('returns the empty default for empty string input', () => {
    expect(parseStructuredNote('')).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('returns the empty default for malformed JSON rather than throwing', () => {
    expect(() => parseStructuredNote('{ not valid json')).not.toThrow()
    expect(parseStructuredNote('{ not valid json')).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('returns the empty default when JSON parses to a non-object (number)', () => {
    expect(parseStructuredNote('42')).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('returns the empty default when JSON parses to a string literal', () => {
    expect(parseStructuredNote('"hello"')).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('returns the empty default when JSON parses to null literal', () => {
    expect(parseStructuredNote('null')).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('returns the empty default when JSON parses to an array', () => {
    // Arrays are typeof "object" but are explicitly rejected by the guard
    // (Array.isArray), so they fall back to a fresh empty note.
    expect(parseStructuredNote('[1,2,3]')).toEqual(EMPTY_STRUCTURED_NOTE)
  })

  it('fills missing fields with defaults from a partial object', () => {
    const parsed = parseStructuredNote(JSON.stringify({ overall_notes: 'only this' }))
    expect(parsed.overall_notes).toBe('only this')
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.medications).toBe('')
    expect(parsed.observations).toEqual(EMPTY_STRUCTURED_NOTE.observations)
    expect(parsed.risk_factors).toEqual([])
    expect(parsed.interventions).toEqual([])
    expect(parsed.recommendation).toBeNull()
    expect(parsed.treatment_plan).toEqual(EMPTY_STRUCTURED_NOTE.treatment_plan)
  })

  it('coerces non-string scalar fields to defaults', () => {
    const parsed = parseStructuredNote(
      JSON.stringify({ overall_notes: 123, medications: true, plan: { x: 1 } })
    )
    expect(parsed.overall_notes).toBe('')
    expect(parsed.medications).toBe('')
    expect(parsed.plan).toBe('')
  })

  it('filters non-string entries out of risk_factors and interventions arrays', () => {
    const parsed = parseStructuredNote(
      JSON.stringify({
        risk_factors: ['suicidal_ideation', 5, null, 'other', { x: 1 }],
        interventions: ['dbt', 7, true, 'mindfulness_training']
      })
    )
    expect(parsed.risk_factors).toEqual(['suicidal_ideation', 'other'])
    expect(parsed.interventions).toEqual(['dbt', 'mindfulness_training'])
  })

  it('resets non-array risk_factors / interventions to empty arrays', () => {
    const parsed = parseStructuredNote(
      JSON.stringify({ risk_factors: 'suicidal_ideation', interventions: 'dbt' })
    )
    expect(parsed.risk_factors).toEqual([])
    expect(parsed.interventions).toEqual([])
  })

  it('accepts each valid recommendation value', () => {
    expect(parseStructuredNote(JSON.stringify({ recommendation: 'continue' })).recommendation).toBe(
      'continue'
    )
    expect(parseStructuredNote(JSON.stringify({ recommendation: 'change' })).recommendation).toBe(
      'change'
    )
    expect(
      parseStructuredNote(JSON.stringify({ recommendation: 'terminate' })).recommendation
    ).toBe('terminate')
  })

  it('coerces an unknown recommendation value to null', () => {
    expect(parseStructuredNote(JSON.stringify({ recommendation: 'maybe' })).recommendation).toBeNull()
    expect(parseStructuredNote(JSON.stringify({ recommendation: 1 })).recommendation).toBeNull()
  })

  it('preserves partially-provided nested observation/treatment_plan fields', () => {
    const parsed = parseStructuredNote(
      JSON.stringify({
        observations: { mood: 'Anxious' },
        treatment_plan: { objective_1: 'Goal A' }
      })
    )
    expect(parsed.observations.mood).toBe('Anxious')
    expect(parsed.observations.affect).toBe('')
    expect(parsed.treatment_plan.objective_1).toBe('Goal A')
    expect(parsed.treatment_plan.objective_2).toBe('')
  })

  it('forces schemaVersion to 1 even if the stored value differs', () => {
    const parsed = parseStructuredNote(JSON.stringify({ schemaVersion: 99 }))
    expect(parsed.schemaVersion).toBe(1)
  })

  it('returns a fresh copy on default paths, never aliasing the shared constant', () => {
    // Regression guard: parseStructuredNote must not hand back the shared
    // EMPTY_STRUCTURED_NOTE singleton, or a caller mutating the result would
    // corrupt every future default parse.
    const a = parseStructuredNote(null)
    expect(a).toEqual(EMPTY_STRUCTURED_NOTE)
    expect(a).not.toBe(EMPTY_STRUCTURED_NOTE)
    expect(a.observations).not.toBe(EMPTY_STRUCTURED_NOTE.observations)
    expect(a.risk_factors).not.toBe(EMPTY_STRUCTURED_NOTE.risk_factors)

    // Mutating the result must not leak into the constant or a later parse.
    a.overall_notes = 'mutated'
    a.risk_factors.push('none')
    a.observations.mood = 'Anxious'
    expect(EMPTY_STRUCTURED_NOTE.overall_notes).toBe('')
    expect(EMPTY_STRUCTURED_NOTE.risk_factors).toEqual([])
    expect(EMPTY_STRUCTURED_NOTE.observations.mood).toBe('')
    expect(parseStructuredNote(undefined).overall_notes).toBe('')
  })
})

describe('serializeStructuredNote', () => {
  it('produces JSON that round-trips back to an equal note', () => {
    const note = fullNote()
    const json = serializeStructuredNote(note)
    expect(typeof json).toBe('string')
    expect(JSON.parse(json)).toEqual(note)
    expect(parseStructuredNote(json)).toEqual(note)
  })

  it('serializes the empty note and round-trips to the same shape', () => {
    const json = serializeStructuredNote(EMPTY_STRUCTURED_NOTE)
    expect(parseStructuredNote(json)).toEqual(EMPTY_STRUCTURED_NOTE)
  })
})

describe('fromLegacyBody', () => {
  it('places trimmed legacy body text into overall_notes', () => {
    const note = fromLegacyBody('  legacy content  ')
    expect(note.overall_notes).toBe('legacy content')
    expect(note.schemaVersion).toBe(1)
    expect(note.medications).toBe('')
  })

  it('returns an empty-notes note for null/undefined/empty body', () => {
    expect(fromLegacyBody(null).overall_notes).toBe('')
    expect(fromLegacyBody(undefined).overall_notes).toBe('')
    expect(fromLegacyBody('   ').overall_notes).toBe('')
  })

  it('keeps every other field at its empty default', () => {
    const note = fromLegacyBody('hi')
    expect({ ...note, overall_notes: '' }).toEqual(EMPTY_STRUCTURED_NOTE)
  })
})

describe('noteHasContent', () => {
  it('returns false for a falsy body regardless of format', () => {
    expect(noteHasContent('STRUCTURED', null)).toBe(false)
    expect(noteHasContent('DAP', undefined)).toBe(false)
    expect(noteHasContent('FREE', '')).toBe(false)
  })

  it('returns false for a STRUCTURED body that is the empty note', () => {
    expect(noteHasContent('STRUCTURED', serializeStructuredNote(EMPTY_STRUCTURED_NOTE))).toBe(false)
  })

  it('returns true for a STRUCTURED note with overall_notes text', () => {
    const json = serializeStructuredNote({ ...EMPTY_STRUCTURED_NOTE, overall_notes: 'hi' })
    expect(noteHasContent('STRUCTURED', json)).toBe(true)
  })

  it('treats whitespace-only string fields as empty in STRUCTURED', () => {
    const json = serializeStructuredNote({ ...EMPTY_STRUCTURED_NOTE, plan: '   ' })
    expect(noteHasContent('STRUCTURED', json)).toBe(false)
  })

  it('returns true when a STRUCTURED note has risk factors', () => {
    const json = serializeStructuredNote({ ...EMPTY_STRUCTURED_NOTE, risk_factors: ['none'] })
    expect(noteHasContent('STRUCTURED', json)).toBe(true)
  })

  it('returns true when a STRUCTURED note has interventions', () => {
    const json = serializeStructuredNote({ ...EMPTY_STRUCTURED_NOTE, interventions: ['dbt'] })
    expect(noteHasContent('STRUCTURED', json)).toBe(true)
  })

  it('treats a note with only an observation selected as content', () => {
    expect(
      noteHasContent(
        'STRUCTURED',
        serializeStructuredNote({
          ...EMPTY_STRUCTURED_NOTE,
          observations: { ...EMPTY_STRUCTURED_NOTE.observations, mood: 'Euthymic' }
        })
      )
    ).toBe(true)
  })

  it('returns true when a STRUCTURED note has a recommendation set', () => {
    const json = serializeStructuredNote({ ...EMPTY_STRUCTURED_NOTE, recommendation: 'continue' })
    expect(noteHasContent('STRUCTURED', json)).toBe(true)
  })

  it('returns true when a STRUCTURED note only has a nested observation set', () => {
    const json = serializeStructuredNote({
      ...EMPTY_STRUCTURED_NOTE,
      observations: { ...EMPTY_STRUCTURED_NOTE.observations, mood: 'Anxious' }
    })
    expect(noteHasContent('STRUCTURED', json)).toBe(true)
  })

  it('returns false for legacy DAP scaffolding markers only', () => {
    expect(noteHasContent('DAP', 'Data:\nAssessment:\nPlan:')).toBe(false)
  })

  it('returns false for legacy DAP scaffolding markers with surrounding whitespace', () => {
    expect(noteHasContent('DAP', '  Data:  \n Assessment: \n Plan: \n')).toBe(false)
  })

  it('returns true for a legacy DAP note with real content under the markers', () => {
    expect(noteHasContent('DAP', 'Data: patient reported improved sleep\nAssessment:\nPlan:')).toBe(
      true
    )
  })

  it('returns true for a legacy FREE-form note with any text', () => {
    expect(noteHasContent('FREE', 'just some free text')).toBe(true)
  })

  it('strips all Data:/Assessment:/Plan: markers when judging FREE content', () => {
    // The marker-stripping regex is applied for all non-STRUCTURED formats,
    // so a FREE note containing only those literal markers reads as empty.
    expect(noteHasContent('FREE', 'Data:Assessment:Plan:')).toBe(false)
  })
})
