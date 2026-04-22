import { beforeEach, describe, expect, it, vi } from 'vitest'

const showSaveDialog = vi.fn()
const writeFileSync = vi.fn()
const allInRange = vi.fn()

vi.mock('electron', () => ({
  dialog: {
    get showSaveDialog() {
      return showSaveDialog
    }
  },
  app: {
    getPath: () => '/tmp'
  }
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    writeFileSync: (...args: unknown[]) => writeFileSync(...args)
  }
})

vi.mock('../db/repos/sessions', () => ({
  allInRange: (...args: unknown[]) => allInRange(...args)
}))

import { generateCsvExport } from './csv-export'

function sampleSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 's1',
    client_id: 'c1',
    session_date: '2026-04-10',
    start_time: '09:00',
    end_time: '09:45',
    cpt_code: '90834',
    icd10_codes: 'F41.1',
    fee_cents: 15000,
    paid: 1,
    note_format: 'DAP',
    note_body: null,
    created_at: 'x',
    updated_at: 'x',
    client_first_name: 'Ada',
    client_last_name: 'Lovelace',
    ...overrides
  }
}

beforeEach(() => {
  showSaveDialog.mockReset()
  writeFileSync.mockReset()
  allInRange.mockReset()
})

describe('generateCsvExport', () => {
  it('throws when no sessions are in range', async () => {
    allInRange.mockReturnValue([])
    await expect(
      generateCsvExport({ fromDate: '2026-01-01', toDate: '2026-12-31' })
    ).rejects.toThrow(/No sessions/)
    expect(showSaveDialog).not.toHaveBeenCalled()
  })

  it('returns null and writes nothing when the save dialog is canceled', async () => {
    allInRange.mockReturnValue([sampleSession()])
    showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })

    const result = await generateCsvExport({ fromDate: '2026-01-01', toDate: '2026-12-31' })

    expect(result).toBeNull()
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('writes header, rows, and totals with dollar formatting and CSV escaping', async () => {
    allInRange.mockReturnValue([
      sampleSession({ id: 's1', fee_cents: 15000, paid: 1, client_last_name: 'Lovelace, Jr.' }),
      sampleSession({
        id: 's2',
        session_date: '2026-04-11',
        fee_cents: 12345,
        paid: 0,
        icd10_codes: null,
        cpt_code: '99999' // falls back to raw code when not in the CPT label map
      })
    ])
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/tmp/out.csv' })

    const result = await generateCsvExport({ fromDate: '2026-04-01', toDate: '2026-04-30' })

    expect(result).toBe('/tmp/out.csv')
    expect(writeFileSync).toHaveBeenCalledTimes(1)
    const [path, csv, encoding] = writeFileSync.mock.calls[0]
    expect(path).toBe('/tmp/out.csv')
    expect(encoding).toBe('utf-8')

    const lines = (csv as string).split('\n')
    expect(lines[0]).toBe(
      'Date,Client Name,CPT Code,Service Description,ICD-10,Fee,Paid,Payment Amount'
    )

    // Row 1 — comma in client name must be quoted; fee/payment as paid
    expect(lines[1]).toBe(
      '2026-04-10,"Ada Lovelace, Jr.",90834,Individual Psychotherapy (45 min),F41.1,150.00,Y,150.00'
    )

    // Row 2 — unknown CPT uses raw code, empty icd10 stays empty, unpaid payment is 0.00
    expect(lines[2]).toBe('2026-04-11,Ada Lovelace,99999,99999,,123.45,N,0.00')

    // Totals row: totalFee = 150.00 + 123.45, totalPaid = 150.00
    expect(lines[3]).toBe(',TOTAL,,,,273.45,,150.00')
  })

  it('escapes quotes and newlines inside fields', async () => {
    allInRange.mockReturnValue([
      sampleSession({
        client_first_name: 'Ada "Ace"',
        client_last_name: 'Love\nlace',
        icd10_codes: 'F41.1, F32.1'
      })
    ])
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/tmp/out.csv' })

    await generateCsvExport({ fromDate: '2026-01-01', toDate: '2026-12-31' })

    const csv = writeFileSync.mock.calls[0][1] as string
    // The name field contains both a quote and a newline, so it must be quoted with "" escaping.
    expect(csv).toContain('"Ada ""Ace"" Love\nlace"')
    // ICD-10 contains a comma, so it must be quoted.
    expect(csv).toContain('"F41.1, F32.1"')
  })
})
