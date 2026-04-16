export interface CptCode {
  code: string
  description: string
  defaultMinutes: number
}

export const CPT_CODES: CptCode[] = [
  { code: '90791', description: 'Psychiatric diagnostic evaluation', defaultMinutes: 60 },
  { code: '90832', description: 'Psychotherapy, 30 min', defaultMinutes: 30 },
  { code: '90834', description: 'Psychotherapy, 45 min', defaultMinutes: 45 },
  { code: '90837', description: 'Psychotherapy, 60 min', defaultMinutes: 60 },
  { code: '90846', description: 'Family therapy without patient, 50 min', defaultMinutes: 50 },
  { code: '90847', description: 'Family therapy with patient, 50 min', defaultMinutes: 50 },
  { code: '90853', description: 'Group psychotherapy', defaultMinutes: 60 }
]
