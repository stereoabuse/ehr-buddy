import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom'
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
import { ToastProvider } from './components/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false }
  }
})

function Layout() {
  return (
    <div className="flex h-screen min-h-0 bg-canvas text-body">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'profile', element: <ClinicianProfile /> },
      { path: 'clients', element: <ClientList /> },
      { path: 'clients/new', element: <ClientDetail /> },
      { path: 'clients/:id', element: <ClientDetail /> },
      { path: 'reports', element: <Reports /> },
      { path: 'clients/:clientId/sessions/new', element: <SessionEditor /> },
      { path: 'clients/:clientId/sessions/:sessionId', element: <SessionEditor /> },
      { path: 'activity', element: <Activity /> },
      { path: 'settings', element: <Settings /> }
    ]
  }
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
