export interface CptCode {
  code: string
  description: string
  /** Wording used on superbills, income reports, and billing CSVs. */
  billingLabel: string
  defaultMinutes: number
}

export const CPT_CODES: CptCode[] = [
  { code: '90791', description: 'Psychiatric diagnostic evaluation', billingLabel: 'Psychiatric Diagnostic Evaluation', defaultMinutes: 60 },
  { code: '90832', description: 'Psychotherapy, 30 min', billingLabel: 'Individual Psychotherapy (30 min)', defaultMinutes: 30 },
  { code: '90834', description: 'Psychotherapy, 45 min', billingLabel: 'Individual Psychotherapy (45 min)', defaultMinutes: 45 },
  { code: '90837', description: 'Psychotherapy, 60 min', billingLabel: 'Individual Psychotherapy (60 min)', defaultMinutes: 60 },
  { code: '90846', description: 'Family therapy without patient, 50 min', billingLabel: 'Family Therapy without Patient (50 min)', defaultMinutes: 50 },
  { code: '90847', description: 'Family therapy with patient, 50 min', billingLabel: 'Family Therapy with Patient (50 min)', defaultMinutes: 50 },
  { code: '90853', description: 'Group psychotherapy', billingLabel: 'Group Psychotherapy', defaultMinutes: 60 }
]

/** Billing wording for a CPT code, falling back to the bare code if unknown. */
export function cptBillingLabel(code: string): string {
  return CPT_CODES.find((c) => c.code === code)?.billingLabel ?? code
}
