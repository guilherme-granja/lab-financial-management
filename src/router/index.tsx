import { useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
import AdminUsers from '@/pages/AdminUsers'
import AdminDashboard from '@/pages/AdminDashboard'
import AdminActivity from '@/pages/AdminActivity'
import FirstLogin from '@/pages/FirstLogin'

function PrivateRoute() {
  const { user, loading, isAdmin, firstLogin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && isAdmin && location.pathname === '/') {
      navigate('/admin', { replace: true })
    }
  }, [loading, isAdmin, location.pathname, navigate])

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

  if (firstLogin) {
    return <Navigate to="/first-login" replace />
  }

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-slate-400">Redirecionando...</p>
      </div>
    )
  }

  return (
    <DatabaseProvider>
      <PageWrapper>
        <Outlet />
      </PageWrapper>
    </DatabaseProvider>
  )
}

function FirstLoginRoute() {
  const { user, loading, firstLogin } = useAuth()
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

  if (!firstLogin) {
    return <Navigate to="/" replace />
  }

  return <FirstLogin />
}

function AdminRoute() {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <PageWrapper>
      <Outlet />
    </PageWrapper>
  )
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login />, errorElement: <ErrorPage /> },
    { path: '/first-login', element: <FirstLoginRoute />, errorElement: <ErrorPage /> },
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
    {
      element: <AdminRoute />,
      errorElement: <ErrorPage />,
      children: [
        { path: '/admin', element: <AdminDashboard /> },
        { path: '/admin/users', element: <AdminUsers /> },
        { path: '/admin/activity', element: <AdminActivity /> },
      ],
    },
  ],
  { basename: '/lab-financial-management' }
)
