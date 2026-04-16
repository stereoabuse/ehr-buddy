import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'

export default function Settings() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<string | null>(null)

  const authStatus = useQuery({
    queryKey: ['google', 'status'],
    queryFn: () => window.api.google.authStatus()
  })

  const connectMut = useMutation({
    mutationFn: () => window.api.google.authStart(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['google', 'status'] })
      setStatus(`Connected as ${result.email}`)
    },
    onError: (err) => setStatus(`Connection failed: ${String(err)}`)
  })

  const disconnectMut = useMutation({
    mutationFn: () => window.api.google.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google', 'status'] })
      setStatus('Disconnected from Google')
    }
  })

  const connected = authStatus.data?.connected ?? false
  const email = authStatus.data?.email ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold">Settings</h2>
        <p className="mt-1 text-slate-500">App settings and Google integration</p>
      </div>

      {/* ── Google Connection ────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold">Google Account</h3>
        <p className="mt-1 text-sm text-slate-500">
          Connect your Google account to sync sessions with Calendar, push billing rows to Sheets,
          and export notes to Drive.
        </p>

        <div className="mt-4">
          {connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium text-green-800">Connected as {email}</span>
              </div>
              <p className="text-sm text-slate-500">
                Calendar events appear on your Dashboard. Sessions auto-sync to a Google Sheet.
                You can export session notes to Google Drive from each client's session list.
              </p>
              <Button
                variant="danger"
                onClick={() => disconnectMut.mutate()}
                disabled={disconnectMut.isPending}
              >
                Disconnect Google
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-slate-300" />
                <span className="font-medium text-slate-600">Not connected</span>
              </div>
              <Button
                onClick={() => { setStatus(null); connectMut.mutate() }}
                disabled={connectMut.isPending}
              >
                {connectMut.isPending ? 'Connecting…' : 'Connect Google Account'}
              </Button>
            </div>
          )}
        </div>

        {status && (
          <p className={`mt-3 text-sm ${status.startsWith('Connection failed') ? 'text-red-600' : 'text-green-700'}`}>
            {status}
          </p>
        )}
      </div>

      {/* ── What gets synced ─────────────────────── */}
      {connected && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">What gets synced</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-blue-600">📅</span>
              <span><strong>Google Calendar:</strong> Your weekly agenda appears on the Dashboard. New sessions can be added to your calendar.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-600">📊</span>
              <span><strong>Google Sheets:</strong> Every session save appends a row to "EHR Buddy — Billing Log" in your Drive. Great for bookkeeping.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-purple-600">📄</span>
              <span><strong>Google Drive:</strong> Export session notes as formatted Google Docs to the "EHR Buddy Notes" folder.</span>
            </li>
          </ul>
        </div>
      )}

      {/* ── About ────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold">About</h3>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <dt className="font-medium text-slate-600">App</dt>
          <dd>EHR Buddy v0.1.0</dd>
          <dt className="font-medium text-slate-600">Data</dt>
          <dd className="break-all text-slate-500">Stored locally in your user data folder (encrypted disk recommended)</dd>
        </dl>
      </div>
    </div>
  )
}
