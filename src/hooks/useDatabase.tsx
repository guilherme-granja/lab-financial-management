import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { useAuth } from '@/hooks/useAuth'
import { ChoreDatabaseConfigResolver } from '@/lib/database-config-resolver'
import { createSupabaseClient } from '@/lib/supabase'

interface DatabaseState {
  client: SupabaseClient
}

const DatabaseContext = createContext<DatabaseState | undefined>(undefined)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth()
  const [client, setClient] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    if (isAdmin) return
    const resolver = new ChoreDatabaseConfigResolver(user!.id)
    resolver.getConfig().then(config => {
      setClient(createSupabaseClient(config))
    })
  }, [user, isAdmin])

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-slate-400">Administradores não possuem banco pessoal. Acesse /admin/users.</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  return (
    <DatabaseContext.Provider value={{ client }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase(): DatabaseState {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider')
  return ctx
}

export function useSupabaseClient(): SupabaseClient {
  return useDatabase().client
}
