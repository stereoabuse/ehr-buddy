export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold">Settings</h2>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold">About</h3>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <dt className="font-medium text-slate-600">App</dt>
          <dd>EHR Buddy v0.1.0</dd>
          <dt className="font-medium text-slate-600">Data</dt>
          <dd className="break-all text-slate-500">
            Stored locally in your user data folder. Disk encryption strongly recommended — see SECURITY.md.
          </dd>
          <dt className="font-medium text-slate-600">Network</dt>
          <dd className="text-slate-500">
            EHR Buddy never sends your data anywhere. No cloud, no telemetry, no third-party services.
          </dd>
        </dl>
      </div>
    </div>
  )
}
