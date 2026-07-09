import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { Api } from '../shared/api-types'

const api: Api = {
  ping: () => ipcRenderer.invoke(IPC.PING),
  app: {
    version: () => ipcRenderer.invoke(IPC.APP_VERSION),
    dataDir: () => ipcRenderer.invoke(IPC.APP_DATA_DIR),
    setUnsavedChanges: (dirty) => ipcRenderer.send(IPC.APP_SET_UNSAVED_CHANGES, Boolean(dirty))
  },
  clients: {
    list: () => ipcRenderer.invoke(IPC.CLIENTS_LIST),
    roster: () => ipcRenderer.invoke(IPC.CLIENTS_ROSTER),
    get: (id) => ipcRenderer.invoke(IPC.CLIENTS_GET, id),
    upsert: (input) => ipcRenderer.invoke(IPC.CLIENTS_UPSERT, input),
    delete: (id) => ipcRenderer.invoke(IPC.CLIENTS_DELETE, id),
    permanentDelete: (args) => ipcRenderer.invoke(IPC.CLIENTS_PERMANENT_DELETE, args)
  },
  clinician: {
    get: () => ipcRenderer.invoke(IPC.CLINICIAN_GET),
    upsert: (input) => ipcRenderer.invoke(IPC.CLINICIAN_UPSERT, input)
  },
  sessions: {
    listByClient: (clientId) => ipcRenderer.invoke(IPC.SESSIONS_LIST_BY_CLIENT, clientId),
    get: (id) => ipcRenderer.invoke(IPC.SESSIONS_GET, id),
    upsert: (input) => ipcRenderer.invoke(IPC.SESSIONS_UPSERT, input),
    delete: (id) => ipcRenderer.invoke(IPC.SESSIONS_DELETE, id),
    today: () => ipcRenderer.invoke(IPC.SESSIONS_TODAY),
    unpaid: () => ipcRenderer.invoke(IPC.SESSIONS_UNPAID),
    setPaid: (id, paid) => ipcRenderer.invoke(IPC.SESSIONS_SET_PAID, { id, paid }),
    sign: (args) => ipcRenderer.invoke(IPC.SESSIONS_SIGN, args),
    addAmendment: (args) => ipcRenderer.invoke(IPC.SESSIONS_ADD_AMENDMENT, args),
    listAmendments: (sessionId) => ipcRenderer.invoke(IPC.SESSIONS_LIST_AMENDMENTS, sessionId)
  },
  superbill: {
    generate: (args) => ipcRenderer.invoke(IPC.SUPERBILL_GENERATE, args)
  },
  notes: {
    exportPdf: (args) => ipcRenderer.invoke(IPC.NOTE_EXPORT_PDF, args)
  },
  reports: {
    incomePdf: (args) => ipcRenderer.invoke(IPC.REPORT_INCOME_PDF, args),
    csv: (args) => ipcRenderer.invoke(IPC.REPORT_CSV, args)
  },
  backup: {
    run: () => ipcRenderer.invoke(IPC.BACKUP_RUN),
    fullArchive: () => ipcRenderer.invoke(IPC.BACKUP_FULL_ARCHIVE)
  },
  audit: {
    list: (filter) => ipcRenderer.invoke(IPC.AUDIT_LIST, filter),
    csv: (filter) => ipcRenderer.invoke(IPC.AUDIT_CSV, filter)
  },
  documents: {
    list: (clientId) => ipcRenderer.invoke(IPC.DOCUMENTS_LIST, clientId),
    upload: (input) => ipcRenderer.invoke(IPC.DOCUMENTS_UPLOAD, input),
    open: (id) => ipcRenderer.invoke(IPC.DOCUMENTS_OPEN, id),
    download: (id) => ipcRenderer.invoke(IPC.DOCUMENTS_DOWNLOAD, id),
    delete: (id) => ipcRenderer.invoke(IPC.DOCUMENTS_DELETE, id)
  }
}

contextBridge.exposeInMainWorld('api', api)
