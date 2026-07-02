import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { DatabaseProvider } from '@/hooks/useDatabase'
import { router } from '@/router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DatabaseProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </DatabaseProvider>
  </React.StrictMode>,
)
