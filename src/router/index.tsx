import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseProvider } from '@/hooks/useDatabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Duplicates from '@/pages/Duplicates'
import Categories from '@/pages/Categories'
import Reports from '@/pages/Reports'
import Goals from '@/pages/Goals'
import Accounts from '@/pages/Accounts'
import Tags from '@/pages/Tags'
import ErrorPage from '@/pages/ErrorPage'

function PrivateRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <DatabaseProvider>
      <PageWrapper>
        <Outlet />
      </PageWrapper>
    </DatabaseProvider>
  )
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login />, errorElement: <ErrorPage /> },
    {
      element: <PrivateRoute />,
      errorElement: <ErrorPage />,
      children: [
        { path: '/', element: <Dashboard /> },
        { path: '/transactions', element: <Transactions /> },
        { path: '/duplicates', element: <Duplicates /> },
        { path: '/categories', element: <Categories /> },
        { path: '/reports', element: <Reports /> },
        { path: '/goals', element: <Goals /> },
        { path: '/accounts', element: <Accounts /> },
        { path: '/tags', element: <Tags /> },
      ],
    },
  ],
  { basename: '/lab-financial-management' }
)
