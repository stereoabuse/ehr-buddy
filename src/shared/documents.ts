import type { DocType } from './types'

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  consent: 'Consent',
  roi: 'Release of Information',
  intake: 'Intake',
  other: 'Other'
}
