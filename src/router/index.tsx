import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Login from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Categories from '@/pages/Categories'
import Reports from '@/pages/Reports'
import Goals from '@/pages/Goals'
import Accounts from '@/pages/Accounts'

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
    <PageWrapper>
      <Outlet />
    </PageWrapper>
  )
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    { path: '/auth/callback', element: <AuthCallback /> },
    {
      element: <PrivateRoute />,
      children: [
        { path: '/', element: <Dashboard /> },
        { path: '/transactions', element: <Transactions /> },
        { path: '/categories', element: <Categories /> },
        { path: '/reports', element: <Reports /> },
        { path: '/goals', element: <Goals /> },
        { path: '/accounts', element: <Accounts /> },
      ],
    },
  ],
  { basename: '/lab-financial-management' }
)
