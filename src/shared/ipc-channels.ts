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
  REPORT_INCOME_PDF: 'report:incomePdf',
  REPORT_CSV: 'report:csv',
  BACKUP_RUN: 'backup:run',

  // Google integration
  GOOGLE_AUTH_START: 'google:authStart',
  GOOGLE_AUTH_STATUS: 'google:authStatus',
  GOOGLE_AUTH_DISCONNECT: 'google:disconnect',
  GOOGLE_CALENDAR_EVENTS: 'google:calendarEvents',
  GOOGLE_DRIVE_EXPORT: 'google:driveExport'
} as const
