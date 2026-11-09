// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { Api } from '@shared/api-types'
import type { Clinician, Session } from '@shared/types'
import { createEmptyStructuredNote, serializeStructuredNote } from '@shared/structured-note'
import { ToastProvider } from '../components/Toast'
import SessionEditor from './SessionEditor'

const CLIENT_ID = 'client-1'
const SESSION_ID = 'session-1'

function noteBody(overall: string): string {
  return serializeStructuredNote({ ...createEmptyStructuredNote(), overall_notes: overall })
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: SESSION_ID,
    client_id: CLIENT_ID,
    session_date: '2026-11-02',
    start_time: '10:00',
    end_time: '10:50',
    cpt_code: '90834',
    icd10_codes: 'F41.1',
    fee_cents: 15000,
    paid: 0,
    note_format: 'STRUCTURED',
    note_body: noteBody('Initial'),
    signed_at: null,
    signed_by_name: null,
    signed_by_credentials: null,
    created_at: '2026-11-02T15:00:00.000Z',
    updated_at: '2026-11-02T15:00:00.000Z',
    ...overrides
  }
}

const clinician: Clinician = {
  id: 'singleton',
  full_name: 'Test Clinician',
  credentials: 'LCSW',
  npi: null,
  license_number: null,
  tax_id: null,
  practice_name: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  phone: null,
  email: null,
  default_fees_json: null,
  signature_image_base64: null,
  updated_at: '2026-01-01T00:00:00.000Z'
}

let serverSession: Session
let api: {
  clinician: { get: ReturnType<typeof vi.fn> }
  clients: { get: ReturnType<typeof vi.fn> }
  sessions: Record<string, ReturnType<typeof vi.fn>>
  notes: { exportPdf: ReturnType<typeof vi.fn> }
  app: { setUnsavedChanges: ReturnType<typeof vi.fn> }
  shell: { showItemInFolder: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  serverSession = makeSession()
  api = {
    clinician: { get: vi.fn(async () => clinician) },
    clients: {
      get: vi.fn(async () => ({ id: CLIENT_ID, first_name: 'Ada', last_name: 'Lovelace', dob: null, phone: null }))
    },
    sessions: {
      get: vi.fn(async () => serverSession),
      listAmendments: vi.fn(async () => []),
      listByClient: vi.fn(async () => []),
      upsert: vi.fn(async (input: Session) => {
        serverSession = { ...serverSession, ...input, id: input.id ?? SESSION_ID }
        return serverSession
      }),
      sign: vi.fn(async () => {
        serverSession = { ...serverSession, signed_at: '2026-11-02T16:00:00.000Z' }
        return serverSession
      }),
      delete: vi.fn(async () => ({ ok: true }))
    },
    notes: { exportPdf: vi.fn() },
    app: { setUnsavedChanges: vi.fn() },
    shell: { showItemInFolder: vi.fn(async () => ({ ok: true })) }
  }
  ;(window as unknown as { api: Api }).api = api as unknown as Api
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderEditor(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/clients/:clientId/sessions/new', element: <SessionEditor /> },
      { path: '/clients/:clientId/sessions/:sessionId', element: <SessionEditor /> },
      { path: '/clients/:id', element: <div>client chart</div> }
    ],
    { initialEntries: [path] }
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}

function overallNotes(): HTMLTextAreaElement {
  // Overall Notes is the first textarea in the structured form.
  return screen.getAllByPlaceholderText('Begin typing here…')[0] as HTMLTextAreaElement
}

function feeInput(): HTMLInputElement {
  return screen.getByLabelText(/^Fee/) as HTMLInputElement
}

describe('SessionEditor autosave', () => {
  it('does not clobber typing when the post-autosave refetch arrives', async () => {
    renderEditor(`/clients/${CLIENT_ID}/sessions/${SESSION_ID}`)
    await screen.findByDisplayValue('Initial')

    // Hold the autosave's response so we can type while it is in flight.
    let releaseSave: () => void = () => {}
    api.sessions.upsert.mockImplementationOnce(
      (input: Session) =>
        new Promise((resolve) => {
          releaseSave = () => {
            serverSession = { ...serverSession, ...input }
            resolve(serverSession)
          }
        })
    )

    // "150.00" is the same amount as the stored 15000 cents, typed differently.
    fireEvent.change(feeInput(), { target: { value: '150.00' } })
    fireEvent.change(overallNotes(), { target: { value: 'Initial plus more' } })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(api.sessions.upsert).toHaveBeenCalledTimes(1)

    fireEvent.change(overallNotes(), { target: { value: 'Initial plus more and later' } })

    const getsBefore = api.sessions.get.mock.calls.length
    await act(async () => {
      releaseSave()
    })
    await waitFor(() => expect(api.sessions.get.mock.calls.length).toBeGreaterThan(getsBefore))

    expect(overallNotes().value).toBe('Initial plus more and later')
    expect(feeInput().value).toBe('150.00')
  })

  it('autosaves an existing draft after 3 seconds of idle, not before', async () => {
    renderEditor(`/clients/${CLIENT_ID}/sessions/${SESSION_ID}`)
    await screen.findByDisplayValue('Initial')

    fireEvent.change(overallNotes(), { target: { value: 'Edited' } })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(api.sessions.upsert).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1100)
    })
    expect(api.sessions.upsert).toHaveBeenCalledTimes(1)
  })

  it('never autosaves a brand-new session', async () => {
    renderEditor(`/clients/${CLIENT_ID}/sessions/new`)
    const notes = await waitFor(() => overallNotes())

    fireEvent.change(notes, { target: { value: 'New session text' } })
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(api.sessions.upsert).not.toHaveBeenCalled()
  })
})

describe('SessionEditor sign flow', () => {
  async function openSignModalAndConfirm() {
    fireEvent.click(screen.getByRole('button', { name: /Sign & Lock/ }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: /Sign & Lock/ })
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(confirm)
  }

  it('saves the current draft, then signs it with the current body', async () => {
    renderEditor(`/clients/${CLIENT_ID}/sessions/${SESSION_ID}`)
    await screen.findByDisplayValue('Initial')

    fireEvent.change(overallNotes(), { target: { value: 'Final text' } })
    await openSignModalAndConfirm()

    await waitFor(() => expect(api.sessions.sign).toHaveBeenCalledTimes(1))
    expect(api.sessions.upsert).toHaveBeenCalledTimes(1)
    expect(api.sessions.upsert.mock.invocationCallOrder[0]).toBeLessThan(
      api.sessions.sign.mock.invocationCallOrder[0]
    )
    expect(api.sessions.sign).toHaveBeenCalledWith({
      id: SESSION_ID,
      body: noteBody('Final text'),
      note_format: 'STRUCTURED'
    })
  })

  it('shows the error when signing fails', async () => {
    api.sessions.sign.mockRejectedValueOnce(new Error('signing exploded'))
    renderEditor(`/clients/${CLIENT_ID}/sessions/${SESSION_ID}`)
    await screen.findByDisplayValue('Initial')

    await openSignModalAndConfirm()

    expect((await screen.findAllByText(/signing exploded/)).length).toBeGreaterThan(0)
  })
})
