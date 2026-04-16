import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { Api } from '../shared/api-types'

const api: Api = {
  ping: () => ipcRenderer.invoke(IPC.PING),
  clients: {
    list: () => ipcRenderer.invoke(IPC.CLIENTS_LIST),
    get: (id) => ipcRenderer.invoke(IPC.CLIENTS_GET, id),
    upsert: (input) => ipcRenderer.invoke(IPC.CLIENTS_UPSERT, input),
    delete: (id) => ipcRenderer.invoke(IPC.CLIENTS_DELETE, id)
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
    unpaid: () => ipcRenderer.invoke(IPC.SESSIONS_UNPAID)
  },
  superbill: {
    generate: (args) => ipcRenderer.invoke(IPC.SUPERBILL_GENERATE, args)
  },
  reports: {
    incomePdf: (args) => ipcRenderer.invoke(IPC.REPORT_INCOME_PDF, args),
    csv: (args) => ipcRenderer.invoke(IPC.REPORT_CSV, args)
  },
  backup: {
    run: () => ipcRenderer.invoke(IPC.BACKUP_RUN)
  }
}

contextBridge.exposeInMainWorld('api', api)
