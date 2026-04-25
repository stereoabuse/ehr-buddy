import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ClientList from './pages/ClientList'
import ClientDetail from './pages/ClientDetail'
import ClinicianProfile from './pages/ClinicianProfile'
import SessionEditor from './pages/SessionEditor'
import Reports from './pages/Reports'
import Activity from './pages/Activity'
import Settings from './pages/Settings'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="flex h-screen min-h-0 bg-canvas text-body">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-auto px-6 py-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<ClinicianProfile />} />
                <Route path="/clients" element={<ClientList />} />
                <Route path="/clients/new" element={<ClientDetail />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/clients/:clientId/sessions/new" element={<SessionEditor />} />
                <Route path="/clients/:clientId/sessions/:sessionId" element={<SessionEditor />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </QueryClientProvider>
  )
}
