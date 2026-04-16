export const IPC = {
  PING: 'ping',
  CLIENTS_LIST: 'clients:list',
  CLIENTS_GET: 'clients:get',
  CLIENTS_UPSERT: 'clients:upsert',
  CLIENTS_DELETE: 'clients:delete',
  CLINICIAN_GET: 'clinician:get',
  CLINICIAN_UPSERT: 'clinician:upsert',
  SESSIONS_LIST_BY_CLIENT: 'sessions:listByClient',
  SESSIONS_GET: 'sessions:get',
  SESSIONS_UPSERT: 'sessions:upsert',
  SESSIONS_DELETE: 'sessions:delete',
  SESSIONS_TODAY: 'sessions:today',
  SESSIONS_UNPAID: 'sessions:unpaid',
  SUPERBILL_GENERATE: 'superbill:generate',
  BACKUP_RUN: 'backup:run'
} as const
