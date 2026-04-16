import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ClientList from './pages/ClientList'
import ClientDetail from './pages/ClientDetail'
import ClinicianProfile from './pages/ClinicianProfile'
import SessionEditor from './pages/SessionEditor'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <header className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <Link to="/" className="text-2xl font-semibold">EHR Buddy</Link>
              <nav className="flex gap-5 text-sm">
                <Link to="/" className="text-slate-600 hover:text-slate-900">Dashboard</Link>
                <Link to="/clients" className="text-slate-600 hover:text-slate-900">Clients</Link>
                <Link to="/reports" className="text-slate-600 hover:text-slate-900">Reports</Link>
                <Link to="/profile" className="text-slate-600 hover:text-slate-900">Profile</Link>
                <Link to="/settings" className="text-slate-600 hover:text-slate-900">Settings</Link>
              </nav>
            </div>
          </header>
          <main className="px-6 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<ClinicianProfile />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/new" element={<ClientDetail />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/clients/:clientId/sessions/new" element={<SessionEditor />} />
              <Route path="/clients/:clientId/sessions/:sessionId" element={<SessionEditor />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </QueryClientProvider>
  )
}
