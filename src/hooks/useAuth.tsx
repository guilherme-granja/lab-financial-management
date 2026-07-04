import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { choreClient } from '@/lib/chore-client'
import { logActivity } from '@/lib/activity-log'

interface AuthState {
  user: User | null
  loading: boolean
  authError: string | null
  isAdmin: boolean
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const handleUser = async (u: User | null) => {
    if (u) {
      const { data: profile } = await choreClient
        .from('profiles')
        .select('is_active, is_admin')
        .eq('id', u.id)
        .maybeSingle()

      if (!profile?.is_active) {
        await choreClient.auth.signOut()
        setUser(null)
        setIsAdmin(false)
        setAuthError('Sua conta está inativa. Entre em contato com o administrador.')
        setLoading(false)
        return
      }

      setIsAdmin(!!profile.is_admin)

      if (!profile.is_admin) {
        const { data } = await choreClient
          .from('user_databases')
          .select('id')
          .eq('user_id', u.id)
          .eq('status', 'active')
          .maybeSingle()

        if (!data) {
          await choreClient.auth.signOut()
          setUser(null)
          setAuthError('Sua conta ainda não está configurada. Entre em contato com o administrador.')
          setLoading(false)
          return
        }
      }

      setAuthError(null)
      logActivity(u.id, 'login')
    }
    setUser(u)
    setLoading(false)
  }

  useEffect(() => {
    choreClient.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null)
    })

    const { data: { subscription } } = choreClient.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPassword = async (email: string, password: string): Promise<string | null> => {
    setAuthError(null)
    const { error } = await choreClient.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signOut = async () => {
    await choreClient.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, isAdmin, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
