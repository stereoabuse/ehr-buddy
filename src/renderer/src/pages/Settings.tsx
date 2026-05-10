import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'

export default function Settings() {
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null)

  const backup = useMutation({
    mutationFn: () => window.api.backup.run(),
    onSuccess: (r) => setBackupStatus(r ? `Backed up to ${r.path}` : 'Cancelled'),
    onError: (e) => setBackupStatus(`Error: ${String(e)}`)
  })

  const archive = useMutation({
    mutationFn: () => window.api.backup.fullArchive(),
    onSuccess: (r) => setArchiveStatus(r ? `Archive saved to ${r.path}` : 'Cancelled'),
    onError: (e) => setArchiveStatus(`Error: ${String(e)}`)
  })

  const isError = backupStatus?.startsWith('Error') ?? false
  const isArchiveError = archiveStatus?.startsWith('Error') ?? false

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h2
          className="m-0 text-2xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.4px' }}
        >
          Settings
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <Card padding={0}>
          <SectionHeader title="Backup" />
          <div className="flex items-center gap-4 px-[18px] py-4">
            <div className="flex-1">
              <p className="m-0 text-base text-body">
                Save a snapshot of your local database to a folder of your choice.
              </p>
              <p className="mt-1 text-sm text-muted">
                The one-click backup includes the database only. The documents folder lives separately —
                see SECURITY.md for the path.
              </p>
              {backupStatus && (
                <p className={`mt-2 text-sm ${isError ? 'text-danger' : 'text-success'}`}>
                  {backupStatus}
                </p>
              )}
            </div>
            <Btn
              icon="download"
              onClick={() => { setBackupStatus(null); backup.mutate() }}
              disabled={backup.isPending}
            >
              {backup.isPending ? 'Backing up…' : 'Back up now'}
            </Btn>
          </div>
          <div
            className="flex items-center gap-4 px-[18px] py-4"
            style={{ borderTop: '0.5px solid var(--color-divider)' }}
          >
            <div className="flex-1">
              <p className="m-0 text-base text-body">
                Export a full ZIP archive with the database, uploaded documents, CSV files, and a manifest.
              </p>
              <p className="mt-1 text-sm text-muted">
                The archive contains PHI and is not encrypted. Store it only on encrypted storage.
              </p>
              {archiveStatus && (
                <p className={`mt-2 text-sm ${isArchiveError ? 'text-danger' : 'text-success'}`}>
                  {archiveStatus}
                </p>
              )}
            </div>
            <Btn
              icon="download"
              onClick={() => { setArchiveStatus(null); archive.mutate() }}
              disabled={archive.isPending}
            >
              {archive.isPending ? 'Exporting...' : 'Export full archive'}
            </Btn>
          </div>
        </Card>

        <Card padding={0}>
          <SectionHeader title="Compliance" />
          <div
            className="flex items-center justify-between px-[18px] py-4"
            style={{ borderBottom: '0.5px solid var(--color-divider)' }}
          >
            <div>
              <Link
                to="/activity"
                className="text-base font-semibold text-primary hover:text-primary-dark"
              >
                Activity log
              </Link>
              <p className="mt-1 text-sm text-muted">
                Append-only record of every PHI access and change. Required by HIPAA §164.312(b).
              </p>
            </div>
            <Link
              to="/activity"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
              aria-label="Open activity log"
            >
              Open <Icon name="chevR" size={12} />
            </Link>
          </div>
          <div className="flex items-center justify-between px-[18px] py-4">
            <div>
              <Link
                to="/profile"
                className="text-base font-semibold text-primary hover:text-primary-dark"
              >
                Clinician profile
              </Link>
              <p className="mt-1 text-sm text-muted">
                Identity, credentials, NPI, and default fees used on superbills.
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
            >
              Open <Icon name="chevR" size={12} />
            </Link>
          </div>
        </Card>

        <Card padding={0}>
          <SectionHeader title="About" />
          <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 px-[18px] py-4 text-base">
            <dt className="font-medium text-muted">App</dt>
            <dd className="text-ink">EHR Buddy v0.3.0</dd>
            <dt className="font-medium text-muted">Data</dt>
            <dd className="text-body">
              Stored locally in your user data folder. Disk encryption strongly recommended — see SECURITY.md.
            </dd>
            <dt className="font-medium text-muted">Network</dt>
            <dd className="text-body">
              EHR Buddy never sends your data anywhere. No cloud, no telemetry, no third-party services.
            </dd>
          </dl>
        </Card>
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      className="px-[18px] py-3.5"
      style={{ borderBottom: '0.5px solid var(--color-hairline)' }}
    >
      <h3 className="m-0 text-md font-semibold text-ink" style={{ fontFamily: 'var(--font-head)' }}>
        {title}
      </h3>
    </div>
  )
}
