import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'

export default function ClientList() {
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: () => window.api.clients.list()
  })

  const [search, setSearch] = useState('')

  const filtered = (clients ?? []).filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      `${c.last_name}, ${c.first_name}`.toLowerCase().includes(q)
    )
  })

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold">Clients</h2>
        <Link to="/clients/new">
          <Button>+ Add Client</Button>
        </Link>
      </div>

      {isLoading && <p className="mt-6 text-slate-500">Loading…</p>}
      {error && <p className="mt-6 text-red-600">Error: {String(error)}</p>}

      {clients && clients.length > 0 && (
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-72"
          />
        </div>
      )}

      {clients && clients.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-500">No clients yet.</p>
          <Link to="/clients/new" className="mt-4 inline-block">
            <Button>+ Add your first client</Button>
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">DOB</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Last Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/clients/${c.id}`} className="font-medium text-blue-700 hover:underline">
                      {c.last_name}, {c.first_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.dob ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{c.last_session_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {clients && clients.length > 0 && filtered.length === 0 && search.trim() && (
        <p className="mt-4 text-slate-500">No clients matching "{search}"</p>
      )}
    </div>
  )
}
