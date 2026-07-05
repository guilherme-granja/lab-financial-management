import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { useAuth } from '@/hooks/useAuth'
import { ChoreDatabaseConfigResolver, PausedProjectError } from '@/lib/database-config-resolver'
import { createSupabaseClient } from '@/lib/supabase'

interface DatabaseState {
  client: SupabaseClient
}

const DatabaseContext = createContext<DatabaseState | undefined>(undefined)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth()
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [pausedRef, setPausedRef] = useState<string | null>(null)

  useEffect(() => {
    if (isAdmin) return
    const resolver = new ChoreDatabaseConfigResolver(user!.id)
    resolver
      .getConfig()
      .then(config => {
        setClient(createSupabaseClient(config))
      })
      .catch(e => {
        if (e instanceof PausedProjectError) {
          setPausedRef(e.projectRef)
        }
      })
  }, [user, isAdmin])

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-slate-400">Administradores não possuem banco pessoal. Acesse /admin/users.</p>
      </div>
    )
  }

  if (pausedRef) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <div className="bg-yellow-950 border border-yellow-800 text-yellow-400 text-sm rounded-xl px-6 py-5 max-w-md text-center space-y-3">
          <p>
            Seu banco de dados está pausado.
            <br />
            Projetos Supabase gratuitos pausam após 7 dias sem uso.
          </p>
          <a
            href={`https://supabase.com/dashboard/project/${pausedRef}/settings/general`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block underline hover:text-yellow-300"
          >
            Reativar no Supabase →
          </a>
        </div>
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
