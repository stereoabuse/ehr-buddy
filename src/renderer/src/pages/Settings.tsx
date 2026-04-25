import { Link } from 'react-router-dom'

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
          <dd>EHR Buddy v0.2.0</dd>
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

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold">Compliance</h3>
        <p className="mt-1 text-sm text-slate-500">
          Tools for HIPAA recordkeeping and subject-access requests.
        </p>
        <ul className="mt-4 divide-y divide-slate-200">
          <li className="flex items-center justify-between py-3">
            <div>
              <Link to="/activity" className="font-medium text-blue-700 hover:underline">
                Activity log
              </Link>
              <p className="text-sm text-slate-500">
                Append-only record of every PHI access and change.
              </p>
            </div>
            <Link
              to="/activity"
              className="text-sm text-slate-600 hover:text-slate-900"
              aria-label="Open activity log"
            >
              Open →
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
