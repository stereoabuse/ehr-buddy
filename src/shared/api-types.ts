import type {
  Client,
  ClientInput,
  ClientListItem,
  Clinician,
  ClinicianInput,
  Session,
  SessionInput,
  SessionWithClient
} from './types'

export interface PingResult {
  ok: boolean
  message: string
  ts: string
}

export interface SuperbillArgs {
  clientId: string
  fromDate: string
  toDate: string
}

export interface Api {
  ping: () => Promise<PingResult>
  clients: {
    list: () => Promise<ClientListItem[]>
    get: (id: string) => Promise<Client | null>
    upsert: (input: ClientInput) => Promise<Client>
    delete: (id: string) => Promise<{ ok: boolean }>
  }
  clinician: {
    get: () => Promise<Clinician | null>
    upsert: (input: ClinicianInput) => Promise<Clinician>
  }
  sessions: {
    listByClient: (clientId: string) => Promise<Session[]>
    get: (id: string) => Promise<Session | null>
    upsert: (input: SessionInput) => Promise<Session>
    delete: (id: string) => Promise<{ ok: boolean }>
    today: () => Promise<SessionWithClient[]>
    unpaid: () => Promise<SessionWithClient[]>
  }
  superbill: {
    generate: (args: SuperbillArgs) => Promise<{ path: string } | null>
  }
  backup: {
    run: () => Promise<{ path: string } | null>
  }
}
